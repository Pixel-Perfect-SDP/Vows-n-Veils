import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';

// Import Firebase services
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';

// Import the component (standalone)
import { Admin } from './admin';

describe('Admin Component', () => {
  let fixture: ComponentFixture<Admin>;
  let comp: Admin;
  let router: Router;
  let mockFirestore: jasmine.SpyObj<Firestore>;
  let mockAuth: jasmine.SpyObj<Auth>;

  const mockUser = { uid: 'user123' };
  const mockVendor = { id: 'vendor1', name: 'Vendor A', status: 'pending' };
  const mockVenue = { id: 'venue1', name: 'Venue A', status: 'pending' };

  // Create manual mocks for Firebase functions
  let mockGetAuth: jasmine.Spy;
  let mockSignOut: jasmine.Spy;
  let mockGetFirestore: jasmine.Spy;
  let mockCollection: jasmine.Spy;
  let mockDoc: jasmine.Spy;
  let mockGetDocs: jasmine.Spy;
  let mockUpdateDoc: jasmine.Spy;
  let mockWhere: jasmine.Spy;
  let mockQuery: jasmine.Spy;

  beforeEach(async () => {
    // Create spy objects for Firebase standalone functions
    mockGetAuth = jasmine.createSpy('getAuth');
    mockSignOut = jasmine.createSpy('signOut');
    mockGetFirestore = jasmine.createSpy('getFirestore');
    mockCollection = jasmine.createSpy('collection');
    mockDoc = jasmine.createSpy('doc');
    mockGetDocs = jasmine.createSpy('getDocs');
    mockUpdateDoc = jasmine.createSpy('updateDoc');
    mockWhere = jasmine.createSpy('where');
    mockQuery = jasmine.createSpy('query');

    // Create spy objects for Firebase services
    const firestoreSpy = jasmine.createSpyObj('Firestore', [], {
      app: {},
      type: 'firestore',
      toJSON: () => ({})
    });

    const authSpy = jasmine.createSpyObj('Auth', [], {
      currentUser: mockUser,
      app: {},
      name: 'auth',
      config: {},
      toJSON: () => ({})
    });

    mockFirestore = firestoreSpy;
    mockAuth = authSpy;

    // Setup default return values for mocks
    mockGetAuth.and.returnValue(mockAuth);
    mockSignOut.and.returnValue(Promise.resolve());
    mockGetFirestore.and.returnValue(mockFirestore);
    mockCollection.and.returnValue({} as any);
    mockDoc.and.returnValue({} as any);
    mockGetDocs.and.returnValue(Promise.resolve({ docs: [] } as any));
    mockUpdateDoc.and.returnValue(Promise.resolve());
    mockWhere.and.returnValue({} as any);
    mockQuery.and.returnValue({} as any);

    // Import and spy on the actual modules after setting up mocks
    const AuthModule = await import('@angular/fire/auth');
    const FirestoreModule = await import('@angular/fire/firestore');

    // Spy on the actual exported functions
    spyOn(AuthModule, 'getAuth').and.callFake(mockGetAuth);
    spyOn(AuthModule, 'signOut').and.callFake(mockSignOut);
    spyOn(FirestoreModule, 'getFirestore').and.callFake(mockGetFirestore);
    spyOn(FirestoreModule, 'collection').and.callFake(mockCollection);
    spyOn(FirestoreModule, 'doc').and.callFake(mockDoc);
    spyOn(FirestoreModule, 'getDocs').and.callFake(mockGetDocs);
    spyOn(FirestoreModule, 'updateDoc').and.callFake(mockUpdateDoc);
    spyOn(FirestoreModule, 'where').and.callFake(mockWhere);
    spyOn(FirestoreModule, 'query').and.callFake(mockQuery);

    await TestBed.configureTestingModule({
      imports: [Admin],
      providers: [
        { provide: Firestore, useValue: mockFirestore },
        { provide: Auth, useValue: mockAuth }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(Admin);
    comp = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    // Clean up spies
    if (mockGetAuth) (mockGetAuth as any).calls?.reset();
    if (mockSignOut) (mockSignOut as any).calls?.reset();
    if (mockGetFirestore) (mockGetFirestore as any).calls?.reset();
    if (mockCollection) (mockCollection as any).calls?.reset();
    if (mockDoc) (mockDoc as any).calls?.reset();
    if (mockGetDocs) (mockGetDocs as any).calls?.reset();
    if (mockUpdateDoc) (mockUpdateDoc as any).calls?.reset();
    if (mockWhere) (mockWhere as any).calls?.reset();
    if (mockQuery) (mockQuery as any).calls?.reset();
  });

  // -------------------
  // BASIC CREATION TEST
  // -------------------
  it('should create component', () => {
    expect(comp).toBeTruthy();
  });

  it('should initialize with empty arrays and loading states', () => {
    expect(comp.vendors).toEqual([]);
    expect(comp.venues).toEqual([]);
    expect(comp.loadingVendors).toBe(false);
    expect(comp.loadingVenues).toBe(false);
  });

  // -------------------
  // NGONINIT TESTS
  // -------------------
  it('should call fetchVendors and fetchVenues when user exists', fakeAsync(() => {
    const vendorsSpy = spyOn<any>(comp, 'fetchVendors').and.returnValue(Promise.resolve());
    const venuesSpy = spyOn<any>(comp, 'fetchVenues').and.returnValue(Promise.resolve());

    comp.ngOnInit();
    tick();

    expect(vendorsSpy).toHaveBeenCalled();
    expect(venuesSpy).toHaveBeenCalled();
  }));

  it('should navigate to landing when no user is returned', fakeAsync(() => {
    // Create a new mock auth instance with no user
    const mockAuthWithoutUser = jasmine.createSpyObj('Auth', [], {
      currentUser: null,
      app: {},
      name: 'auth',
      config: {},
      toJSON: () => ({})
    });

    mockGetAuth.and.returnValue(mockAuthWithoutUser);
    const navSpy = spyOn(router, 'navigateByUrl');

    comp.ngOnInit();
    tick();

    expect(navSpy).toHaveBeenCalledWith('/landing');
  }));

  // -------------------
  // FETCHVENDORS TESTS
  // -------------------
  it('should populate vendors on fetchVendors', fakeAsync(async () => {
    mockGetDocs.and.returnValue(
      Promise.resolve({
        docs: [{ id: 'vendor1', data: () => ({ name: 'Vendor A', status: 'pending' }) }],
      } as any)
    );

    await comp['fetchVendors']();
    tick();

    expect(comp.vendors.length).toBe(1);
    expect(comp.vendors[0].id).toBe('vendor1');
    expect(comp.vendors[0].name).toBe('Vendor A');
    expect(comp.vendors[0].status).toBe('pending');
  }));

  it('should handle multiple vendors with different statuses', fakeAsync(async () => {
    mockGetDocs.and.returnValue(
      Promise.resolve({
        docs: [
          { id: 'vendor1', data: () => ({ name: 'Vendor A', status: 'pending' }) },
          { id: 'vendor2', data: () => ({ name: 'Vendor B', status: 'approved' }) },
          { id: 'vendor3', data: () => ({ name: 'Vendor C', status: 'rejected' }) },
        ],
      } as any)
    );

    await comp['fetchVendors']();
    tick();

    expect(comp.vendors.length).toBe(3);
    expect(comp.vendors[0].status).toBe('pending');
    expect(comp.vendors[1].status).toBe('approved');
    expect(comp.vendors[2].status).toBe('rejected');
  }));

  it('should skip vendors with missing data', fakeAsync(async () => {
    mockGetDocs.and.returnValue(
      Promise.resolve({
        docs: [
          { id: 'vendorX', data: () => undefined },
          { id: 'vendorY', data: () => null },
          { id: 'vendorZ', data: () => ({}) }, // empty object
        ],
      } as any)
    );

    await comp['fetchVendors']();
    tick();

    expect(comp.vendors).toEqual([]);
  }));

  it('should handle fetchVendors error', fakeAsync(async () => {
    mockGetDocs.and.returnValue(Promise.reject('Firestore error'));
    const consoleSpy = spyOn(console, 'error');

    await comp['fetchVendors']();
    tick();

    expect(consoleSpy).toHaveBeenCalled();
    expect(comp.vendors).toEqual([]);
  }));

  it('should set loading state during fetchVendors', fakeAsync(async () => {
    mockGetDocs.and.returnValue(
      Promise.resolve({
        docs: [{ id: 'vendor1', data: () => ({ name: 'Vendor A', status: 'pending' }) }],
      } as any)
    );

    const promise = comp['fetchVendors']();

    // Check loading state is true during fetch
    expect(comp.loadingVendors).toBe(true);

    await promise;
    tick();

    // Check loading state is false after fetch
    expect(comp.loadingVendors).toBe(false);
  }));

  // -------------------
  // FETCHVENUES TESTS
  // -------------------
  it('should populate venues on fetchVenues', fakeAsync(async () => {
    mockGetDocs.and.returnValue(
      Promise.resolve({
        docs: [{ id: 'venue1', data: () => ({ name: 'Venue A', status: 'approved' }) }],
      } as any)
    );

    await comp['fetchVenues']();
    tick();

    expect(comp.venues.length).toBe(1);
    expect(comp.venues[0].id).toBe('venue1');
    expect(comp.venues[0].name).toBe('Venue A');
    expect(comp.venues[0].status).toBe('approved');
  }));

  it('should handle multiple venues with different statuses', fakeAsync(async () => {
    mockGetDocs.and.returnValue(
      Promise.resolve({
        docs: [
          { id: 'venue1', data: () => ({ name: 'Venue A', status: 'pending' }) },
          { id: 'venue2', data: () => ({ name: 'Venue B', status: 'approved' }) },
          { id: 'venue3', data: () => ({ name: 'Venue C', status: 'rejected' }) },
        ],
      } as any)
    );

    await comp['fetchVenues']();
    tick();

    expect(comp.venues.length).toBe(3);
    expect(comp.venues[0].status).toBe('pending');
    expect(comp.venues[1].status).toBe('approved');
    expect(comp.venues[2].status).toBe('rejected');
  }));

  it('should skip venues with missing data', fakeAsync(async () => {
    mockGetDocs.and.returnValue(
      Promise.resolve({
        docs: [
          { id: 'venueX', data: () => undefined },
          { id: 'venueY', data: () => null },
          { id: 'venueZ', data: () => ({ name: null, status: null }) }, // null values
        ],
      } as any)
    );

    await comp['fetchVenues']();
    tick();

    expect(comp.venues).toEqual([]);
  }));

  it('should handle fetchVenues error', fakeAsync(async () => {
    mockGetDocs.and.returnValue(Promise.reject('Firestore error'));
    const consoleSpy = spyOn(console, 'error');

    await comp['fetchVenues']();
    tick();

    expect(consoleSpy).toHaveBeenCalled();
    expect(comp.venues).toEqual([]);
  }));

  it('should set loading state during fetchVenues', fakeAsync(async () => {
    mockGetDocs.and.returnValue(
      Promise.resolve({
        docs: [{ id: 'venue1', data: () => ({ name: 'Venue A', status: 'pending' }) }],
      } as any)
    );

    const promise = comp['fetchVenues']();

    // Check loading state is true during fetch
    expect(comp.loadingVenues).toBe(true);

    await promise;
    tick();

    // Check loading state is false after fetch
    expect(comp.loadingVenues).toBe(false);
  }));

  // -------------------
  // CHANGESTATUS TESTS
  // -------------------
  it('should update vendor status correctly', fakeAsync(async () => {
    comp.vendors = [{ id: 'vendor1', name: 'Vendor A', status: 'pending' }];

    await comp.changeStatus('Vendors', 'vendor1', 'approved');
    tick();

    expect(comp.vendors[0].status).toBe('approved');
    expect(mockUpdateDoc).toHaveBeenCalled();
  }));

  it('should update venue status correctly', fakeAsync(async () => {
    comp.venues = [{ id: 'venue1', name: 'Venue A', status: 'pending' }];

    await comp.changeStatus('Venues', 'venue1', 'approved');
    tick();

    expect(comp.venues[0].status).toBe('approved');
    expect(mockUpdateDoc).toHaveBeenCalled();
  }));

  it('should handle all possible status changes for vendors', fakeAsync(async () => {
    comp.vendors = [
      { id: 'vendor1', name: 'Vendor A', status: 'pending' }
    ];

    const statusChanges = ['approved', 'rejected', 'pending'];

    for (const newStatus of statusChanges) {
      await comp.changeStatus('Vendors', 'vendor1', newStatus);
      expect(comp.vendors[0].status).toBe(newStatus);
    }
  }));

  it('should handle all possible status changes for venues', fakeAsync(async () => {
    comp.venues = [
      { id: 'venue1', name: 'Venue A', status: 'pending' }
    ];

    const statusChanges = ['approved', 'rejected', 'pending'];

    for (const newStatus of statusChanges) {
      await comp.changeStatus('Venues', 'venue1', newStatus);
      expect(comp.venues[0].status).toBe(newStatus);
    }
  }));

  it('should handle changeStatus with lowercase collection name (no update)', fakeAsync(async () => {
    comp.vendors = [{ id: 'vendor1', name: 'Vendor A', status: 'pending' }];

    await comp.changeStatus('vendors', 'vendor1', 'approved');
    tick();

    expect(comp.vendors[0].status).toBe('pending'); // unchanged
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  }));

  it('should handle changeStatus with unknown collection name', fakeAsync(async () => {
    comp.vendors = [{ id: 'vendor1', name: 'Vendor A', status: 'pending' }];

    await comp.changeStatus('UnknownCollection', 'vendor1', 'approved');
    tick();

    expect(comp.vendors[0].status).toBe('pending'); // unchanged
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  }));

  it('should handle changeStatus when item not found', fakeAsync(async () => {
    comp.vendors = [{ id: 'vendor1', name: 'Vendor A', status: 'pending' }];

    await comp.changeStatus('Vendors', 'nonexistent', 'approved');
    tick();

    // Should not throw error and should not call updateDoc since item not found
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  }));

  it('should log error when updateDoc fails', fakeAsync(async () => {
    mockUpdateDoc.and.returnValue(Promise.reject('Update error'));
    const consoleSpy = spyOn(console, 'error');

    comp.vendors = [{ id: 'vendor1', name: 'Vendor A', status: 'pending' }];

    await comp.changeStatus('Vendors', 'vendor1', 'approved');
    tick();

    expect(consoleSpy).toHaveBeenCalledWith('Error updating status: ', 'Update error');
  }));

  it('should handle empty arrays in changeStatus', fakeAsync(async () => {
    comp.vendors = [];
    comp.venues = [];

    await comp.changeStatus('Vendors', 'vendor1', 'approved');
    await comp.changeStatus('Venues', 'venue1', 'approved');
    tick();

    expect(mockUpdateDoc).not.toHaveBeenCalled();
  }));

  // -------------------
  // LOGOUT TESTS
  // -------------------
  it('should sign out and navigate to landing', fakeAsync(async () => {
    const navSpy = spyOn(router, 'navigate');

    comp.logout();
    tick();

    expect(mockSignOut).toHaveBeenCalled();
    expect(navSpy).toHaveBeenCalledWith(['/landing']);
  }));

  it('should handle logout errors gracefully', fakeAsync(async () => {
    mockSignOut.and.returnValue(Promise.reject('Logout error'));
    const consoleSpy = spyOn(console, 'error');

    comp.logout();
    tick();

    expect(consoleSpy).toHaveBeenCalledWith('Logout error', 'Logout error');
  }));

  it('should allow calling logout multiple times', fakeAsync(async () => {
    const navSpy = spyOn(router, 'navigate');

    comp.logout();
    tick();
    comp.logout();
    tick();

    expect(mockSignOut).toHaveBeenCalledTimes(2);
    expect(navSpy).toHaveBeenCalledTimes(2);
  }));

  // -------------------
  // TEMPLATE COVERAGE
  // -------------------
  it('should render loading state for vendors', () => {
    comp.loadingVendors = true;
    comp.vendors = [];
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Loading');
  });

  it('should render loading state for venues', () => {
    comp.loadingVenues = true;
    comp.venues = [];
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Loading');
  });

  it('should render vendors list when not loading', () => {
    comp.loadingVendors = false;
    comp.vendors = [mockVendor];
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Vendor A');
  });

  it('should render venues list when not loading', () => {
    comp.loadingVenues = false;
    comp.venues = [mockVenue];
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Venue A');
  });

  it('should render empty state when no vendors', () => {
    comp.loadingVendors = false;
    comp.vendors = [];
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('No vendors');
  });

  it('should render empty state when no venues', () => {
    comp.loadingVenues = false;
    comp.venues = [];
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('No venues');
  });

  it('should render status buttons for vendors', () => {
    comp.loadingVendors = false;
    comp.vendors = [mockVendor];
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('button')).toBeTruthy();
  });

  it('should render status buttons for venues', () => {
    comp.loadingVenues = false;
    comp.venues = [mockVenue];
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('button')).toBeTruthy();
  });

  // -------------------
  // EDGE CASES
  // -------------------
  it('should handle null or undefined in component arrays', () => {
    comp.vendors = null as any;
    comp.venues = undefined as any;

    expect(comp.vendors).toBeNull();
    expect(comp.venues).toBeUndefined();
  });

  it('should handle very long vendor/venue names', fakeAsync(async () => {
    const longName = 'A'.repeat(1000);
    mockGetDocs.and.returnValue(
      Promise.resolve({
        docs: [{ id: 'vendor1', data: () => ({ name: longName, status: 'pending' }) }],
      } as any)
    );

    await comp['fetchVendors']();
    tick();

    expect(comp.vendors[0].name).toBe(longName);
    expect(comp.vendors[0].name.length).toBe(1000);
  }));

  it('should handle special characters in names', fakeAsync(async () => {
    const specialName = 'Vendor @#$%^&*()_+{}[]|:;"<>,.?/~`';
    mockGetDocs.and.returnValue(
      Promise.resolve({
        docs: [{ id: 'vendor1', data: () => ({ name: specialName, status: 'pending' }) }],
      } as any)
    );

    await comp['fetchVendors']();
    tick();

    expect(comp.vendors[0].name).toBe(specialName);
  }));

  // -------------------
  // METHOD ACCESSIBILITY TESTS
  // -------------------
  it('should have publicly accessible methods', () => {
    expect(typeof comp.changeStatus).toBe('function');
    expect(typeof comp.logout).toBe('function');
    expect(typeof comp.ngOnInit).toBe('function');
  });

  // -------------------
  // COMPONENT STATE TESTS
  // -------------------
  it('should maintain separate state for vendors and venues', () => {
    comp.vendors = [mockVendor];
    comp.venues = [mockVenue];

    expect(comp.vendors.length).toBe(1);
    expect(comp.venues.length).toBe(1);
    expect(comp.vendors[0].id).toBe('vendor1');
    expect(comp.venues[0].id).toBe('venue1');
  });

  // -------------------
  // FIREBASE INTERACTION TESTS
  // -------------------
  it('should call Firestore collection with correct parameters', fakeAsync(async () => {
    await comp['fetchVendors']();
    tick();

    expect(mockCollection).toHaveBeenCalled();
  }));

  it('should call Firestore doc with correct parameters when updating status', fakeAsync(async () => {
    comp.vendors = [{ id: 'vendor1', name: 'Vendor A', status: 'pending' }];

    await comp.changeStatus('Vendors', 'vendor1', 'approved');
    tick();

    expect(mockDoc).toHaveBeenCalled();
  }));

  // -------------------
  // ERROR BOUNDARY TESTS
  // -------------------
  it('should not throw when methods are called with invalid parameters', async () => {
    await expectAsync(comp.changeStatus(null as any, null as any, null as any)).toBeResolved();
    await expectAsync(comp.logout()).toBeResolved();
  });

  it('should handle concurrent status changes', fakeAsync(async () => {
    comp.vendors = [
      { id: 'vendor1', name: 'Vendor A', status: 'pending' },
      { id: 'vendor2', name: 'Vendor B', status: 'pending' }
    ];

    // Start multiple status changes
    const promise1 = comp.changeStatus('Vendors', 'vendor1', 'approved');
    const promise2 = comp.changeStatus('Vendors', 'vendor2', 'rejected');

    await Promise.all([promise1, promise2]);
    tick();

    expect(comp.vendors[0].status).toBe('approved');
    expect(comp.vendors[1].status).toBe('rejected');
  }));

  // -------------------
  // INITIALIZATION EDGE CASES
  // -------------------
  it('should handle component initialization with existing data', () => {
    comp.vendors = [mockVendor];
    comp.venues = [mockVenue];

    expect(comp.vendors.length).toBe(1);
    expect(comp.venues.length).toBe(1);
  });

  it('should handle duplicate vendor/venue IDs', fakeAsync(async () => {
    mockGetDocs.and.returnValue(
      Promise.resolve({
        docs: [
          { id: 'vendor1', data: () => ({ name: 'Vendor A', status: 'pending' }) },
          { id: 'vendor1', data: () => ({ name: 'Vendor B', status: 'approved' }) }, // duplicate ID
        ],
      } as any)
    );

    await comp['fetchVendors']();
    tick();

    // Should handle duplicates gracefully
    expect(comp.vendors.length).toBe(2);
    expect(comp.vendors[0].id).toBe('vendor1');
    expect(comp.vendors[1].id).toBe('vendor1');
  }));

  // -------------------
  // DATA PERSISTENCE TESTS
  // -------------------
  it('should preserve vendor data when updating status', fakeAsync(async () => {
    const originalVendor = { id: 'vendor1', name: 'Vendor A', status: 'pending', description: 'Test vendor' };
    comp.vendors = [originalVendor];

    await comp.changeStatus('Vendors', 'vendor1', 'approved');
    tick();

    expect(comp.vendors[0].status).toBe('approved');
    expect(comp.vendors[0].name).toBe('Vendor A'); // name should be preserved
    expect(comp.vendors[0].description).toBe('Test vendor'); // other properties should be preserved
  }));

  it('should preserve venue data when updating status', fakeAsync(async () => {
    const originalVenue = { id: 'venue1', name: 'Venue A', status: 'pending', capacity: 100 };
    comp.venues = [originalVenue];

    await comp.changeStatus('Venues', 'venue1', 'rejected');
    tick();

    expect(comp.venues[0].status).toBe('rejected');
    expect(comp.venues[0].name).toBe('Venue A'); // name should be preserved
    expect(comp.venues[0].capacity).toBe(100); // other properties should be preserved
  }));
});
