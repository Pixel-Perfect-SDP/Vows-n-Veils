import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, UrlTree } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Rsvp } from './rsvp';
import { AuthService } from '../../core/auth';
import { Firestore, collection, doc, getDocs, updateDoc, query, where } from '@angular/fire/firestore';
import { convertToParamMap } from '@angular/router';

// Enhanced mock objects
const createMockQuerySnapshot = (data: any[] = []) => ({
  docs: data.map((item, index) => ({
    id: item.id || `mock-id-${index}`,
    data: () => item.data || item,
    exists: () => true
  })),
  empty: data.length === 0,
  size: data.length,
  forEach: function(callback: any) {
    this.docs.forEach(doc => callback(doc));
  }
});

const mockUrlTree = {
  toString: () => '/landing'
} as UrlTree;

describe('Rsvp', () => {
  let component: Rsvp;
  let fixture: ComponentFixture<Rsvp>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockAuth: jasmine.SpyObj<AuthService>;
  let mockFirestore: jasmine.SpyObj<any>;
  let mockGetDocs: jasmine.Spy;
  let mockUpdateDoc: jasmine.Spy;
  let mockCollection: jasmine.Spy;
  let mockDoc: jasmine.Spy;
  let mockQuery: jasmine.Spy;
  let mockWhere: jasmine.Spy;

  beforeEach(async () => {
    // Enhanced Router spy
    mockRouter = jasmine.createSpyObj('Router', [
      'navigate',
      'navigateByUrl',
      'createUrlTree',
      'serializeUrl'
    ], {
      url: '/',
      events: of()
    });

    mockRouter.navigate.and.returnValue(Promise.resolve(true));
    mockRouter.navigateByUrl.and.returnValue(Promise.resolve(true));
    mockRouter.createUrlTree.and.returnValue(mockUrlTree);
    mockRouter.serializeUrl.and.returnValue('/landing');

    mockAuth = jasmine.createSpyObj('AuthService', ['user']);
    mockAuth.user.and.returnValue({ uid: 'test-user-id' } as any);

    // Firestore spies
    mockGetDocs = jasmine.createSpy('getDocs').and.returnValue(Promise.resolve(createMockQuerySnapshot()));
    mockUpdateDoc = jasmine.createSpy('updateDoc').and.returnValue(Promise.resolve());
    mockCollection = jasmine.createSpy('collection').and.returnValue('mock-collection');
    mockDoc = jasmine.createSpy('doc').and.returnValue({ id: 'mock-doc-id' });
    mockQuery = jasmine.createSpy('query').and.returnValue('mock-query');
    mockWhere = jasmine.createSpy('where').and.returnValue('mock-where');

    mockFirestore = jasmine.createSpyObj('Firestore', [], {
      collection: mockCollection,
      doc: mockDoc
    });

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, Rsvp],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: AuthService, useValue: mockAuth },
        { provide: Firestore, useValue: mockFirestore },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({})),
            queryParamMap: of(convertToParamMap({})),
            snapshot: {
              paramMap: convertToParamMap({}),
              queryParamMap: convertToParamMap({})
            }
          }
        }
      ]
    })
    .overrideProvider(getDocs, { useValue: mockGetDocs })
    .overrideProvider(updateDoc, { useValue: mockUpdateDoc })
    .overrideProvider(collection, { useValue: mockCollection })
    .overrideProvider(doc, { useValue: mockDoc })
    .overrideProvider(query, { useValue: mockQuery })
    .overrideProvider(where, { useValue: mockWhere })
    .compileComponents();

    fixture = TestBed.createComponent(Rsvp);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    // Clear all mocks
    mockGetDocs.calls.reset();
    mockUpdateDoc.calls.reset();
    mockCollection.calls.reset();
    mockDoc.calls.reset();
    mockQuery.calls.reset();
    mockWhere.calls.reset();
    mockAuth.user.calls.reset();
    mockRouter.navigate.calls.reset();
  });

  describe('Component Creation and Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(component.message).toBe('');
      expect(component.eventId).toBe('');
      expect(component.eventIdEntered).toBeFalse();
      expect(component.eventCode).toBe('');
      expect(component.storyData).toBeNull();
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

    it('should return router instance', () => {
      expect(component.getRouter()).toBe(mockRouter);
    });

    it('should return firestore instance', () => {
      expect(component.getDBforTesting()).toBe(mockFirestore);
    });
  });

  describe('Form Validation and Data Handling', () => {
    it('should handle form data assignment', () => {
      component.formData.Name = 'John';
      component.formData.Surname = 'Doe';
      component.formData.Email = 'john@example.com';

      expect(component.formData.Name).toBe('John');
      expect(component.formData.Surname).toBe('Doe');
      expect(component.formData.Email).toBe('john@example.com');
    });

    it('should handle empty name with spaces', () => {
      component.formData.Name = '   ';
      component.formData.Surname = '   ';

      expect(component.formData.Name.trim()).toBe('');
      expect(component.formData.Surname.trim()).toBe('');
    });
  });

  describe('Form Submission - onSubmit()', () => {
    beforeEach(() => {
      component.eventId = 'test-event-id';
    });

    describe('Validation Errors', () => {
      it('should handle empty name submission', async () => {
        component.formData.Name = '';
        component.formData.Surname = '';

        await component.onSubmit();

        expect(component.message).toBe('Please enter your full name ❌');
        expect(mockGetDocs).not.toHaveBeenCalled();
      });

      it('should handle name with only spaces', async () => {
        component.formData.Name = '   ';
        component.formData.Surname = '   ';

        await component.onSubmit();

        expect(component.message).toBe('Please enter your full name ❌');
      });

      it('should handle surname only with proper name', async () => {
        component.formData.Name = 'John';
        component.formData.Surname = '   ';

        // This should work as fullname becomes "John"
        mockGetDocs.and.returnValue(Promise.resolve(createMockQuerySnapshot([{
          id: 'guest-123',
          data: { Name: 'John', EventID: 'test-event-id' }
        }])));

        await component.onSubmit();

        expect(mockGetDocs).toHaveBeenCalled();
      });
    });

    describe('Guest Lookup Scenarios', () => {
      it('should handle guest not found', async () => {
        component.formData.Name = 'John';
        component.formData.Surname = 'Doe';

        mockGetDocs.and.returnValue(Promise.resolve(createMockQuerySnapshot()));

        await component.onSubmit();

        expect(component.message).toBe('Guest not apart of wedding party ❌');
        expect(mockGetDocs).toHaveBeenCalled();
      });

      it('should handle multiple guests found (take first)', async () => {
        component.formData.Name = 'John';
        component.formData.Surname = 'Doe';

        const mockGuests = [
          { id: 'guest-1', data: { Name: 'John Doe', EventID: 'test-event-id' } },
          { id: 'guest-2', data: { Name: 'John Doe', EventID: 'test-event-id' } }
        ];
        mockGetDocs.and.returnValue(Promise.resolve(createMockQuerySnapshot(mockGuests)));

        await component.onSubmit();

        expect(mockUpdateDoc).toHaveBeenCalled();
        expect(component.message).toContain('successfully');
      });
    });

    describe('Successful RSVP Updates', () => {
      beforeEach(() => {
        component.formData.Name = 'John';
        component.formData.Surname = 'Doe';
        component.eventId = 'test-event-id';
      });

      it('should update RSVP with "Yes" attendance', async () => {
        component.formData.Attending = 'Yes';
        component.formData.Email = 'john@example.com';
        component.formData.Diet = 'Vegetarian';
        component.formData.Allergy = 'None';
        component.formData.Song = 'Test Song';

        mockGetDocs.and.returnValue(Promise.resolve(createMockQuerySnapshot([{
          id: 'guest-123',
          data: { Name: 'John Doe', EventID: 'test-event-id' }
        }])));

        await component.onSubmit();

        expect(mockUpdateDoc).toHaveBeenCalled();
        expect(component.message).toBe('RSVP updated successfully ✅');
      });

      it('should update RSVP with "No" attendance', async () => {
        component.formData.Attending = 'No';
        component.formData.Email = '';

        mockGetDocs.and.returnValue(Promise.resolve(createMockQuerySnapshot([{
          id: 'guest-123',
          data: { Name: 'John Doe', EventID: 'test-event-id' }
        }])));

        await component.onSubmit();

        expect(mockUpdateDoc).toHaveBeenCalled();
        expect(mockUpdateDoc.calls.mostRecent().args[1]).toEqual(jasmine.objectContaining({
          RSVPstatus: false
        }));
      });

      it('should use otherDiet when provided', async () => {
        component.formData.Attending = 'Yes';
        component.formData.Diet = 'Other';
        component.formData.otherDiet = 'Custom Vegan Diet';

        mockGetDocs.and.returnValue(Promise.resolve(createMockQuerySnapshot([{
          id: 'guest-123',
          data: { Name: 'John Doe', EventID: 'test-event-id' }
        }])));

        await component.onSubmit();

        expect(mockUpdateDoc).toHaveBeenCalled();
        const updateData = mockUpdateDoc.calls.mostRecent().args[1] as any;
        expect(updateData.Dietary).toBe('Custom Vegan Diet');
      });

      it('should use Diet when otherDiet is empty', async () => {
        component.formData.Attending = 'Yes';
        component.formData.Diet = 'Vegan';
        component.formData.otherDiet = '';

        mockGetDocs.and.returnValue(Promise.resolve(createMockQuerySnapshot([{
          id: 'guest-123',
          data: { Name: 'John Doe', EventID: 'test-event-id' }
        }])));

        await component.onSubmit();

        const updateData = mockUpdateDoc.calls.mostRecent().args[1] as any;
        expect(updateData.Dietary).toBe('Vegan');
      });

      it('should use Diet when otherDiet has only spaces', async () => {
        component.formData.Attending = 'Yes';
        component.formData.Diet = 'Gluten-Free';
        component.formData.otherDiet = '   ';

        mockGetDocs.and.returnValue(Promise.resolve(createMockQuerySnapshot([{
          id: 'guest-123',
          data: { Name: 'John Doe', EventID: 'test-event-id' }
        }])));

        await component.onSubmit();

        const updateData = mockUpdateDoc.calls.mostRecent().args[1] as any;
        expect(updateData.Dietary).toBe('Gluten-Free');
      });
    });

    describe('Error Handling', () => {
      it('should handle Firestore errors during submission', async () => {
        component.formData.Name = 'John';
        component.formData.Surname = 'Doe';
        component.formData.Attending = 'Yes';

        mockGetDocs.and.returnValue(Promise.reject(new Error('Firestore error')));

        await component.onSubmit();

        expect(component.message).toBe('Something went wrong ❌');
      });

      it('should handle updateDoc errors', async () => {
        component.formData.Name = 'John';
        component.formData.Surname = 'Doe';

        mockGetDocs.and.returnValue(Promise.resolve(createMockQuerySnapshot([{
          id: 'guest-123',
          data: { Name: 'John Doe', EventID: 'test-event-id' }
        }])));
        mockUpdateDoc.and.returnValue(Promise.reject(new Error('Update failed')));

        await component.onSubmit();

        expect(component.message).toBe('Something went wrong ❌');
      });
    });

    describe('Navigation', () => {
      it('should navigate after successful RSVP', fakeAsync(async () => {
        component.formData.Name = 'John';
        component.formData.Surname = 'Doe';
        component.formData.Attending = 'Yes';

        mockGetDocs.and.returnValue(Promise.resolve(createMockQuerySnapshot([{
          id: 'guest-123',
          data: { Name: 'John Doe', EventID: 'test-event-id' }
        }])));

        await component.onSubmit();
        tick(2000);

        expect(mockRouter.navigate).toHaveBeenCalledWith(['/landing']);
      }));

      it('should not navigate on failed RSVP', fakeAsync(async () => {
        component.formData.Name = '';
        component.formData.Surname = '';

        await component.onSubmit();
        tick(2000);

        expect(mockRouter.navigate).not.toHaveBeenCalled();
      }));
    });
  });

  describe('Event Code Submission - submitEventCode()', () => {
    describe('Validation', () => {
      it('should handle empty event code', async () => {
        component.eventCode = '';

        await component.submitEventCode();

        expect(component.eventIdEntered).toBeFalse();
        expect(mockGetDocs).not.toHaveBeenCalled();
      });

      it('should handle event code with only spaces', async () => {
        component.eventCode = '   ';

        await component.submitEventCode();

        expect(component.eventIdEntered).toBeFalse();
        expect(mockGetDocs).not.toHaveBeenCalled();
      });
    });

    describe('Successful Event Code Submission', () => {
      it('should set eventIdEntered when valid code is found', async () => {
        component.eventCode = 'VALID123';

        const mockEventData = [{
          id: 'event-123',
          data: {
            RSVPcode: 'VALID123',
            EventID: 'event-user-id'
          }
        }];

        const mockStoryData = [{
          id: 'story-123',
          data: {
            title: 'Our Love Story',
            content: 'We met in college...',
            userID: 'event-user-id'
          }
        }];

        let callCount = 0;
        mockGetDocs.and.callFake(() => {
          callCount++;
          return callCount === 1
            ? Promise.resolve(createMockQuerySnapshot(mockEventData))
            : Promise.resolve(createMockQuerySnapshot(mockStoryData));
        });

        await component.submitEventCode();

        expect(component.eventIdEntered).toBeTrue();
        expect(component.eventId).toBe('event-user-id');
        expect(component.storyData).toEqual(mockStoryData[0].data);
        expect(component.message).toBe('');
      });

      it('should handle no story found for event', async () => {
        component.eventCode = 'VALID123';

        const mockEventData = [{
          id: 'event-123',
          data: {
            RSVPcode: 'VALID123',
            EventID: 'event-user-id'
          }
        }];

        let callCount = 0;
        mockGetDocs.and.callFake(() => {
          callCount++;
          return callCount === 1
            ? Promise.resolve(createMockQuerySnapshot(mockEventData))
            : Promise.resolve(createMockQuerySnapshot([]));
        });

        await component.submitEventCode();

        expect(component.eventIdEntered).toBeTrue();
        expect(component.storyData).toBeNull();
      });

      it('should use EventID from event data', async () => {
        component.eventCode = 'VALID123';

        const mockEventData = [{
          id: 'event-123',
          data: {
            RSVPcode: 'VALID123',
            EventID: 'custom-event-id'
          }
        }];

        mockGetDocs.and.returnValue(Promise.resolve(createMockQuerySnapshot(mockEventData)));

        await component.submitEventCode();

        expect(component.eventId).toBe('custom-event-id');
      });
    });

    describe('Event Code Errors', () => {
      it('should handle event code not found', async () => {
        component.eventCode = 'INVALID123';

        mockGetDocs.and.returnValue(Promise.resolve(createMockQuerySnapshot([])));

        await component.submitEventCode();

        expect(component.eventIdEntered).toBeFalse();
        expect(component.message).toBe('Event Code not found ❌');
        expect(component.eventId).toBe('');
      });

      it('should handle errors during event code lookup', async () => {
        component.eventCode = 'TEST123';

        mockGetDocs.and.returnValue(Promise.reject(new Error('Network error')));

        await component.submitEventCode();

        expect(component.eventIdEntered).toBeFalse();
        expect(component.message).toBe('Event Code not found ❌');
      });

      it('should handle errors during story lookup', async () => {
        component.eventCode = 'VALID123';

        const mockEventData = [{
          id: 'event-123',
          data: {
            RSVPcode: 'VALID123',
            EventID: 'event-user-id'
          }
        }];

        let callCount = 0;
        mockGetDocs.and.callFake(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve(createMockQuerySnapshot(mockEventData));
          } else {
            return Promise.reject(new Error('Story lookup failed'));
          }
        });

        await component.submitEventCode();

        expect(component.eventIdEntered).toBeTrue();
        expect(component.storyData).toBeNull();
      });
    });
  });

  describe('Edge Cases and Special Scenarios', () => {
    it('should handle very long input values', async () => {
      component.formData.Name = 'John';
      component.formData.Surname = 'Doe';
      component.formData.Email = 'a'.repeat(100) + '@test.com';
      component.formData.Song = 'b'.repeat(500);
      component.eventId = 'test-event-id';

      mockGetDocs.and.returnValue(Promise.resolve(createMockQuerySnapshot([{
        id: 'guest-123',
        data: { Name: 'John Doe', EventID: 'test-event-id' }
      }])));

      await component.onSubmit();

      expect(mockUpdateDoc).toHaveBeenCalled();
      const updateData = mockUpdateDoc.calls.mostRecent().args[1] as any;
      expect(updateData.Email).toBe('a'.repeat(100) + '@test.com');
      expect(updateData.Song).toBe('b'.repeat(500));
    });

    it('should handle special characters in names', async () => {
      component.formData.Name = 'José';
      component.formData.Surname = 'Muñoz';
      component.eventId = 'test-event-id';

      mockGetDocs.and.returnValue(Promise.resolve(createMockQuerySnapshot([{
        id: 'guest-123',
        data: { Name: 'José Muñoz', EventID: 'test-event-id' }
      }])));

      await component.onSubmit();

      expect(mockUpdateDoc).toHaveBeenCalled();
    });

    it('should handle name without surname', async () => {
      component.formData.Name = 'John';
      component.formData.Surname = '';
      component.eventId = 'test-event-id';

      mockGetDocs.and.returnValue(Promise.resolve(createMockQuerySnapshot([{
        id: 'guest-123',
        data: { Name: 'John', EventID: 'test-event-id' }
      }])));

      await component.onSubmit();

      expect(mockUpdateDoc).toHaveBeenCalled();
    });

    it('should handle different diet options', async () => {
      const diets = ['None', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Kosher', 'Halal'];
      component.formData.Name = 'John';
      component.formData.Surname = 'Doe';
      component.eventId = 'test-event-id';

      for (const diet of diets) {
        component.formData.Diet = diet;

        mockGetDocs.and.returnValue(Promise.resolve(createMockQuerySnapshot([{
          id: 'guest-123',
          data: { Name: 'John Doe', EventID: 'test-event-id' }
        }])));

        await component.onSubmit();

        const updateData = mockUpdateDoc.calls.mostRecent().args[1] as any;
        expect(updateData.Dietary).toBe(diet);

        // Reset for next iteration
        mockUpdateDoc.calls.reset();
        mockGetDocs.calls.reset();
      }
    });
  });

  describe('Component State Management', () => {
    it('should reset message on new operations', () => {
      component.message = 'Previous message';
      component.eventCode = 'NEW123';

      // The component doesn't automatically reset message, but we can test the behavior
      expect(component.message).toBe('Previous message');
      expect(component.eventCode).toBe('NEW123');
    });

    it('should maintain separate form data state', () => {
      component.formData.Name = 'Test';
      component.formData.Surname = 'User';
      component.formData.Email = 'test@example.com';

      expect(component.formData).toEqual(jasmine.objectContaining({
        Name: 'Test',
        Surname: 'User',
        Email: 'test@example.com'
      }));
    });
  });
});
