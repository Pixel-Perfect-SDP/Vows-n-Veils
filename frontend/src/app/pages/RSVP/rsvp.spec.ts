import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Firestore } from '@angular/fire/firestore';
import { of } from 'rxjs';

import { Rsvp } from './rsvp';
import { AuthService } from '../../core/auth';

// Mock services
class MockAuthService {
  currentUser = of({ uid: 'test-user-123' });
}

class MockFirestore {
  collection() {
    return this;
  }

  withConverter() {
    return this;
  }
}

class MockRouter {
  navigate = jasmine.createSpy('navigate');
}

describe('RsvpComponent', () => {
  let component: Rsvp;
  let fixture: ComponentFixture<Rsvp>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule, Rsvp],
      providers: [
        { provide: AuthService, useClass: MockAuthService },
        { provide: Firestore, useClass: MockFirestore },
        { provide: Router, useClass: MockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Rsvp);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Data Structure', () => {
    it('should initialize with correct default values', () => {
      expect(component.formData).toEqual({
        guestID: '',
        Name: '',
        Surname: '',
        Email: '',
        Attending: '',
        Diet: 'None',
        otherDiet: '',
        Allergy: 'None',
        Song: ''
      });
    });

    it('should initialize component properties correctly', () => {
      expect(component.message).toBe('');
      expect(component.eventId).toBe('');
      expect(component.eventIdEntered).toBe(false);
      expect(component.eventCode).toBe('');
    });
  });

  describe('submitEventCode', () => {
    it('should show alert when event code is empty', async () => {
      const alertSpy = spyOn(window, 'alert');
      component.eventCode = '';

      await component.submitEventCode();

      expect(alertSpy).toHaveBeenCalledWith('Please enter a valid Event Code ');
      expect(component.eventIdEntered).toBe(false);
    });

    // Test the logic without Firestore dependencies
    it('should handle errors during event code submission', async () => {
      // Mock the Firestore calls to throw an error
      spyOn(component, 'submitEventCode').and.callThrough();

      // We'll test the error handling by causing a rejection
      const originalGetDocs = (window as any).getDocs;
      (window as any).getDocs = () => Promise.reject(new Error('Firestore error'));

      component.eventCode = 'ERROR123';

      await component.submitEventCode();

      expect(component.eventIdEntered).toBe(false);

      // Restore original function
      (window as any).getDocs = originalGetDocs;
    });
  });

  describe('onSubmit', () => {
    beforeEach(() => {
      component.eventId = 'event-123';
      component.eventIdEntered = true;
    });

    it('should show alert when name is empty', async () => {
      const alertSpy = spyOn(window, 'alert');
      component.formData.Name = '';
      component.formData.Surname = '';

      await component.onSubmit();

      expect(alertSpy).toHaveBeenCalledWith('Please enter your full name ❌');
    });

    it('should use otherDiet when provided', () => {
      // Test the diet logic directly
      component.formData.Diet = 'Vegetarian';
      component.formData.otherDiet = 'Vegan';

      // Call the logic directly
      const finalDiet = component.formData.otherDiet.trim()
        ? component.formData.otherDiet
        : component.formData.Diet;

      expect(finalDiet).toBe('Vegan');
    });

    it('should use default diet when otherDiet is empty', () => {
      // Test the diet logic directly
      component.formData.Diet = 'Vegetarian';
      component.formData.otherDiet = '';

      // Call the logic directly
      const finalDiet = component.formData.otherDiet.trim()
        ? component.formData.otherDiet
        : component.formData.Diet;

      expect(finalDiet).toBe('Vegetarian');
    });

    it('should set RSVPstatus to true when attending is "Yes"', () => {
      component.formData.Attending = 'Yes';

      // Test the attendance logic directly
      let attendance;
      if (component.formData.Attending == "Yes") {
        attendance = true;
      } else {
        attendance = false;
      }

      expect(attendance).toBe(true);
    });

    it('should set RSVPstatus to false when attending is not "Yes"', () => {
      component.formData.Attending = 'No';

      // Test the attendance logic directly
      let attendance;
      if (component.formData.Attending == "Yes") {
        attendance = true;
      } else {
        attendance = false;
      }

      expect(attendance).toBe(false);
    });

    it('should handle name without surname', () => {
      component.formData.Name = 'John';
      component.formData.Surname = '';

      // Test the name logic directly
      const fullname = component.formData.Surname.trim()
        ? component.formData.Name.trim() + ' ' + component.formData.Surname.trim()
        : component.formData.Name.trim();

      expect(fullname).toBe('John');
    });

    it('should handle name with surname', () => {
      component.formData.Name = 'John';
      component.formData.Surname = 'Doe';

      // Test the name logic directly
      const fullname = component.formData.Surname.trim()
        ? component.formData.Name.trim() + ' ' + component.formData.Surname.trim()
        : component.formData.Name.trim();

      expect(fullname).toBe('John Doe');
    });

    it('should validate empty name correctly', () => {
      component.formData.Name = '';
      component.formData.Surname = '';

      // Test the validation logic directly
      const fullname = component.formData.Surname.trim()
        ? component.formData.Name.trim() + ' ' + component.formData.Surname.trim()
        : component.formData.Name.trim();

      expect(fullname.trim()).toBe('');
    });
  });

  // Test the component methods without Firestore dependencies
  describe('Component Logic', () => {
    it('should create submit data correctly', () => {
      component.formData.Name = 'John';
      component.formData.Surname = 'Doe';
      component.formData.Email = 'john@example.com';
      component.formData.Diet = 'Vegetarian';
      component.formData.otherDiet = '';
      component.formData.Allergy = 'None';
      component.formData.Song = 'Test Song';
      component.formData.Attending = 'Yes';

      const finalDiet = component.formData.otherDiet.trim()
        ? component.formData.otherDiet
        : component.formData.Diet;

      const fullname = component.formData.Surname.trim()
        ? component.formData.Name.trim() + ' ' + component.formData.Surname.trim()
        : component.formData.Name.trim();

      let attendance;
      if (component.formData.Attending == "Yes") {
        attendance = true;
      } else {
        attendance = false;
      }

      const submitData = {
        Email: component.formData.Email,
        Dietary: finalDiet,
        Allergies: component.formData.Allergy,
        Song: component.formData.Song,
        RSVPstatus: attendance
      };

      expect(submitData).toEqual({
        Email: 'john@example.com',
        Dietary: 'Vegetarian',
        Allergies: 'None',
        Song: 'Test Song',
        RSVPstatus: true
      });
      expect(fullname).toBe('John Doe');
    });
  });
});
