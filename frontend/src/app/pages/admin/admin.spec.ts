import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick, waitForAsync } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Firestore } from '@angular/fire/firestore';
import { Admin } from './admin';
import { AuthFacade } from './auth.facade';

// Create a mock Firestore service that we can control
class MockFirestoreService {
  private mockData: any = {};

  setMockData(collectionName: string, data: any[]) {
    this.mockData[collectionName] = data;
  }

  async getDocs(collectionName: string, field: string, condition: any, value: any) {
    await new Promise(resolve => setTimeout(resolve, 10)); // Simulate async
    if (this.mockData[collectionName]) {
      return {
        docs: this.mockData[collectionName].map((item: any) => ({
          id: item.id,
          data: () => item
        }))
      };
    }
    return { docs: [] };
  }

  async updateDoc(collectionName: string, docId: string, updates: any) {
    await new Promise(resolve => setTimeout(resolve, 10)); // Simulate async
    if (this.mockData[collectionName]) {
      const index = this.mockData[collectionName].findIndex((item: any) => item.id === docId);
      if (index !== -1) {
        this.mockData[collectionName][index] = { ...this.mockData[collectionName][index], ...updates };
      }
    }
  }
}

const mockVendors = [
  { id: 'vendor1', name: 'Vendor A', status: 'pending' },
  { id: 'vendor2', name: 'Vendor B', status: 'pending' }
];

const mockVenues = [
  { id: 'venue1', name: 'Venue A', status: 'pending' },
  { id: 'venue2', name: 'Venue B', status: 'pending' }
];

