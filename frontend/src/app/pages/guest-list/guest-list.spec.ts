import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs'; // Import 'of' and 'throwError' from RxJS

import { GuestList } from './guest-list';
import { DataService } from '../../core/data.service'; // Import the real service to mock it


const mockDataService = {
  
  sendGuestInvite: jasmine.createSpy('sendGuestInvite')
};

describe('GuestList', () => {
  let component: GuestList;
  let fixture: ComponentFixture<GuestList>;

  let alertSpy: jasmine.Spy;
  let consoleLogSpy: jasmine.Spy;
  let consoleErrorSpy: jasmine.Spy;

  beforeEach(async () => {
    
    alertSpy = spyOn(window, 'alert');
    consoleLogSpy = spyOn(console, 'log');
    consoleErrorSpy = spyOn(console, 'error');

    await TestBed.configureTestingModule({
      imports: [GuestList],
      providers: [
        { provide: DataService, useValue: mockDataService }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GuestList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('sendInvitation', () => {
    const guestEmail = 'test@example.com';
    const guestName = 'Test User';
    const expectedInviteData = {
      guestEmail: guestEmail,
      guestName: guestName,
      phone: "+2771234567",
      extra: {}
    };

    it('should call dataService with correct data and show success alert on success', () => {
      const fakeResponse = { status: 'OK', message: 'Invited' };
      mockDataService.sendGuestInvite.and.returnValue(of(fakeResponse));

      component.sendInvitation(guestEmail, guestName);

      expect(mockDataService.sendGuestInvite).toHaveBeenCalledWith(expectedInviteData);
      
      expect(alertSpy).toHaveBeenCalledWith('Invitation sent successfully!');

      expect(consoleLogSpy).toHaveBeenCalledWith('Invitation sent successfully:', fakeResponse);
    });

    it('should call dataService with correct data and show failure alert on error', () => {
      const fakeError = new Error('Network error');
      mockDataService.sendGuestInvite.and.returnValue(throwError(() => fakeError));

      component.sendInvitation(guestEmail, guestName);

      expect(mockDataService.sendGuestInvite).toHaveBeenCalledWith(expectedInviteData);

      expect(alertSpy).toHaveBeenCalledWith('Failed to send invitation. Please try again.');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error sending invitation:', fakeError);
    });
  });
});
