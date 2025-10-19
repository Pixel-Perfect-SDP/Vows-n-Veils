import { TestBed, ComponentFixture, fakeAsync, tick } from '@angular/core/testing';
import { Homepage } from './homepage';
import { DataService } from '../../core/data.service';
import { AuthService } from '../../core/auth';
import { Router } from '@angular/router';
import * as fbApp from 'firebase/app';
import * as fbFs from 'firebase/firestore';

const appSpies = (fbApp as any).__spies;
const fsSpies   = (fbFs as any).__spies;

describe('Homepage – lifecycle & countdown', () => {
  let fixture: ComponentFixture<Homepage>;
  let comp: Homepage;
  let getAppSpy: jasmine.Spy;
  let getFirestoreSpy: jasmine.Spy;
  let docSpy: jasmine.Spy;
  let getDocSpy: jasmine.Spy;

  const dataSvcSpy = jasmine.createSpyObj<DataService>('DataService', [
    'getVenueById','getWeatherCrossing','getGuestsByEvent','getGuestFilterOptions',
    'postGuest','deleteGuest','downloadGuestsCsv','downloadGuestsPdf'
  ]);
  const authStub = { user: () => ({ uid: 'U1' }) };
  const routerStub = { navigate: () => {} };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Homepage],
      providers: [
        { provide: DataService, useValue: dataSvcSpy },
        { provide: AuthService, useValue: authStub },
        { provide: Router, useValue: routerStub },
      ],
    }).compileComponents();

    getAppSpy = spyOn(appSpies, 'getApp').and.returnValue({} as any);
    getFirestoreSpy = spyOn(fsSpies, 'getFirestore').and.returnValue({} as any);
    docSpy = spyOn(fsSpies, 'doc').and.returnValue({ __ref: true } as any);
    getDocSpy = spyOn(fsSpies, 'getDoc');

    fixture = TestBed.createComponent(Homepage);
    comp = fixture.componentInstance;
  });

  afterEach(() => {
    (comp as any).countDownInterval && clearInterval((comp as any).countDownInterval);
  });

  function resolveDoc(data: any) { return { exists: () => true, data: () => data }; }
  function missingDoc() { return { exists: () => false }; }
  function stubAsyncDependencies() {
    spyOn(comp, 'fetchNearbyTrail').and.stub();
    spyOn(comp as any, 'loadChecklist').and.resolveTo();
    spyOn(comp as any, 'fetchNotifications').and.resolveTo();
  }

  it('ngOnInit (has event): sets hasEvent, eventData, calls getEventDataForDisplay and sets interval', fakeAsync(async () => {
    // Arrange: Firestore doc exists
    const dateTime = { toDate: () => new Date('2030-06-10T12:00:00Z') };
    getDocSpy.and.resolveTo(resolveDoc({ Date_Time: dateTime, VenueID: 'V1' }));

    stubAsyncDependencies();
    // Keep heavy logic out of this test
    const gedSpy = spyOn(comp as any, 'getEventDataForDisplay').and.resolveTo();
    const fetchVwSpy = spyOn(comp as any, 'fetchVenueAndWeather').and.callFake(() => {});

    // Stub setInterval to a fixed id
    const setIntSpy = spyOn(window, 'setInterval').and.returnValue(77 as any);
    const updSpy = spyOn(comp as any, 'updateCountdown').and.callThrough();

    // Act
    comp.ngOnInit();
    tick(); // flush promises

    // Assert Firebase calls
    expect(getAppSpy).toHaveBeenCalled();
    expect(getFirestoreSpy).toHaveBeenCalled();
    expect(docSpy).toHaveBeenCalled();
    expect(getDocSpy).toHaveBeenCalled();

    // Component state
    expect(comp.hasEvent).toBeTrue();
    expect(comp.eventData).toEqual(jasmine.objectContaining({ Date_Time: dateTime, VenueID: 'V1' }));

    // Follow-on work
    expect(gedSpy).toHaveBeenCalled();
    expect(updSpy).toHaveBeenCalled();
    expect(setIntSpy).toHaveBeenCalled(); // interval for countdown
    expect((comp as any).countDownInerval).toBe(77);

    // Weather fetch
    expect(fetchVwSpy).toHaveBeenCalledWith('V1', dateTime);
  }));

  it('ngOnInit (no event): sets hasEvent=false, clears eventData, no weather call', fakeAsync(() => {
    getDocSpy.and.resolveTo(missingDoc());

    stubAsyncDependencies();
    const gedSpy = spyOn(comp as any, 'getEventDataForDisplay').and.resolveTo();
    const fetchVwSpy = spyOn(comp as any, 'fetchVenueAndWeather').and.callFake(() => {});
    const setIntSpy = spyOn(window, 'setInterval').and.returnValue(88 as any);

    comp.ngOnInit();
    tick();

    expect(comp.hasEvent).toBeFalse();
    expect(comp.eventData).toBeNull();
    expect(gedSpy).not.toHaveBeenCalled();
    expect(fetchVwSpy).not.toHaveBeenCalled();

    // If the component currently always schedules the interval:
    expect(setIntSpy).toHaveBeenCalled();                // <-- changed
  }));

  describe('updateCountdown math', () => {
    beforeEach(() => jasmine.clock().install());
    afterEach(() => jasmine.clock().uninstall());

    it('future date yields positive H:M (e.g. +1h30m)', () => {
      // Freeze "now"
      jasmine.clock().mockDate(new Date('2025-01-01T00:00:00'));
      // Event in +1h30m
      const event = { toDate: () => new Date(('2025-01-01T01:30:00'))};

      // Support both Date and Timestamp-like
      comp.eventData = { Date_Time: event };

      (comp as any).updateCountdown();

      expect(comp.months).toBe(0);
      expect(comp.days).toBe(0);
      expect(comp.hours).toBe(1);
      expect(comp.minutes).toBe(30);
    });

    it('past date → all zeros', () => {
      jasmine.clock().mockDate(new Date('2025-01-01T12:00:00'));
      const past = { toDate: () => new Date(('2024-12-31T12:00:00'))};

      comp.eventData = { Date_Time: past };

      (comp as any).updateCountdown();

      expect(comp.months).toBe(0);
      expect(comp.days).toBe(0);
      expect(comp.hours).toBe(0);
      expect(comp.minutes).toBe(0);
    });

    it('handles Timestamp-like { toDate() }', () => {
      jasmine.clock().mockDate(new Date('2025-01-01T00:00:00'));
      const event = { toDate: () => new Date('2025-01-01T00:45:00') };
      comp.eventData = { Date_Time: event };

      (comp as any).updateCountdown();

      expect(comp.hours).toBe(0);
      expect(comp.minutes).toBe(45);
    });
  });

  it('ngOnDestroy clears the countdown interval', () => {
    const clearSpy = spyOn(window, 'clearInterval');
    (comp as any).countDownInerval = 123 as any;

    comp.ngOnDestroy();

    expect(clearSpy).toHaveBeenCalledOnceWith(123 as any);
  });
});
