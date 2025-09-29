import { TestBed } from '@angular/core/testing';
import { Homepage } from './homepage';
import { AuthService } from '../../core/auth';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import * as fbApp from 'firebase/app';
import * as fbAuth from 'firebase/auth';
import * as fbFs from 'firebase/firestore';

const appSpies = (fbApp as any).__spies;
const authSpies = (fbAuth as any).__spies;
const fsSpies   = (fbFs as any).__spies;

describe('Homepage – Event display API (Firestore reads)', () => {
  let comp: Homepage;

  // ---------- Auth mock ----------
  const user = { uid: 'U1', email: 'u@mail.test' } as any;
  const authMock: Partial<AuthService> = {
    user: {
      get: () => user,
      set: () => {},
      update: () => {},
      asReadonly: () => ({ get: () => user }),
      [Symbol.for('ɵWRITABLE_SIGNAL')]: true,
      [Symbol.for('SIGNAL')]: true,
    } as any, // waitForUser will see this immediately
  };

  // ---------- Firestore spies ----------
  let getAppSpy: jasmine.Spy;
  let getFirestoreSpy: jasmine.Spy;
  let docSpy: jasmine.Spy;
  let getDocSpy: jasmine.Spy;
  let getDocsSpy: jasmine.Spy;
  let querySpy: jasmine.Spy;
  let whereSpy: jasmine.Spy;
  let collectionSpy: jasmine.Spy;

  // ---------- Timer & side-effect spies ----------
  let setIntervalSpy: jasmine.Spy;
  let fetchVenueAndWeatherSpy: jasmine.Spy;
  let updateCountdownSpy: jasmine.Spy;

  // helpers: make event/venue/guest/order/vendor snapshots
  const mkDocSnap = (exists: boolean, data: any = {}) => ({
    exists: () => exists,
    data: () => data,
    id: data?.id ?? 'docId',
  });

  const mkQuerySnap = (docsData: any[]) => {
    const docs = docsData.map((d, i) => ({ id: d?.id ?? `id${i}`, data: () => d }));
    return {
      size: docs.length,
      empty: docs.length === 0,
      docs,
      forEach: (fn: (d: any) => void) => docs.forEach(fn),
    };
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Homepage],
      providers: [provideHttpClient(), provideHttpClientTesting(),
        { provide: AuthService, 
          useValue: authMock }],
    }).compileComponents();

    const fixture = TestBed.createComponent(Homepage);
    comp = fixture.componentInstance;

    // Firestore spies
    getAppSpy = spyOn(appSpies, 'getApp').and.returnValue({} as any);
    getFirestoreSpy = spyOn(fsSpies, 'getFirestore').and.returnValue({} as any);
    docSpy = spyOn(fsSpies, 'doc').and.callFake((_db, _col, _id) => ({ _db, _col, _id } as any));
    getDocSpy = spyOn(fsSpies, 'getDoc');
    getDocsSpy = spyOn(fsSpies, 'getDocs');
    querySpy = spyOn(fsSpies, 'query').and.callFake((...args: any[]) => ({ __q: args } as any));
    whereSpy = spyOn(fsSpies, 'where').and.callFake((...args: any[]) => ({ __w: args } as any));
    collectionSpy = spyOn(fsSpies, 'collection').and.callFake((_db, name: string) => ({ __c: name } as any));

    // Side effects
    setIntervalSpy = spyOn(window, 'setInterval').and.returnValue(123 as any);
    updateCountdownSpy = spyOn<any>(comp, 'updateCountdown').and.callFake(() => {});
    fetchVenueAndWeatherSpy = spyOn<any>(comp, 'fetchVenueAndWeather').and.callFake(() => {});

    // We’ll call the method directly in each test
  });

  // --------------- Happy path ---------------
  it('fills eventDisplayInfo (title, venue, time, budget, guests, vendors)', async () => {
    // Event doc
    const eventDate = new Date('2030-05-10T15:30:00Z');
    getDocSpy.withArgs(jasmine.objectContaining({ _col: 'Events', _id: 'U1' }))
      .and.resolveTo(mkDocSnap(true, {
        Name1: 'Alice',
        Name2: 'Bob',
        Date_Time: eventDate, // also supports {toDate()}, but Date works
        Budget: 15000,
        VenueID: 'V1',
      }));

    // Venue doc
    getDocSpy.withArgs(jasmine.objectContaining({ _col: 'Venues', _id: 'V1' }))
      .and.resolveTo(mkDocSnap(true, { name: 'The Venue' }));

    // Guests query: total 2, 1 confirmed
    const guestsSnap = mkQuerySnap([
      { RSVPstatus: true },
      { RSVPstatus: false },
    ]);

    // Orders query: accepted (C1), pending (C2), declined (C3 -> skip)
    const ordersSnap = mkQuerySnap([
      { companyID: 'C1', status: 'accepted', orderDate: '2029-01-01' },
      { companyID: 'C2', status: 'pending', orderDate: '2029-02-02' },
      { companyID: 'C3', status: 'declined', orderDate: '2029-03-03' },
    ]);

    // Vendors by companyID:
    const vendorC1 = mkQuerySnap([{ serviceName: 'Photography' }]); // accepted → “Photography”
    const vendorC2 = mkQuerySnap([{ service_name: 'Catering' }]);   // pending → “Catering (pending)”
    // No call for C3 because it is declined and skipped

    // getDocs call order inside getEventDataForDisplay():
    //   1) Guests
    //   2) Orders
    //   3) Vendors(C1)
    //   4) Vendors(C2)
    getDocsSpy.and.returnValues(guestsSnap as any, ordersSnap as any, vendorC1 as any, vendorC2 as any);

    await comp.getEventDataForDisplay();

    // Title
    expect(comp.eventDisplayInfo.weddingTitle).toBe('The wedding of Alice and Bob');
    // Venue name
    expect(comp.eventDisplayInfo.venueName).toBe('The Venue');
    // Time (we don’t assert the exact localized string; just existence)
    expect(typeof comp.eventDisplayInfo.weddingTime).toBe('string');
    expect(comp.eventDisplayInfo.weddingTime!.length).toBeGreaterThan(0);
    // Budget
    expect(comp.eventDisplayInfo.budget).toBe(15000);
    // Guest counts
    expect(comp.eventDisplayInfo.totalGuests).toBe(2);
    expect(comp.eventDisplayInfo.confirmedRSVPs).toBe(1);
    // Selected vendors
    expect(comp.eventDisplayInfo.selectedVendors).toEqual([
      jasmine.objectContaining({ companyID: 'C1', serviceName: 'Photography', status: 'accepted' }),
      jasmine.objectContaining({ companyID: 'C2', serviceName: 'Catering (pending)', status: 'pending' }),
    ]);

    // Side effects were triggered
    expect(updateCountdownSpy).toHaveBeenCalled();
    expect(setIntervalSpy).toHaveBeenCalled();
    expect(fetchVenueAndWeatherSpy).toHaveBeenCalledWith('V1', eventDate);
  });

  // --------------- Error: missing user ---------------
  it('sets eventInfoError when no authenticated user', async () => {
    // Short-circuit waitForUser to avoid 5s timeout
    spyOn<any>(comp, 'waitForUser').and.resolveTo(null);

    await comp.getEventDataForDisplay();

    expect(comp.eventInfoError).toBe('No authenticated user found');
    expect(comp.eventInfoLoading).toBeFalse();
    expect(getDocSpy).not.toHaveBeenCalled(); // no Firestore reads
  });

  // --------------- Error: no event doc ---------------
  it('sets hasEvent=false when event document is missing', async () => {
    getDocSpy.withArgs(jasmine.objectContaining({ _col: 'Events', _id: 'U1' }))
      .and.resolveTo(mkDocSnap(false));

    await comp.getEventDataForDisplay();

    expect(comp.hasEvent).toBeFalse();
    expect(comp.eventInfoLoading).toBeFalse();
  });

  // --------------- Error: permission denied (vendors) ---------------
  it('handles permission-denied when fetching vendors (orders) by setting selectedVendors=null', async () => {
    // Minimal event & venue to reach vendors section
    const eventDate = new Date('2030-05-10T15:30:00Z');
    getDocSpy.withArgs(jasmine.objectContaining({ _col: 'Events', _id: 'U1' }))
      .and.resolveTo(mkDocSnap(true, { Name1: 'A', Name2: 'B', Date_Time: eventDate, Budget: 1, VenueID: 'V1' }));
    getDocSpy.withArgs(jasmine.objectContaining({ _col: 'Venues', _id: 'V1' }))
      .and.resolveTo(mkDocSnap(true, { name: 'Venue' }));

    // Guests OK
    getDocsSpy.withArgs(jasmine.objectContaining({ __q: jasmine.any(Array) }))
      .and.returnValue(mkQuerySnap([{ RSVPstatus: true }]) as any);

    // Next getDocs (orders) throws permission-denied
    getDocsSpy.and.callFake((_q: any) => {
      // First call already used for Guests (handled above when using withArgs),
      // so throw now for Orders:
      throw { code: 'permission-denied' };
    });

    await comp.getEventDataForDisplay();

    // Vendors suppressed, others fine
    expect(comp.eventDisplayInfo.weddingTitle).toBe('The wedding of A and B');
    expect(comp.eventDisplayInfo.venueName).toBe('Venue');
    expect(comp.eventDisplayInfo.selectedVendors).toBeNull();
    expect(comp.eventInfoLoading).toBeFalse();
  });

  // --------------- Error: no VenueID ---------------
  it('handles missing VenueID gracefully (no venue fetch)', async () => {
    const eventDate = new Date('2030-05-10T15:30:00Z');
    getDocSpy.withArgs(jasmine.objectContaining({ _col: 'Events', _id: 'U1' }))
      .and.resolveTo(mkDocSnap(true, { Name1: 'A', Name2: 'B', Date_Time: eventDate, Budget: 1 }));

    // Guests empty
    getDocsSpy.and.returnValue(mkQuerySnap([]) as any);

    await comp.getEventDataForDisplay();

    expect(comp.eventDisplayInfo.venueName).toBeNull(); // not set
    expect(fetchVenueAndWeatherSpy).not.toHaveBeenCalled();
  });

    it('uses fallback "Unknown Service (companyID) (pending)" when vendor query is empty and order is pending', async () => {
    // Minimal event to reach vendors section
    const eventDate = new Date('2030-05-10T15:30:00Z');
    getDocSpy.withArgs(jasmine.objectContaining({ _col: 'Events', _id: 'U1' }))
      .and.resolveTo(mkDocSnap(true, { Name1: 'A', Name2: 'B', Date_Time: eventDate, Budget: 1, VenueID: 'V1' }));
    getDocSpy.withArgs(jasmine.objectContaining({ _col: 'Venues', _id: 'V1' }))
      .and.resolveTo(mkDocSnap(true, { name: 'Venue' }));

    // Guests (irrelevant to this test, but the method queries them first)
    const guestsSnap = mkQuerySnap([{ RSVPstatus: false }]);

    // Orders: one pending order for C9 (declined ones are skipped by the component)
    const ordersSnap = mkQuerySnap([
      { companyID: 'C9', status: 'pending', orderDate: '2029-02-02' },
    ]);

    // Vendors query for C9 returns EMPTY snapshot → triggers fallback name logic
    const emptyVendorsSnap = mkQuerySnap([]);

    // Return values in the same order getEventDataForDisplay() calls getDocs():
    // 1) Guests, 2) Orders, 3) Vendors(C9)
    getDocsSpy.and.returnValues(guestsSnap as any, ordersSnap as any, emptyVendorsSnap as any);

    await comp.getEventDataForDisplay();

    expect(comp.eventDisplayInfo.selectedVendors).toEqual([
      jasmine.objectContaining({
        companyID: 'C9',
        serviceName: 'Unknown Service (C9) (pending)',
        status: 'pending',
      }),
    ]);
  });
});
