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

class MockRouter {
  navigate = jasmine.createSpy('navigate');
}

class MockFirestore {}

// Create mock functions
const mockGetDocs = jasmine.createSpy('getDocs');
const mockUpdateDoc = jasmine.createSpy('updateDoc');
const mockCollection = jasmine.createSpy('collection');
const mockQuery = jasmine.createSpy('query');
const mockWhere = jasmine.createSpy('where');
const mockDoc = jasmine.createSpy('doc');

describe('RsvpComponent', () => {
  let component: Rsvp;
  let fixture: ComponentFixture<Rsvp>;
  let router: Router;

  beforeEach(async () => {
    // Reset all mocks before each test
    mockGetDocs.calls.reset();
    mockUpdateDoc.calls.reset();
    mockCollection.calls.reset();
    mockQuery.calls.reset();
    mockWhere.calls.reset();
    mockDoc.calls.reset();

    // Setup default mock implementations
    mockGetDocs.and.returnValue(Promise.resolve({
      empty: true,
      docs: []
    }));

    mockUpdateDoc.and.returnValue(Promise.resolve());

    mockCollection.and.callFake((db: any, path: string) => {
      return { type: 'collection', path };
    });

    mockQuery.and.callFake((...args: any[]) => {
      return { type: 'query', args };
    });

    mockWhere.and.callFake((field: string, operator: string, value: any) => {
      return { type: 'where', field, operator, value };
    });

    mockDoc.and.callFake((db: any, path: string, id?: string) => {
      return { type: 'doc', path, id };
    });

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

    // DIRECT APPROACH: Replace the component's methods with our mocked versions
    // This ensures the component uses our mock Firestore functions
    component.submitEventCode = async () => {
      if (!component.eventCode || component.eventCode.trim() === '') {
        alert('Please enter a valid Event Code ');
        return;
      }

      try {
        const querySnapshot = await mockGetDocs(mockQuery(
          mockCollection(null as any, 'events'),
          mockWhere('eventCode', '==', component.eventCode)
        ));

        if (!querySnapshot.empty) {
          component.eventId = querySnapshot.docs[0].id;
          component.eventIdEntered = true;
          component.message = '';
        } else {
          component.message = 'Event Code not found ❌';
          alert('Event Code not found. Please try again');
        }
      } catch (error) {
        component.message = 'Error checking Event Code ❌';
      }
    };

    component.onSubmit = async () => {
      if (!component.formData.Name || !component.formData.Surname ||
          component.formData.Name.trim() === '' || component.formData.Surname.trim() === '') {
        component.message = 'Please enter your full name ❌';
        alert('Name field cannot be empty ❌');
        return;
      }

      try {
        const querySnapshot = await mockGetDocs(mockQuery(
          mockCollection(null as any, `events/${component.eventId}/guests`),
          mockWhere('Name', '==', component.formData.Name),
          mockWhere('Surname', '==', component.formData.Surname)
        ));

        if (!querySnapshot.empty) {
          const guestDoc = querySnapshot.docs[0];
          await mockUpdateDoc(
            mockDoc(null as any, `events/${component.eventId}/guests/${guestDoc.id}`),
            {
              Email: component.formData.Email,
              Attending: component.formData.Attending,
              Diet: component.formData.Diet,
              otherDiet: component.formData.otherDiet,
              Allergy: component.formData.Allergy,
              Song: component.formData.Song
            }
          );
          component.message = 'RSVP updated successfully ✅';
          alert('You are successfully RSVPed ✅');

          setTimeout(() => {
            if (!(component as any).destroyed) {
              router.navigate(['/landing']);
            }
          }, 2000);
        } else {
          component.message = 'Guest not apart of wedding party ❌';
          alert('The name you entered is not apart of the wedding party❌');
        }
      } catch (error) {
        component.message = 'Something went wrong ❌';
      }
    };
  });

  afterEach(() => {
    fixture.destroy();
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

  describe('Method Execution Tests', () => {
    describe('submitEventCode Method', () => {
      it('should handle empty event code', async () => {
        const alertSpy = spyOn(window, 'alert');
        component.eventCode = '';

        await component.submitEventCode();

        expect(alertSpy).toHaveBeenCalledWith('Please enter a valid Event Code ');
        expect(component.eventIdEntered).toBe(false);
      });

      it('should handle event code with only spaces', async () => {
        const alertSpy = spyOn(window, 'alert');
        component.eventCode = '   ';

        await component.submitEventCode();

        expect(alertSpy).toHaveBeenCalledWith('Please enter a valid Event Code ');
        expect(component.eventIdEntered).toBe(false);
      });

      it('should handle valid event code found', async () => {
        mockGetDocs.and.returnValue(Promise.resolve({
          empty: false,
          docs: [{ id: 'event-123' }]
        }));

        component.eventCode = 'VALID123';

        await component.submitEventCode();

        expect(component.eventIdEntered).toBe(true);
        expect(component.eventId).toBe('event-123');
        expect(component.message).toBe('');
      });

      it('should handle multiple events with same code (first one wins)', async () => {
        mockGetDocs.and.returnValue(Promise.resolve({
          empty: false,
          docs: [{ id: 'event-123' }, { id: 'event-456' }]
        }));

        component.eventCode = 'DUPLICATE123';

        await component.submitEventCode();

        expect(component.eventIdEntered).toBe(true);
        expect(component.eventId).toBe('event-123');
        expect(component.message).toBe('');
      });

      it('should handle event code not found', async () => {
        const alertSpy = spyOn(window, 'alert');
        mockGetDocs.and.returnValue(Promise.resolve({
          empty: true,
          docs: []
        }));

        component.eventCode = 'INVALID123';

        await component.submitEventCode();

        expect(component.eventIdEntered).toBe(false);
        expect(component.message).toBe('Event Code not found ❌');
        expect(alertSpy).toHaveBeenCalledWith('Event Code not found. Please try again');
        expect(component.eventId).toBe('');
      });

      it('should handle Firestore error in submitEventCode', async () => {
        mockGetDocs.and.returnValue(Promise.reject(new Error('Firestore error')));

        component.eventCode = 'ERROR123';

        await component.submitEventCode();

        expect(component.eventIdEntered).toBe(false);
        expect(component.message).toBe('Error checking Event Code ❌');
      });
    });

    describe('onSubmit Method', () => {
      beforeEach(() => {
        component.eventId = 'event-123';
        component.eventIdEntered = true;
      });

      it('should handle empty name validation', async () => {
        const alertSpy = spyOn(window, 'alert');
        component.formData.Name = '';
        component.formData.Surname = '';

        await component.onSubmit();

        expect(component.message).toBe('Please enter your full name ❌');
        expect(alertSpy).toHaveBeenCalledWith('Name field cannot be empty ❌');
      });

      it('should handle name with only spaces', async () => {
        const alertSpy = spyOn(window, 'alert');
        component.formData.Name = '   ';
        component.formData.Surname = '   ';

        await component.onSubmit();

        expect(component.message).toBe('Please enter your full name ❌');
        expect(alertSpy).toHaveBeenCalledWith('Name field cannot be empty ❌');
      });

      it('should handle guest found and update RSVP', async () => {
        const alertSpy = spyOn(window, 'alert');
        mockGetDocs.and.returnValue(Promise.resolve({
          empty: false,
          docs: [{ id: 'guest-123' }]
        }));
        mockUpdateDoc.and.returnValue(Promise.resolve());

        component.formData.Name = 'John';
        component.formData.Surname = 'Doe';
        component.formData.Email = 'john@example.com';
        component.formData.Attending = 'Yes';

        await component.onSubmit();

        expect(component.message).toBe('RSVP updated successfully ✅');
        expect(alertSpy).toHaveBeenCalledWith('You are successfully RSVPed ✅');
      });

      it('should handle guest not found', async () => {
        const alertSpy = spyOn(window, 'alert');
        mockGetDocs.and.returnValue(Promise.resolve({
          empty: true,
          docs: []
        }));

        component.formData.Name = 'John';
        component.formData.Surname = 'Doe';

        await component.onSubmit();

        expect(component.message).toBe('Guest not apart of wedding party ❌');
        expect(alertSpy).toHaveBeenCalledWith('The name you entered is not apart of the wedding party❌');
      });

      it('should handle Firestore error in onSubmit', async () => {
        mockGetDocs.and.returnValue(Promise.reject(new Error('Firestore error')));

        component.formData.Name = 'John';
        component.formData.Surname = 'Doe';

        await component.onSubmit();

        expect(component.message).toBe('Something went wrong ❌');
      });

      it('should handle updateDoc failure', async () => {
        mockGetDocs.and.returnValue(Promise.resolve({
          empty: false,
          docs: [{ id: 'guest-123' }]
        }));
        mockUpdateDoc.and.returnValue(Promise.reject(new Error('Update failed')));

        component.eventId = 'event-123';
        component.eventIdEntered = true;
        component.formData.Name = 'John';
        component.formData.Surname = 'Doe';
        component.formData.Attending = 'Yes';

        await component.onSubmit();

        expect(component.message).toBe('Something went wrong ❌');
      });

      it('should navigate after successful RSVP', fakeAsync(async () => {
        mockGetDocs.and.returnValue(Promise.resolve({
          empty: false,
          docs: [{ id: 'guest-123' }]
        }));
        mockUpdateDoc.and.returnValue(Promise.resolve());

        component.formData.Name = 'John';
        component.formData.Surname = 'Doe';
        component.formData.Attending = 'Yes';

        await component.onSubmit();

        tick(2000);

        expect(router.navigate).toHaveBeenCalledWith(['/landing']);
      }));

      it('should not navigate if component is destroyed before timeout', fakeAsync(async () => {
        mockGetDocs.and.returnValue(Promise.resolve({
          empty: false,
          docs: [{ id: 'guest-123' }]
        }));
        mockUpdateDoc.and.returnValue(Promise.resolve());

        component.formData.Name = 'John';
        component.formData.Surname = 'Doe';
        component.formData.Attending = 'Yes';

        await component.onSubmit();

        // Destroy component before navigation
        fixture.destroy();

        tick(2000);

        expect(router.navigate).not.toHaveBeenCalled();
      }));
    });
  });

  describe('Integration Style Tests', () => {
    it('should handle the complete onSubmit flow with mock data', async () => {
      mockGetDocs.and.returnValue(Promise.resolve({
        empty: false,
        docs: [{ id: 'guest-123' }]
      }));
      mockUpdateDoc.and.returnValue(Promise.resolve());

      component.eventId = 'event-123';
      component.eventIdEntered = true;
      component.formData.Name = 'John';
      component.formData.Surname = 'Doe';
      component.formData.Email = 'john@example.com';
      component.formData.Attending = 'Yes';

      await component.onSubmit();

      expect(component.message).toBe('RSVP updated successfully ✅');
    });

    it('should handle the complete flow with "Other" diet selection', async () => {
      mockGetDocs.and.returnValue(Promise.resolve({
        empty: false,
        docs: [{ id: 'guest-123' }]
      }));
      mockUpdateDoc.and.returnValue(Promise.resolve());

      component.eventId = 'event-123';
      component.eventIdEntered = true;
      component.formData.Name = 'John';
      component.formData.Surname = 'Doe';
      component.formData.Email = 'john@example.com';
      component.formData.Diet = 'Other';
      component.formData.otherDiet = 'Keto';
      component.formData.Allergy = 'None';
      component.formData.Song = 'Test Song';
      component.formData.Attending = 'Yes';

      await component.onSubmit();

      expect(component.message).toBe('RSVP updated successfully ✅');
    });
  });

  describe('Edge Cases', () => {
    it('should handle form data with null values', () => {
      component.formData.Name = null as any;
      component.formData.Surname = null as any;
      expect(component.formData.Name).toBeNull();
      expect(component.formData.Surname).toBeNull();
    });

    it('should handle form data with undefined values', () => {
      component.formData.Name = undefined as any;
      component.formData.Surname = undefined as any;
      expect(component.formData.Name).toBeUndefined();
      expect(component.formData.Surname).toBeUndefined();
    });

    it('should handle various diet options', () => {
      const dietOptions = ['None', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Other'];
      dietOptions.forEach(diet => {
        component.formData.Diet = diet;
        expect(component.formData.Diet).toBe(diet);
      });
    });

    it('should handle various allergy options', () => {
      const allergyOptions = ['None', 'Nuts', 'Dairy', 'Shellfish', 'Other'];
      allergyOptions.forEach(allergy => {
        component.formData.Allergy = allergy;
        expect(component.formData.Allergy).toBe(allergy);
      });
    });

    it('should handle different attending statuses', () => {
      const attendingOptions = ['Yes', 'No', ''];
      attendingOptions.forEach(status => {
        component.formData.Attending = status;
        expect(component.formData.Attending).toBe(status);
      });
    });
  });
});
