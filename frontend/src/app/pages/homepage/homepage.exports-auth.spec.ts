import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Homepage } from './homepage';
import { DataService } from '../../core/data.service';
import { AuthService } from '../../core/auth';
import { Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import * as fbApp from 'firebase/app';
import * as fbAuth from 'firebase/auth';
import * as fbFs from 'firebase/firestore';

const appSpies = (fbApp as any).__spies;
const authSpies = (fbAuth as any).__spies;
const fsSpies   = (fbFs as any).__spies;

describe('Homepage – exports & auth', () => {
  let fixture: ComponentFixture<Homepage>;
  let comp: Homepage;

  const dataSvcSpy = jasmine.createSpyObj<DataService>('DataService', [
    'downloadGuestsCsv',
    'downloadGuestsPdf',
  ]);

  const routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
  const authStub = { user: () => ({ uid: 'U1' }) };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Homepage],
      providers: [provideHttpClient(), provideHttpClientTesting(),
        { provide: DataService, useValue: dataSvcSpy },
        { provide: Router, useValue: routerSpy },
        { provide: AuthService, useValue: authStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Homepage);
    comp = fixture.componentInstance;
  });

  afterEach(() => {
    dataSvcSpy.downloadGuestsCsv.calls.reset();
    dataSvcSpy.downloadGuestsPdf.calls.reset();
    routerSpy.navigate.calls.reset();
  });

  /* -------------------- Exports -------------------- */

  it('exportCsv sends filters and calls saveBlob with computed filename', async () => {
    // Arrange filters -> opts
    comp.selectedDietary = 'vegan';
    comp.selectedAllergy = 'nuts';
    comp.selectedRsvp = 'true';

    const fakeBlob = new Blob(['csv']);
    dataSvcSpy.downloadGuestsCsv.and.returnValue(of(fakeBlob));

    // Spy the private saver to avoid DOM work
    const saveSpy = spyOn(comp as any, 'saveBlob');

    // Act
    await comp.exportCsv();

    // Assert request/params
    expect(dataSvcSpy.downloadGuestsCsv).toHaveBeenCalledTimes(1);
    const [eventId, opts] = dataSvcSpy.downloadGuestsCsv.calls.mostRecent().args;
    expect(eventId).toBe('U1');
    expect(opts).toEqual({ dietary: 'vegan', allergy: 'nuts', rsvp: true });

    // Assert filename
    expect(saveSpy).toHaveBeenCalledTimes(1);
    const [blobArg, filename] = saveSpy.calls.mostRecent().args;
    expect(blobArg).toBe(fakeBlob);
    expect(filename).toBe('guest-list-diet_vegan-allergy_nuts-rsvp_true.csv');
  });

  it('exportPdf sends filters (no RSVP -> omitted) and calls saveBlob', async () => {
    comp.selectedDietary = 'vegetarian';
    comp.selectedAllergy = null;
    comp.selectedRsvp = 'all';  // -> no rsvp key in opts

    const fakeBlob = new Blob(['pdf']);
    dataSvcSpy.downloadGuestsPdf.and.returnValue(of(fakeBlob));

    const saveSpy = spyOn(comp as any, 'saveBlob');

    await comp.exportPdf();

    expect(dataSvcSpy.downloadGuestsPdf).toHaveBeenCalledTimes(1);
    const [eventId, opts] = dataSvcSpy.downloadGuestsPdf.calls.mostRecent().args;
    expect(eventId).toBe('U1');
    expect(opts).toEqual({ dietary: 'vegetarian' });

    expect(saveSpy).toHaveBeenCalled();
    const [_blobArg, filename] = saveSpy.calls.mostRecent().args;
    expect(filename).toBe('guest-list-diet_vegetarian.pdf');
  });

  it('exportCsv handles service error (no throw)', async () => {
    // No filters
    comp.selectedDietary = null;
    comp.selectedAllergy = null;
    comp.selectedRsvp = 'all';

    spyOn(console, 'error');
    spyOn(window, 'alert');

    dataSvcSpy.downloadGuestsCsv.and.returnValue(throwError(() => new Error('boom')));

    await comp.exportCsv();

    expect(console.error).toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith('Failed to export CSV.');
  });

  it('exportPdf handles service error (no throw)', async () => {
    spyOn(console, 'error');
    spyOn(window, 'alert');

    dataSvcSpy.downloadGuestsPdf.and.returnValue(throwError(() => new Error('boom')));

    await comp.exportPdf();

    expect(console.error).toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith('Failed to export PDF.');
  });

  /* -------------------- Auth / logout -------------------- */

  it('logout calls signOut(auth), clears state, and navigates to /landing', async () => {
    // Prime some state that logout should clear
    comp.hasEvent = true;
    comp.eventData = { anything: 1 };

    const signOutSpy = spyOn(authSpies, 'signOut').and.returnValue(Promise.resolve());

    await comp.logout();

    expect(signOutSpy).toHaveBeenCalledTimes(1);
    expect(comp.hasEvent).toBeNull();
    expect(comp.eventData).toBeNull();
    expect(routerSpy.navigate).toHaveBeenCalledOnceWith(['/landing']);
  });

  it('logout logs error if signOut rejects (no throw)', async () => {
  const signOutSpy = spyOn(authSpies, 'signOut').and.returnValue(Promise.reject(new Error('nope')));
  spyOn(console, 'error');

  await comp.logout();
  await fixture.whenStable();

  expect(signOutSpy).toHaveBeenCalled();
  expect(console.error).toHaveBeenCalled();
  expect(routerSpy.navigate).not.toHaveBeenCalled();
});
});