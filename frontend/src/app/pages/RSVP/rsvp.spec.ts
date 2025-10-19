import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, UrlTree } from '@angular/router';
import { of } from 'rxjs';
import { Rsvp } from './rsvp';
import { AuthService } from '../../core/auth';
import { Firestore, collection, doc, getDocs, updateDoc, query, where } from '@angular/fire/firestore';
import { convertToParamMap } from '@angular/router';

// Create proper mock objects
const mockQuerySnapshot = (data: any[] = []) => ({
  docs: data.map(item => ({
    id: item.id || 'mock-id',
    data: () => item.data || item
  })),
  empty: data.length === 0
});

const mockDocRef = {
  id: 'mock-doc-id'
};

// Mock UrlTree
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
    // Create a complete Router spy with all required methods
    mockRouter = jasmine.createSpyObj('Router', [
      'navigate',
      'navigateByUrl',
      'createUrlTree',
      'serializeUrl'
    ], [
      'url',
      'events'
    ]);

    mockRouter.navigate.and.returnValue(Promise.resolve(true));
    mockRouter.navigateByUrl.and.returnValue(Promise.resolve(true));
    mockRouter.createUrlTree.and.returnValue(mockUrlTree);
    mockRouter.serializeUrl.and.returnValue('/landing');
    (Object.getOwnPropertyDescriptor(mockRouter, 'url')?.get as jasmine.Spy).and.returnValue('/');
    (Object.getOwnPropertyDescriptor(mockRouter, 'events')?.get as jasmine.Spy).and.returnValue(of());

    mockAuth = jasmine.createSpyObj('AuthService', ['user']);
    mockAuth.user.and.returnValue({ uid: 'test-user-id' } as any);

    // Create spies for Firestore functions
    mockGetDocs = jasmine.createSpy('getDocs').and.returnValue(Promise.resolve(mockQuerySnapshot()));
    mockUpdateDoc = jasmine.createSpy('updateDoc').and.returnValue(Promise.resolve());
    mockCollection = jasmine.createSpy('collection').and.returnValue('mock-collection');
    mockDoc = jasmine.createSpy('doc').and.returnValue(mockDocRef);
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

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    const f = component.formData;
    expect(f.guestID).toBe('');
    expect(f.Name).toBe('');
    expect(f.Surname).toBe('');
    expect(f.Email).toBe('');
    expect(f.Attending).toBe('');
    expect(f.Diet).toBe('None');
    expect(f.otherDiet).toBe('');
    expect(f.Allergy).toBe('None');
    expect(f.Song).toBe('');
    expect(component.message).toBe('');
    expect(component.eventId).toBe('');
    expect(component.eventIdEntered).toBeFalse();
    expect(component.eventCode).toBe('');
    expect(component.storyData).toBeNull();
  });

  // --- Form Submission Tests ---
  it('should show error when submitting with empty name', async () => {
    const alertSpy = spyOn(window, 'alert');
    component.formData.Name = '';
    component.formData.Surname = '';
    component.eventId = 'test-event-id';

    await component.onSubmit();

    expect(alertSpy).toHaveBeenCalledWith('Name field cannot be empty ❌');
    expect(component.message).toBe('Please enter your full name ❌');
  });

  it('should show error when guest not found', async () => {
    const alertSpy = spyOn(window, 'alert');
    component.formData.Name = 'John';
    component.formData.Surname = 'Doe';
    component.eventId = 'test-event-id';

    // Mock empty result
    mockGetDocs.and.returnValue(Promise.resolve(mockQuerySnapshot()));

    await component.onSubmit();

    expect(component.message).toBe('Guest not apart of wedding party ❌');
    expect(alertSpy).toHaveBeenCalledWith('The name you entered is not apart of the wedding party❌');
  });

  it('should update RSVP successfully when guest exists', async () => {
    const alertSpy = spyOn(window, 'alert');
    component.formData.Name = 'John';
    component.formData.Surname = 'Doe';
    component.formData.Email = 'john@example.com';
    component.formData.Attending = 'Yes';
    component.formData.Diet = 'Vegetarian';
    component.formData.otherDiet = '';
    component.formData.Allergy = 'None';
    component.formData.Song = 'Test Song';
    component.eventId = 'test-event-id';

    // Mock guest found
    const mockGuestData = [
      {
        id: 'guest-123',
        data: {
          Name: 'John Doe',
          EventID: 'test-event-id'
        }
      }
    ];
    mockGetDocs.and.returnValue(Promise.resolve(mockQuerySnapshot(mockGuestData)));

    await component.onSubmit();

    expect(mockUpdateDoc).toHaveBeenCalledWith(mockDocRef, {
      Email: 'john@example.com',
      Dietary: 'Vegetarian',
      Allergies: 'None',
      Song: 'Test Song',
      RSVPstatus: true
    });
    expect(component.message).toBe('RSVP updated successfully ✅');
    expect(alertSpy).toHaveBeenCalledWith('You are successfully RSVPed ✅');
  });

  it('should use otherDiet when provided instead of Diet', async () => {
    component.formData.Name = 'John';
    component.formData.Surname = 'Doe';
    component.formData.Email = 'john@example.com';
    component.formData.Attending = 'Yes';
    component.formData.Diet = 'Other';
    component.formData.otherDiet = 'Custom Vegan Diet';
    component.formData.Allergy = 'Peanuts';
    component.formData.Song = '';
    component.eventId = 'test-event-id';

    const mockGuestData = [
      {
        id: 'guest-123',
        data: {
          Name: 'John Doe',
          EventID: 'test-event-id'
        }
      }
    ];
    mockGetDocs.and.returnValue(Promise.resolve(mockQuerySnapshot(mockGuestData)));

    await component.onSubmit();

    expect(mockUpdateDoc).toHaveBeenCalledWith(mockDocRef, jasmine.objectContaining({
      Dietary: 'Custom Vegan Diet',
      Allergies: 'Peanuts'
    }));
  });

  it('should handle "No" for attendance correctly', async () => {
    component.formData.Name = 'John';
    component.formData.Surname = 'Doe';
    component.formData.Attending = 'No';
    component.eventId = 'test-event-id';

    const mockGuestData = [
      {
        id: 'guest-123',
        data: {
          Name: 'John Doe',
          EventID: 'test-event-id'
        }
      }
    ];
    mockGetDocs.and.returnValue(Promise.resolve(mockQuerySnapshot(mockGuestData)));

    await component.onSubmit();

    expect(mockUpdateDoc).toHaveBeenCalledWith(mockDocRef, jasmine.objectContaining({
      RSVPstatus: false
    }));
  });

  it('should handle errors during form submission', async () => {
    component.formData.Name = 'John';
    component.formData.Surname = 'Doe';
    component.formData.Attending = 'Yes';
    component.eventId = 'test-event-id';

    mockGetDocs.and.returnValue(Promise.reject(new Error('Database error')));

    await component.onSubmit();

    expect(component.message).toBe('Something went wrong ❌');
  });

  // --- Event Code Submission Tests ---
  it('should alert when event code is empty', async () => {
    const alertSpy = spyOn(window, 'alert');
    component.eventCode = '';

    await component.submitEventCode();

    expect(alertSpy).toHaveBeenCalledWith('Please enter a valid Event Code ');
    expect(component.eventIdEntered).toBeFalse();
  });

  it('should set eventIdEntered and fetch story when valid code is found', async () => {
    component.eventCode = 'VALID123';

    const mockEventData = [
      {
        id: 'event-123',
        data: {
          RSVPcode: 'VALID123',
          EventID: 'event-user-id'
        }
      }
    ];

    const mockStoryData = [
      {
        data: {
          title: 'Our Love Story',
          content: 'We met in college and fell in love...'
        }
      }
    ];

    let callCount = 0;
    mockGetDocs.and.callFake(() => {
      callCount++;
      return callCount === 1
        ? Promise.resolve(mockQuerySnapshot(mockEventData))
        : Promise.resolve(mockQuerySnapshot(mockStoryData));
    });

    await component.submitEventCode();

    expect(component.eventIdEntered).toBeTrue();
    expect(component.message).toBe('');
    expect(component.storyData).toEqual({
      title: 'Our Love Story',
      content: 'We met in college and fell in love...'
    });
  });

  it('should handle no story found for event', async () => {
    component.eventCode = 'VALID123';

    const mockEventData = [
      {
        id: 'event-123',
        data: {
          RSVPcode: 'VALID123',
          EventID: 'event-user-id'
        }
      }
    ];

    let callCount = 0;
    mockGetDocs.and.callFake(() => {
      callCount++;
      return callCount === 1
        ? Promise.resolve(mockQuerySnapshot(mockEventData))
        : Promise.resolve(mockQuerySnapshot([])); // Empty story
    });

    await component.submitEventCode();

    expect(component.eventIdEntered).toBeTrue();
    expect(component.storyData).toBeNull();
  });

  it('should handle event code not found', async () => {
    const alertSpy = spyOn(window, 'alert');
    component.eventCode = 'INVALID123';

    mockGetDocs.and.returnValue(Promise.resolve(mockQuerySnapshot([])));

    await component.submitEventCode();

    expect(alertSpy).toHaveBeenCalledWith('Event Code not found. Please try again');
    expect(component.eventIdEntered).toBeFalse();
    expect(component.message).toBe('Event Code not found ❌');
  });

  it('should handle errors during event code submission', async () => {
    component.eventCode = 'TEST123';

    mockGetDocs.and.returnValue(Promise.reject(new Error('Network error')));

    await component.submitEventCode();

    expect(component.eventIdEntered).toBeFalse();
    expect(component.message).toBe('Error checking Event Code ❌');
  });

  // --- Navigation Tests ---
  it('should navigate to landing page after successful RSVP', fakeAsync(async () => {
    component.formData.Name = 'John';
    component.formData.Surname = 'Doe';
    component.formData.Attending = 'Yes';
    component.eventId = 'test-event-id';

    const mockGuestData = [
      {
        id: 'guest-123',
        data: {
          Name: 'John Doe',
          EventID: 'test-event-id'
        }
      }
    ];
    mockGetDocs.and.returnValue(Promise.resolve(mockQuerySnapshot(mockGuestData)));

    await component.onSubmit();
    tick(2000);

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/landing']);
  }));

  // --- Getter Tests ---
  it('should return router instance', () => {
    const router = component.getRouter();
    expect(router).toBe(mockRouter);
  });

  it('should return firestore instance', () => {
    const db = component.getDBforTesting();
    expect(db).toBe(mockFirestore);
  });

  // --- Edge Case Tests ---
  it('should handle name with only spaces as empty', async () => {
    const alertSpy = spyOn(window, 'alert');
    component.formData.Name = '   ';
    component.formData.Surname = '   ';
    component.eventId = 'test-event-id';

    await component.onSubmit();

    expect(alertSpy).toHaveBeenCalledWith('Name field cannot be empty ❌');
    expect(component.message).toBe('Please enter your full name ❌');
  });
});