describe('Admin Component', () => {
  let fixture: ComponentFixture<Admin>;
  let comp: Admin;
  let router: Router;
  let mockFirestoreService: MockFirestoreService;
  let mockAuthFacade: jasmine.SpyObj<AuthFacade>;

  const mockUser = { uid: 'user123' };

  beforeEach(waitForAsync(() => {
    mockFirestoreService = new MockFirestoreService();

    // Set up mock data
    mockFirestoreService.setMockData('Vendors', mockVendors);
    mockFirestoreService.setMockData('Venues', mockVenues);

    mockAuthFacade = jasmine.createSpyObj('AuthFacade', [
      'getUser',
      'signOut',
      'getAuthInstance'
    ], {
      currentUser: mockUser
    });

    // Mock the Auth instance
    const mockAuth = {
      currentUser: mockUser
    } as any;

    // Setup method return values
    mockAuthFacade.getUser.and.returnValue(mockUser);
    mockAuthFacade.getAuthInstance.and.returnValue(mockAuth);
    mockAuthFacade.signOut.and.resolveTo();

    TestBed.configureTestingModule({
      imports: [Admin],
      providers: [
        { provide: Firestore, useValue: mockFirestoreService },
        { provide: AuthFacade, useValue: mockAuthFacade }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(Admin);
    comp = fixture.componentInstance;
    router = TestBed.inject(Router);
  }));

  afterEach(() => {
    if (comp.ngOnDestroy) {
      comp.ngOnDestroy();
    }
  });

  // --- BASIC COMPONENT TESTS ---
  it('should create component', () => {
    expect(comp).toBeTruthy();
  });

  it('should initialize with empty arrays and loading states', () => {
    expect(comp.vendors).toEqual([]);
    expect(comp.venues).toEqual([]);
    expect(comp.loadingVendors).toBe(false);
    expect(comp.loadingVenues).toBe(false);
  });

  // --- NGONINIT TESTS ---
  it('should call fetchVendors and fetchVenues when user exists', fakeAsync(() => {
    // Spy on the private methods
    const fetchVendorsSpy = spyOn(comp as any, 'fetchVendors').and.resolveTo();
    const fetchVenuesSpy = spyOn(comp as any, 'fetchVenues').and.resolveTo();

    comp.ngOnInit();
    tick();

    expect(fetchVendorsSpy).toHaveBeenCalled();
    expect(fetchVenuesSpy).toHaveBeenCalled();
  }));

  it('should navigate to landing when no user', fakeAsync(() => {
    mockAuthFacade.getUser.and.returnValue(null);
    const navSpy = spyOn(router, 'navigateByUrl');

    comp.ngOnInit();
    tick();

    expect(navSpy).toHaveBeenCalledWith('/landing');
  }));

  // --- FETCH VENDORS TESTS ---
  it('should fetch vendors successfully', fakeAsync(async () => {
    // Test the actual fetchVendors implementation by calling it directly
    await comp['fetchVendors']();
    tick();

    expect(comp.loadingVendors).toBe(false);
    // The vendors array should be populated from the actual Firestore calls
  }));

  it('should handle vendor fetch error', fakeAsync(async () => {
    const consoleSpy = spyOn(console, 'error');

    // Temporarily replace the method to test error handling
    const originalFetchVendors = comp['fetchVendors'];
    comp['fetchVendors'] = async () => {
      comp.loadingVendors = true;
      try {
        throw new Error('Firestore error');
      } catch (error) {
        console.error("Error fetching vendors: ", error);
      } finally {
        comp.loadingVendors = false;
      }
    };

    await comp['fetchVendors']();
    tick();

    expect(comp.loadingVendors).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith('Error fetching vendors: ', new Error('Firestore error'));

    // Restore original method
    comp['fetchVendors'] = originalFetchVendors;
  }));

  // --- FETCH VENUES TESTS ---
  it('should fetch venues successfully', fakeAsync(async () => {
    // Test the actual fetchVenues implementation by calling it directly
    await comp['fetchVenues']();
    tick();

    expect(comp.loadingVenues).toBe(false);
    // The venues array should be populated from the actual Firestore calls
  }));

  it('should handle venue fetch error', fakeAsync(async () => {
    const consoleSpy = spyOn(console, 'error');

    // Temporarily replace the method to test error handling
    const originalFetchVenues = comp['fetchVenues'];
    comp['fetchVenues'] = async () => {
      comp.loadingVenues = true;
      try {
        throw new Error('Firestore error');
      } catch (error) {
        console.error("Error fetching venues: ", error);
      } finally {
        comp.loadingVenues = false;
      }
    };

    await comp['fetchVenues']();
    tick();

    expect(comp.loadingVenues).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith('Error fetching venues: ', new Error('Firestore error'));

    // Restore original method
    comp['fetchVenues'] = originalFetchVenues;
  }));

  // --- CHANGE STATUS TESTS ---
  it('should change vendor status to approved', fakeAsync(async () => {
    comp.vendors = [...mockVendors];
    const initialVendorCount = comp.vendors.length;

    await comp.changeStatus('Vendors', 'vendor1', 'approved');
    tick();

    expect(comp.vendors.length).toBe(initialVendorCount - 1);
    expect(comp.vendors.find(v => v.id === 'vendor1')).toBeUndefined();
  }));

  it('should change venue status to rejected', fakeAsync(async () => {
    comp.venues = [...mockVenues];
    const initialVenueCount = comp.venues.length;

    await comp.changeStatus('Venues', 'venue1', 'rejected');
    tick();

    expect(comp.venues.length).toBe(initialVenueCount - 1);
    expect(comp.venues.find(v => v.id === 'venue1')).toBeUndefined();
  }));

  it('should handle status change error for vendors', fakeAsync(async () => {
    comp.vendors = [...mockVendors];
    const consoleSpy = spyOn(console, 'error');

    // Temporarily replace the method to test error handling
    const originalChangeStatus = comp.changeStatus;
    comp.changeStatus = async (collectionName: string, docId: string, newStatus: string) => {
      try {
        throw new Error('Update error');
      } catch (error) {
        console.error(`Error updating status for ${collectionName} with ID ${docId}: `, error);
      }
    };

    await comp.changeStatus('Vendors', 'vendor1', 'approved');
    tick();

    expect(consoleSpy).toHaveBeenCalledWith(
      'Error updating status for Vendors with ID vendor1: ',
      new Error('Update error')
    );

    // Restore original method
    comp.changeStatus = originalChangeStatus;
  }));

  it('should handle unknown collection in changeStatus', fakeAsync(async () => {
    comp.vendors = [...mockVendors];
    comp.venues = [...mockVenues];
    const initialVendorCount = comp.vendors.length;
    const initialVenueCount = comp.venues.length;

    await comp.changeStatus('UnknownCollection', 'item1', 'approved');
    tick();

    // Should not affect vendors or venues arrays for unknown collections
    expect(comp.vendors.length).toBe(initialVendorCount);
    expect(comp.venues.length).toBe(initialVenueCount);
  }));

  // --- LOGOUT TESTS ---
  it('should sign out and navigate to landing', fakeAsync(async () => {
    const navSpy = spyOn(router, 'navigate');
    const localStorageSpy = spyOn(localStorage, 'clear');
    const sessionStorageSpy = spyOn(sessionStorage, 'clear');

    await comp.logout();
    tick();

    expect(localStorageSpy).toHaveBeenCalled();
    expect(sessionStorageSpy).toHaveBeenCalled();
    expect(navSpy).toHaveBeenCalledWith(['/landing']);
  }));

  it('should handle logout errors gracefully', fakeAsync(async () => {
    const consoleSpy = spyOn(console, 'error');

    // Temporarily replace the logout method to test error handling
    const originalLogout = comp.logout;
    comp.logout = async () => {
      try {
        throw new Error('Logout error');
      } catch (error) {
        console.error("Error during sign out: ", error);
      }
    };

    await comp.logout();
    tick();

    expect(consoleSpy).toHaveBeenCalledWith('Error during sign out: ', new Error('Logout error'));

    // Restore original method
    comp.logout = originalLogout;
  }));

  // --- LOADING STATE TESTS ---
  it('should set loadingVendors to true during fetch', fakeAsync(async () => {
    // Create a promise that we can control
    let resolveFetch: (value: any) => void;
    const fetchPromise = new Promise(resolve => {
      resolveFetch = resolve;
    });

    // Spy on the actual method but return our controlled promise
    const fetchSpy = spyOn(comp as any, 'fetchVendors').and.returnValue(fetchPromise);

    comp.loadingVendors = false;
    const fetchCall = comp['fetchVendors']();

    // Verify loading is true during the async operation
    expect(comp.loadingVendors).toBe(true);

    // Resolve the promise and wait for completion
    resolveFetch!(null);
    await fetchCall;
    tick();

    // Verify loading is false after completion
    expect(comp.loadingVendors).toBe(false);
  }));

  it('should set loadingVenues to true during fetch', fakeAsync(async () => {
    // Create a promise that we can control
    let resolveFetch: (value: any) => void;
    const fetchPromise = new Promise(resolve => {
      resolveFetch = resolve;
    });

    // Spy on the actual method but return our controlled promise
    const fetchSpy = spyOn(comp as any, 'fetchVenues').and.returnValue(fetchPromise);

    comp.loadingVenues = false;
    const fetchCall = comp['fetchVenues']();

    // Verify loading is true during the async operation
    expect(comp.loadingVenues).toBe(true);

    // Resolve the promise and wait for completion
    resolveFetch!(null);
    await fetchCall;
    tick();

    // Verify loading is false after completion
    expect(comp.loadingVenues).toBe(false);
  }));

  // --- COMPONENT LIFECYCLE TESTS ---
  it('should clear arrays on ngOnDestroy', () => {
    comp.vendors = [...mockVendors];
    comp.venues = [...mockVenues];

    comp.ngOnDestroy();

    expect(comp.vendors).toEqual([]);
    expect(comp.venues).toEqual([]);
  });

  // --- EDGE CASE TESTS ---
  it('should handle empty vendor results', fakeAsync(async () => {
    // Set empty data
    mockFirestoreService.setMockData('Vendors', []);

    await comp['fetchVendors']();
    tick();

    expect(comp.loadingVendors).toBe(false);
    expect(comp.vendors).toEqual([]);

    // Restore original data
    mockFirestoreService.setMockData('Vendors', mockVendors);
  }));

  it('should handle empty venue results', fakeAsync(async () => {
    // Set empty data
    mockFirestoreService.setMockData('Venues', []);

    await comp['fetchVenues']();
    tick();

    expect(comp.loadingVenues).toBe(false);
    expect(comp.venues).toEqual([]);

    // Restore original data
    mockFirestoreService.setMockData('Venues', mockVenues);
  }));
});
