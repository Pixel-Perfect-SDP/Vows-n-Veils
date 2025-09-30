import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Homepage } from './homepage';
import { AuthService } from '../../core/auth';
import { DataService, Guest } from '../../core/data.service';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('Homepage (Guests tab)', () => {
  let fixture: ComponentFixture<Homepage>;
  let comp: Homepage;

  // Mutable auth mock so we can simulate a signed-in user
  const user = { uid: 'U1', email: 'u@mail.test' };
  const mockAuth: Partial<AuthService> = {
    user: signal(user),
  };

  // DataService spies
  let ds: jasmine.SpyObj<DataService>;

  beforeEach(async () => {
    ds = jasmine.createSpyObj<DataService>('DataService', [
      'getGuestFilterOptions',
      'getGuestsByEvent',
      'postGuest',
      'deleteGuest',
      'downloadGuestsCsv',
      'downloadGuestsPdf',
      'getVenueById',
      'getWeatherCrossing',
    ]);

    // Default behaviors for this suite
    ds.getGuestFilterOptions.and.returnValue(of({ dietary: ['vegan'], allergies: ['nuts'] }));
    ds.getGuestsByEvent.and.returnValue(of([]));
    ds.postGuest.and.returnValue(of({ id: 'g1' } as any));
    ds.deleteGuest.and.returnValue(of({ message: 'ok', id: 'g1' } as any));
    ds.getVenueById.and.returnValue(of({ address: '123 St' }));
    ds.getWeatherCrossing.and.returnValue(of({}));

    await TestBed.configureTestingModule({
      imports: [Homepage],
      providers: [provideHttpClient(), provideHttpClientTesting(),
        { provide: AuthService, useValue: mockAuth },
        { provide: DataService, useValue: ds },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Homepage);
    comp = fixture.componentInstance;
    fixture.detectChanges();
  });

  function fakeEvent() {
    return { preventDefault: jasmine.createSpy('preventDefault') } as unknown as Event;
  }

  // ---------------- switchToGuests ----------------
  it('switchToGuests: calls loadGuestFilterOptions once and loadGuests every time', async () => {
    // 1st switch -> should fetch options + guests
    await comp.switchToGuests(fakeEvent());
    expect(ds.getGuestFilterOptions).toHaveBeenCalledTimes(1);
    expect(ds.getGuestsByEvent).toHaveBeenCalledTimes(1);

    // 2nd switch -> should NOT fetch options again, but guests again
    await comp.switchToGuests(fakeEvent());
    expect(ds.getGuestFilterOptions).toHaveBeenCalledTimes(1);
    expect(ds.getGuestsByEvent).toHaveBeenCalledTimes(2);
  });

  // ---------------- onFiltersChange ----------------
  it('onFiltersChange: reloads guests with correct query params', async () => {
    // Select some filters
    comp.selectedDietary = 'vegan';
    comp.selectedAllergy = 'nuts';
    comp.selectedRsvp = 'true';

    await comp.onFiltersChange();

    // assert last call params
    const last = ds.getGuestsByEvent.calls.mostRecent();
    expect(last.args[0]).toBe('U1');
    expect(last.args[1]).toEqual({ dietary: 'vegan', allergy: 'nuts', rsvp: true });

    // change RSVP to false and verify again
    comp.selectedRsvp = 'false';
    await comp.onFiltersChange();
    const last2 = ds.getGuestsByEvent.calls.mostRecent();
    expect(last2.args[1]).toEqual({ dietary: 'vegan', allergy: 'nuts', rsvp: false });

    // set to 'all' => no rsvp param
    comp.selectedRsvp = 'all';
    await comp.onFiltersChange();
    const last3 = ds.getGuestsByEvent.calls.mostRecent();
    expect(last3.args[1]).toEqual({ dietary: 'vegan', allergy: 'nuts' });
  });

  // ---------------- submitAddGuest ----------------
  it('submitAddGuest: validation error path (no call to postGuest)', async () => {
    // Form invalid by default (Name required)
    await comp.submitAddGuest();
    expect(ds.postGuest).not.toHaveBeenCalled();
  });

  it('submitAddGuest: happy path posts, refreshes, and closes form', async () => {
    // Open the add form (so success will close it)
    comp.showAddGuest = true;

    // Fill valid form
    comp.addGuestForm.patchValue({
      Name: ' Alice ',
      Email: ' alice@mail.test ',
      Dietary: 'Vegan',
      Allergies: 'None',
      RSVPstatus: 'true', // should become boolean true
      Song: ' Song 1 ',
    });

    await comp.submitAddGuest();

    // postGuest called with cleaned dto
    expect(ds.postGuest).toHaveBeenCalledTimes(1);
    const [eventId, dto] = ds.postGuest.calls.mostRecent().args;
    expect(eventId).toBe('U1');
    expect(dto).toEqual({
      Name: 'Alice',
      Email: 'alice@mail.test',
      Dietary: 'Vegan',
      Allergies: 'None',
      RSVPstatus: true,
      Song: 'Song 1',
    });

    // Refreshed guests and filter options
    expect(ds.getGuestsByEvent).toHaveBeenCalled();       // called inside refresh
    //expect(ds.getGuestFilterOptions).toHaveBeenCalled();  // refresh options

    // Closed the form
    expect(comp.showAddGuest).toBeFalse();

    // Loading flag cleared
    expect(comp.guestsLoading).toBeFalse();
  });

  // ---------------- onDeleteGuest ----------------
  it('onDeleteGuest: cancel path (confirm=false) -> no deletion', async () => {
    spyOn(window, 'confirm').and.returnValue(false);
    const g: Guest = { id: 'g1', Name: 'Bob', Email: '', Dietary: 'None', Allergies: 'None', RSVPstatus: false, Song: '', EventID: 'U1' };

    await comp.onDeleteGuest(g);

    expect(ds.deleteGuest).not.toHaveBeenCalled();
  });

  it('onDeleteGuest: confirm path -> deletes, refreshes, and alerts success', async () => {
    spyOn(window, 'confirm').and.returnValue(true);
    spyOn(window, 'alert'); // suppress UI

    const g: Guest = { id: 'g1', Name: 'Bob', Email: '', Dietary: 'None', Allergies: 'None', RSVPstatus: false, Song: '', EventID: 'U1' };

    await comp.onDeleteGuest(g);

    expect(ds.deleteGuest).toHaveBeenCalledWith('U1', 'g1');
    // Refreshed
    expect(ds.getGuestsByEvent).toHaveBeenCalled();
    //expect(ds.getGuestFilterOptions).toHaveBeenCalled();
    // Alerted success
    expect(window.alert).toHaveBeenCalledWith('Guest deleted successfully.');
    // Loading cleared
    expect(comp.guestsLoading).toBeFalse();
  });

  it('onDeleteGuest: error path -> shows error alert and clears loading', async () => {
    spyOn(window, 'confirm').and.returnValue(true);
    spyOn(window, 'alert'); // suppress UI
    ds.deleteGuest.and.returnValue(throwError(() => new Error('boom')));

    const g: Guest = { id: 'g1', Name: 'Bob', Email: '', Dietary: 'None', Allergies: 'None', RSVPstatus: false, Song: '', EventID: 'U1' };

    await comp.onDeleteGuest(g);
    

    expect(ds.deleteGuest).toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith('Failed to delete guest. Please try again.');
    expect(comp.guestsLoading).toBeFalse();
  });

  it('onDeleteGuest: missing id -> alerts and returns', async () => {
    spyOn(window, 'alert'); // suppress UI
    await comp.onDeleteGuest({} as Guest);
    expect(window.alert).toHaveBeenCalledWith('Missing guest id.');
    expect(ds.deleteGuest).not.toHaveBeenCalled();
  });
});
