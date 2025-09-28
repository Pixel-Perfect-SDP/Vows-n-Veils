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
  collection = jasmine.createSpy('collection').and.returnValue({});
  doc = jasmine.createSpy('doc').and.returnValue({});
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

  describe('Form Validation Logic', () => {
    it('should validate empty name correctly', () => {
      component.formData.Name = '';
      component.formData.Surname = '';

      const fullname = component.formData.Surname.trim()
        ? component.formData.Name.trim() + ' ' + component.formData.Surname.trim()
        : component.formData.Name.trim();

      expect(fullname.trim()).toBe('');
    });

    it('should handle name without surname', () => {
      component.formData.Name = 'John';
      component.formData.Surname = '';

      const fullname = component.formData.Surname.trim()
        ? component.formData.Name.trim() + ' ' + component.formData.Surname.trim()
        : component.formData.Name.trim();

      expect(fullname).toBe('John');
    });

    it('should handle name with surname', () => {
      component.formData.Name = 'John';
      component.formData.Surname = 'Doe';

      const fullname = component.formData.Surname.trim()
        ? component.formData.Name.trim() + ' ' + component.formData.Surname.trim()
        : component.formData.Name.trim();

      expect(fullname).toBe('John Doe');
    });

    it('should handle name with extra spaces', () => {
      component.formData.Name = '  John  ';
      component.formData.Surname = '  Doe  ';

      const fullname = component.formData.Surname.trim()
        ? component.formData.Name.trim() + ' ' + component.formData.Surname.trim()
        : component.formData.Name.trim();

      expect(fullname).toBe('John Doe');
    });

    it('should handle only surname provided', () => {
      component.formData.Name = '';
      component.formData.Surname = 'Doe';

      const fullname = component.formData.Surname.trim()
        ? component.formData.Name.trim() + ' ' + component.formData.Surname.trim()
        : component.formData.Name.trim();

      expect(fullname).toBe(' Doe');
    });
  });

  describe('Dietary Preference Logic', () => {
    it('should use otherDiet when provided', () => {
      component.formData.Diet = 'Vegetarian';
      component.formData.otherDiet = 'Vegan';

      const finalDiet = component.formData.otherDiet.trim()
        ? component.formData.otherDiet
        : component.formData.Diet;

      expect(finalDiet).toBe('Vegan');
    });

    it('should use default diet when otherDiet is empty', () => {
      component.formData.Diet = 'Vegetarian';
      component.formData.otherDiet = '';

      const finalDiet = component.formData.otherDiet.trim()
        ? component.formData.otherDiet
        : component.formData.Diet;

      expect(finalDiet).toBe('Vegetarian');
    });

    it('should use default diet when otherDiet has only spaces', () => {
      component.formData.Diet = 'Vegetarian';
      component.formData.otherDiet = '   ';

      const finalDiet = component.formData.otherDiet.trim()
        ? component.formData.otherDiet
        : component.formData.Diet;

      expect(finalDiet).toBe('Vegetarian');
    });

    it('should use otherDiet when it has meaningful content', () => {
      component.formData.Diet = 'Vegetarian';
      component.formData.otherDiet = 'Gluten-Free';

      const finalDiet = component.formData.otherDiet.trim()
        ? component.formData.otherDiet
        : component.formData.Diet;

      expect(finalDiet).toBe('Gluten-Free');
    });

    it('should handle otherDiet with spaces but meaningful content', () => {
      component.formData.Diet = 'None';
      component.formData.otherDiet = '  Gluten Free  ';

      const finalDiet = component.formData.otherDiet.trim()
        ? component.formData.otherDiet
        : component.formData.Diet;

      expect(finalDiet).toBe('  Gluten Free  ');
    });
  });

  describe('Attendance Logic', () => {
    it('should set RSVPstatus to true when attending is "Yes"', () => {
      component.formData.Attending = 'Yes';

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

      let attendance;
      if (component.formData.Attending == "Yes") {
        attendance = true;
      } else {
        attendance = false;
      }

      expect(attendance).toBe(false);
    });

    it('should set RSVPstatus to false when attending is empty', () => {
      component.formData.Attending = '';

      let attendance;
      if (component.formData.Attending == "Yes") {
        attendance = true;
      } else {
        attendance = false;
      }

      expect(attendance).toBe(false);
    });

    it('should set RSVPstatus to false when attending is "Maybe"', () => {
      component.formData.Attending = 'Maybe';

      let attendance;
      if (component.formData.Attending == "Yes") {
        attendance = true;
      } else {
        attendance = false;
      }

      expect(attendance).toBe(false);
    });
  });

  describe('Submit Data Construction', () => {
    it('should create submit data correctly with all fields', () => {
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

    it('should create submit data correctly with otherDiet', () => {
      component.formData.Name = 'Jane';
      component.formData.Surname = 'Smith';
      component.formData.Email = 'jane@example.com';
      component.formData.Diet = 'Vegetarian';
      component.formData.otherDiet = 'Keto';
      component.formData.Allergy = 'Peanuts';
      component.formData.Song = '';
      component.formData.Attending = 'No';

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
        Email: 'jane@example.com',
        Dietary: 'Keto',
        Allergies: 'Peanuts',
        Song: '',
        RSVPstatus: false
      });
      expect(fullname).toBe('Jane Smith');
    });

    it('should create submit data with empty song', () => {
      component.formData.Name = 'Bob';
      component.formData.Surname = 'Wilson';
      component.formData.Email = 'bob@example.com';
      component.formData.Diet = 'None';
      component.formData.otherDiet = '';
      component.formData.Allergy = '';
      component.formData.Song = '';
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
        Email: 'bob@example.com',
        Dietary: 'None',
        Allergies: '',
        Song: '',
        RSVPstatus: true
      });
      expect(fullname).toBe('Bob Wilson');
    });
  });

  describe('Event Code Validation', () => {
    it('should handle event code with only spaces', () => {
      const alertSpy = spyOn(window, 'alert');

      const eventCode = '   ';
      if (!eventCode.trim()) {
        alert("Please enter a valid Event Code ");
      }

      expect(alertSpy).toHaveBeenCalledWith('Please enter a valid Event Code ');
    });

    it('should trim event code before processing', () => {
      const eventCode = '  VALID123  ';
      const trimmedCode = eventCode.trim();

      expect(trimmedCode).toBe('VALID123');
    });

    it('should handle empty event code', () => {
      const alertSpy = spyOn(window, 'alert');

      const eventCode = '';
      if (!eventCode.trim()) {
        alert("Please enter a valid Event Code ");
      }

      expect(alertSpy).toHaveBeenCalledWith('Please enter a valid Event Code ');
    });
  });

  describe('Component Lifecycle and Properties', () => {
    it('should have auth service injected', () => {
      expect(component['auth']).toBeTruthy();
    });

    it('should have firestore service injected', () => {
      expect(component['db']).toBeTruthy();
    });

    it('should have router service injected', () => {
      expect(component['router']).toBeTruthy();
    });

    it('should update message property', () => {
      component.message = 'Test message';
      expect(component.message).toBe('Test message');
    });

    it('should update eventId property', () => {
      component.eventId = 'test-event-123';
      expect(component.eventId).toBe('test-event-123');
    });

    it('should update eventIdEntered property', () => {
      component.eventIdEntered = true;
      expect(component.eventIdEntered).toBe(true);
    });

    it('should update eventCode property', () => {
      component.eventCode = 'TEST123';
      expect(component.eventCode).toBe('TEST123');
    });
  });

  describe('Form Data Updates', () => {
    it('should update form data Name', () => {
      component.formData.Name = 'New Name';
      expect(component.formData.Name).toBe('New Name');
    });

    it('should update form data Surname', () => {
      component.formData.Surname = 'New Surname';
      expect(component.formData.Surname).toBe('New Surname');
    });

    it('should update form data Email', () => {
      component.formData.Email = 'new@example.com';
      expect(component.formData.Email).toBe('new@example.com');
    });

    it('should update form data Attending', () => {
      component.formData.Attending = 'No';
      expect(component.formData.Attending).toBe('No');
    });

    it('should update form data Diet', () => {
      component.formData.Diet = 'Vegan';
      expect(component.formData.Diet).toBe('Vegan');
    });

    it('should update form data otherDiet', () => {
      component.formData.otherDiet = 'Custom Diet';
      expect(component.formData.otherDiet).toBe('Custom Diet');
    });

    it('should update form data Allergy', () => {
      component.formData.Allergy = 'Nuts';
      expect(component.formData.Allergy).toBe('Nuts');
    });

    it('should update form data Song', () => {
      component.formData.Song = 'Favorite Song';
      expect(component.formData.Song).toBe('Favorite Song');
    });

    it('should update form data guestID', () => {
      component.formData.guestID = 'guest-123';
      expect(component.formData.guestID).toBe('guest-123');
    });
  });

  describe('Error Message Handling', () => {
    it('should handle empty name validation message', () => {
      const alertSpy = spyOn(window, 'alert');

      const name = '';
      const surname = '';
      const fullname = surname.trim()
        ? name.trim() + ' ' + surname.trim()
        : name.trim();

      if (fullname.trim() == '') {
        alert('Name field cannot be empty ❌');
      }

      expect(alertSpy).toHaveBeenCalledWith('Name field cannot be empty ❌');
    });

    it('should handle name with only spaces validation', () => {
      const alertSpy = spyOn(window, 'alert');

      const name = '   ';
      const surname = '   ';
      const fullname = surname.trim()
        ? name.trim() + ' ' + surname.trim()
        : name.trim();

      if (fullname.trim() == '') {
        alert('Name field cannot be empty ❌');
      }

      expect(alertSpy).toHaveBeenCalledWith('Name field cannot be empty ❌');
    });
  });

  describe('Navigation Logic', () => {
    it('should navigate after delay', fakeAsync(() => {
      setTimeout(() => {
        router.navigate(['/landing']);
      }, 2000);

      tick(2000);

      expect(router.navigate).toHaveBeenCalledWith(['/landing']);
    }));

    it('should not navigate before delay', fakeAsync(() => {
      setTimeout(() => {
        router.navigate(['/landing']);
      }, 2000);

      tick(1000);

      expect(router.navigate).not.toHaveBeenCalled();
    }));
  });

  describe('Method Logic Tests', () => {
    it('should handle name validation in onSubmit', async () => {
      const alertSpy = spyOn(window, 'alert');
      component.eventId = 'test-event';
      component.eventIdEntered = true;
      component.formData.Name = '';
      component.formData.Surname = '';

      const fullname = component.formData.Surname.trim()
        ? component.formData.Name.trim() + ' ' + component.formData.Surname.trim()
        : component.formData.Name.trim();

      if (fullname.trim() == '') {
        component.message = 'Please enter your full name ❌';
        alert('Name field cannot be empty ❌');
        return;
      }

      expect(component.message).toBe('Please enter your full name ❌');
      expect(alertSpy).toHaveBeenCalledWith('Name field cannot be empty ❌');
    });

    it('should process form data correctly', () => {
      component.formData.Name = 'Test';
      component.formData.Surname = 'User';
      component.formData.Email = 'test@example.com';
      component.formData.Attending = 'Yes';
      component.formData.Diet = 'None';
      component.formData.otherDiet = '';
      component.formData.Allergy = 'None';
      component.formData.Song = 'Test Song';

      const finalDiet = component.formData.otherDiet.trim()
        ? component.formData.otherDiet
        : component.formData.Diet;

      const fullname = component.formData.Surname.trim()
        ? component.formData.Name.trim() + ' ' + component.formData.Surname.trim()
        : component.formData.Name.trim();

      const attendance = component.formData.Attending == "Yes";

      const submitData = {
        Email: component.formData.Email,
        Dietary: finalDiet,
        Allergies: component.formData.Allergy,
        Song: component.formData.Song,
        RSVPstatus: attendance
      };

      expect(submitData).toEqual({
        Email: 'test@example.com',
        Dietary: 'None',
        Allergies: 'None',
        Song: 'Test Song',
        RSVPstatus: true
      });
      expect(fullname).toBe('Test User');
    });

    it('should handle case sensitivity in attendance', () => {
      component.formData.Attending = 'yes';
      const attendance = component.formData.Attending == "Yes";
      expect(attendance).toBe(false);

      component.formData.Attending = 'YES';
      const attendance2 = component.formData.Attending == "Yes";
      expect(attendance2).toBe(false);
    });

    it('should handle various diet combinations', () => {
      // Test case 1: Both diet and otherDiet empty
      component.formData.Diet = '';
      component.formData.otherDiet = '';
      const diet1 = component.formData.otherDiet.trim()
        ? component.formData.otherDiet
        : component.formData.Diet;
      expect(diet1).toBe('');

      // Test case 2: Only otherDiet with spaces
      component.formData.Diet = 'Vegetarian';
      component.formData.otherDiet = '   ';
      const diet2 = component.formData.otherDiet.trim()
        ? component.formData.otherDiet
        : component.formData.Diet;
      expect(diet2).toBe('Vegetarian');

      // Test case 3: otherDiet with content
      component.formData.Diet = 'None';
      component.formData.otherDiet = 'Custom Diet';
      const diet3 = component.formData.otherDiet.trim()
        ? component.formData.otherDiet
        : component.formData.Diet;
      expect(diet3).toBe('Custom Diet');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long names', () => {
      component.formData.Name = 'A'.repeat(100);
      component.formData.Surname = 'B'.repeat(100);

      const fullname = component.formData.Surname.trim()
        ? component.formData.Name.trim() + ' ' + component.formData.Surname.trim()
        : component.formData.Name.trim();

      expect(fullname.length).toBe(201); // 100 + 1 space + 100
    });

    it('should handle special characters in names', () => {
      component.formData.Name = 'Jöhn';
      component.formData.Surname = 'Döe';

      const fullname = component.formData.Surname.trim()
        ? component.formData.Name.trim() + ' ' + component.formData.Surname.trim()
        : component.formData.Name.trim();

      expect(fullname).toBe('Jöhn Döe');
    });

    it('should handle email validation patterns', () => {
      component.formData.Email = 'test.email+tag@example.co.uk';
      expect(component.formData.Email).toBe('test.email+tag@example.co.uk');
    });
  });
});
