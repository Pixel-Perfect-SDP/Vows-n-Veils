import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClient } from '@angular/common/http';
import { of, throwError, firstValueFrom } from 'rxjs';
import { Component } from '@angular/core';
import { Venues } from './venues';

// Create dummy components for routing
@Component({ template: '' })
class DummyHomeComponent { }

@Component({ template: '' })
class DummyLandingComponent { }

@Component({ template: '' })
class DummyComponent { }

describe('Venues', () => {
  let component: Venues;
  let fixture: ComponentFixture<Venues>;
  let mockRouter: any;
  let mockHttpClient: any;
  let mockAuth: any;
  let mockDb: any;

  const mockVenue = {
    id: 'venue-1',
    venuename: 'Test Venue',
    address: 'Test Address',
    capacity: 100,
    companyID: 'company-1',
    description: 'Test Description',
    email: 'test@venue.com',
    phonenumber: '1234567890',
    price: 5000,
    status: 'active',
    image: 'test-image.jpg',
    images: [{ url: 'image1.jpg', name: 'Image 1' }]
  };

  beforeEach(async () => {
    mockRouter = {
      navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true)),
      navigateByUrl: jasmine.createSpy('navigateByUrl').and.returnValue(Promise.resolve(true))
    };

    mockHttpClient = {
      get: jasmine.createSpy('get').and.returnValue(of([])),
      post: jasmine.createSpy('post').and.returnValue(of({ ok: true, orderID: 'order-123' }))
    };

    mockAuth = {
      currentUser: { uid: 'test-user-123' }
    };

    mockDb = {};

    await TestBed.configureTestingModule({
      imports: [
        Venues,
        RouterTestingModule.withRoutes([
          { path: 'homepage', component: DummyHomeComponent },
          { path: 'landing', component: DummyLandingComponent },
          { path: 'manageservices', component: DummyComponent }
        ])
      ],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: HttpClient, useValue: mockHttpClient },
        { provide: ActivatedRoute, useValue: {} }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Venues);
    component = fixture.componentInstance;

    // Override private/protected properties with mocks
    (component as any).router = mockRouter;
    (component as any).http = mockHttpClient;
    (component as any).auth = mockAuth;
    (component as any).db = mockDb;

    // Mock Firebase collection, query, and document functions
    (component as any).collection = jasmine.createSpy('collection').and.returnValue({});
    (component as any).query = jasmine.createSpy('query').and.returnValue({});
    (component as any).where = jasmine.createSpy('where').and.returnValue({});
    (component as any).doc = jasmine.createSpy('doc').and.returnValue({});
    
    (component as any).getDocs = jasmine.createSpy('getDocs').and.returnValue(Promise.resolve({
      empty: true,
      docs: []
    }));
    
    (component as any).getDoc = jasmine.createSpy('getDoc').and.returnValue(Promise.resolve({
      exists: () => false,
      data: () => ({})
    }));
    
    (component as any).updateDoc = jasmine.createSpy('updateDoc').and.returnValue(Promise.resolve());

    // Set initial loading state to false for most tests
    component.loading = false;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    fixture = TestBed.createComponent(Venues);
    component = fixture.componentInstance;

    expect(component.venues).toEqual([]);
    expect(component.selectedVenue).toBeNull();
    expect(component.loading).toBeTrue();
    expect(component.error).toBeNull();
    expect(component.chosenVenueName).toBeNull();
    expect(component.chosenVenueID).toBeNull();
    expect(component.chosenVenuecompanyID).toBeNull();
    expect(component.hasExistingOrder).toBeFalse();
    expect(component.userBudget).toBeNull();
    expect(component.recommendedVenues).toEqual([]);
  });

  it('should get venues successfully', fakeAsync(() => {
    const mockVenues = [mockVenue, { ...mockVenue, id: 'venue-2', status: 'inactive' }];
    mockHttpClient.get.and.returnValue(of(mockVenues));

    component.loading = false;
    component.getVenues();
    
    expect(component.loading).toBeTrue();
    
    tick();

    expect(mockHttpClient.get).toHaveBeenCalledWith('https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues');
    expect(component.venues.length).toBe(1);
    expect(component.venues[0].status).toBe('active');
    expect(component.loading).toBeFalse();
  }));

  it('should handle get venues error', fakeAsync(() => {
    mockHttpClient.get.and.returnValue(throwError(() => new Error('API error')));

    component.getVenues();
    tick();

    expect(component.error).toContain('Failed to load venues');
    expect(component.loading).toBeFalse();
  }));

  it('should handle null venues response in getVenues', fakeAsync(() => {
    mockHttpClient.get.and.returnValue(of([]));

    component.getVenues();
    tick();

    expect(component.venues).toEqual([]);
    expect(component.loading).toBeFalse();
  }));

  it('should view venue details successfully', fakeAsync(() => {
    mockHttpClient.get.and.returnValue(of(mockVenue));

    component.viewVenue('venue-1');
    expect(component.loading).toBeTrue();

    tick();

    expect(mockHttpClient.get).toHaveBeenCalledWith('https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues/venue-1');
    expect(component.selectedVenue).toEqual(mockVenue);
    expect(component.loading).toBeFalse();
  }));

  it('should handle view venue error', fakeAsync(() => {
    mockHttpClient.get.and.returnValue(throwError(() => new Error('Venue not found')));

    component.viewVenue('venue-1');
    tick();

    expect(component.error).toContain('Failed to load venue');
    expect(component.loading).toBeFalse();
  }));

  it('should navigate back to list', () => {
    component.selectedVenue = mockVenue;

    component.backToList();

    expect(component.selectedVenue).toBeNull();
  });

  it('should navigate back to homepage', () => {
    component.backTohome();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/homepage']);
  });

  it('should handle ngOnInit with immediate user', fakeAsync(() => {
    spyOn(component, 'getChosenVenue');
    spyOn(component, 'checkVenueOrder');
    spyOn(component, 'getRecommendations');
    spyOn(component, 'getVenues');

    component.ngOnInit();
    tick();

    expect(component.getVenues).toHaveBeenCalled();
  }));

  it('should handle select venue with no user', fakeAsync(() => {
    mockAuth.currentUser = null;

    component.selectVenue('venue-1');
    tick();

    expect(component.loading).toBeFalse();
  }));

  it('should select venue successfully', fakeAsync(() => {
    component.selectedVenue = mockVenue;
    mockAuth.currentUser = { uid: 'test-user-123' };

    const mockQuerySnapshot = {
      empty: false,
      docs: [{
        id: 'event-1',
        data: () => ({ EventID: 'test-user-123' })
      }]
    };

    (component as any).getDocs.and.returnValue(Promise.resolve(mockQuerySnapshot));
    (component as any).updateDoc.and.returnValue(Promise.resolve());

    component.selectVenue('venue-1');
    tick();

    expect((component as any).getDocs).toHaveBeenCalled();
    expect((component as any).updateDoc).toHaveBeenCalled();
    expect(component.chosenVenueName).toBe('Test Venue');
    expect(component.chosenVenueID).toBe('venue-1');
    expect(component.chosenVenuecompanyID).toBe('company-1');
  }));

  it('should handle select venue with empty event query', fakeAsync(() => {
    mockAuth.currentUser = { uid: 'test-user-123' };
    (component as any).getDocs.and.returnValue(Promise.resolve({ empty: true, docs: [] }));

    component.selectVenue('venue-1');
    tick();

    expect(component.loading).toBeFalse();
  }));

  it('should handle select venue Firestore error', fakeAsync(() => {
    mockAuth.currentUser = { uid: 'test-user-123' };
    spyOn(console, 'error');

    (component as any).getDocs.and.returnValue(Promise.reject(new Error('Firestore error')));

    component.selectVenue('venue-1');
    tick();

    expect(console.error).toHaveBeenCalledWith('Error fetching events:', jasmine.any(Error));
    expect(component.loading).toBeFalse();
  }));

  it('should handle updateDoc error in selectVenue', fakeAsync(() => {
    spyOn(console, 'error');
    mockAuth.currentUser = { uid: 'test-user-123' };

    component.selectedVenue = mockVenue;
    const mockQuerySnapshot = {
      empty: false,
      docs: [{
        id: 'event-1',
        data: () => ({ EventID: 'test-user-123' })
      }]
    };

    (component as any).getDocs.and.returnValue(Promise.resolve(mockQuerySnapshot));
    (component as any).updateDoc.and.returnValue(Promise.reject(new Error('Update error')));

    component.selectVenue('venue-1');
    tick();

    expect(console.error).toHaveBeenCalledWith('Error updating VenueID:', jasmine.any(Error));
    expect(component.loading).toBeFalse();
  }));

  it('should handle get chosen venue with no user', fakeAsync(() => {
    mockAuth.currentUser = null;

    component.getChosenVenue();
    tick();

    expect(component.chosenVenueName).toBeNull();
    expect(component.chosenVenueID).toBeNull();
    expect(component.chosenVenuecompanyID).toBeNull();
  }));

  it('should get chosen venue successfully', fakeAsync(() => {
    mockAuth.currentUser = { uid: 'test-user-123' };

    const mockQuerySnapshot = {
      empty: false,
      docs: [{
        id: 'event-1',
        data: () => ({
          EventID: 'test-user-123',
          VenueID: 'venue-1'
        })
      }]
    };

    (component as any).getDocs.and.returnValue(Promise.resolve(mockQuerySnapshot));
    mockHttpClient.get.and.returnValue(of(mockVenue));

    component.getChosenVenue();
    tick();

    expect(component.chosenVenueName).toBe('Test Venue');
    expect(component.chosenVenueID).toBe('venue-1');
    expect(component.chosenVenuecompanyID).toBe('company-1');
  }));

  it('should handle get chosen venue with no VenueID', fakeAsync(() => {
    mockAuth.currentUser = { uid: 'test-user-123' };

    const mockQuerySnapshot = {
      empty: false,
      docs: [{
        id: 'event-1',
        data: () => ({ EventID: 'test-user-123' })
      }]
    };

    (component as any).getDocs.and.returnValue(Promise.resolve(mockQuerySnapshot));

    component.getChosenVenue();
    tick();

    expect(component.chosenVenueName).toBeNull();
    expect(component.chosenVenueID).toBeNull();
    expect(component.chosenVenuecompanyID).toBeNull();
  }));

  it('should handle get chosen venue HTTP error', fakeAsync(() => {
    mockAuth.currentUser = { uid: 'test-user-123' };

    const mockQuerySnapshot = {
      empty: false,
      docs: [{
        id: 'event-1',
        data: () => ({ EventID: 'test-user-123', VenueID: 'venue-1' })
      }]
    };

    (component as any).getDocs.and.returnValue(Promise.resolve(mockQuerySnapshot));
    mockHttpClient.get.and.returnValue(throwError(() => new Error('HTTP error')));

    component.getChosenVenue();
    tick();

    expect(component.chosenVenueName).toBeNull();
    expect(component.chosenVenueID).toBeNull();
    expect(component.chosenVenuecompanyID).toBeNull();
  }));

  it('should handle Firestore errors in getChosenVenue', fakeAsync(() => {
    mockAuth.currentUser = { uid: 'test-user-123' };
    spyOn(console, 'error');

    (component as any).getDocs.and.returnValue(Promise.reject(new Error('Firestore error')));

    component.getChosenVenue();
    tick();

    expect(component.chosenVenueName).toBeNull();
    expect(component.chosenVenueID).toBeNull();
    expect(component.chosenVenuecompanyID).toBeNull();
  }));

  it('should handle confirm venue with no user', fakeAsync(() => {
    mockAuth.currentUser = null;

    component.confirmVenue();
    tick();

    expect(mockHttpClient.post).not.toHaveBeenCalled();
  }));

  it('should handle confirm venue with no chosen venue', fakeAsync(() => {
    component.chosenVenueID = null;
    component.chosenVenuecompanyID = null;

    component.confirmVenue();
    tick();

    expect(mockHttpClient.post).not.toHaveBeenCalled();
  }));

  it('should confirm venue successfully', fakeAsync(() => {
    mockAuth.currentUser = { uid: 'test-user-123' };
    component.chosenVenueID = 'venue-1';
    component.chosenVenuecompanyID = 'company-1';
    component.weddingDate = new Date('2024-12-25');

    const mockQuerySnapshot = {
      empty: false,
      docs: [{
        id: 'event-1',
        data: () => ({
          Date_Time: { toDate: () => new Date('2024-12-25') },
          guestsNum: 150
        })
      }]
    };

    (component as any).getDocs.and.returnValue(Promise.resolve(mockQuerySnapshot));
    mockHttpClient.post.and.returnValue(of({ ok: true, orderID: 'order-123' }));

    spyOn(window, 'confirm').and.returnValue(true);
    spyOn(window, 'alert');

    component.confirmVenue();
    tick();

    expect(mockHttpClient.post).toHaveBeenCalledWith(
      'https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues/confirm-order',
      jasmine.objectContaining({
        customerID: 'test-user-123',
        venueID: 'venue-1',
        companyID: 'company-1'
      })
    );
  }));

  it('should handle confirm venue cancellation', fakeAsync(() => {
    mockAuth.currentUser = { uid: 'test-user-123' };
    component.chosenVenueID = 'venue-1';
    component.chosenVenuecompanyID = 'company-1';

    const mockQuerySnapshot = {
      empty: false,
      docs: [{
        id: 'event-1',
        data: () => ({
          Date_Time: { toDate: () => new Date('2024-12-25') },
          guestsNum: 150
        })
      }]
    };

    (component as any).getDocs.and.returnValue(Promise.resolve(mockQuerySnapshot));

    spyOn(window, 'confirm').and.returnValue(false);

    component.confirmVenue();
    tick();

    expect(mockHttpClient.post).not.toHaveBeenCalled();
  }));

  it('should handle confirm venue with no wedding date', fakeAsync(() => {
    mockAuth.currentUser = { uid: 'test-user-123' };
    component.chosenVenueID = 'venue-1';
    component.chosenVenuecompanyID = 'company-1';

    const mockQuerySnapshot = {
      empty: false,
      docs: [{
        id: 'event-1',
        data: () => ({
          guestsNum: 150
        })
      }]
    };

    (component as any).getDocs.and.returnValue(Promise.resolve(mockQuerySnapshot));

    spyOn(window, 'confirm').and.returnValue(true);
    spyOn(window, 'alert');

    component.confirmVenue();
    tick();

    expect(window.alert).toHaveBeenCalledWith('Event does not have a wedding date set.');
    expect(mockHttpClient.post).not.toHaveBeenCalled();
  }));

  it('should handle confirm venue API error', fakeAsync(() => {
    mockAuth.currentUser = { uid: 'test-user-123' };
    component.chosenVenueID = 'venue-1';
    component.chosenVenuecompanyID = 'company-1';

    const mockQuerySnapshot = {
      empty: false,
      docs: [{
        id: 'event-1',
        data: () => ({
          Date_Time: { toDate: () => new Date('2024-12-25') },
          guestsNum: 150
        })
      }]
    };

    (component as any).getDocs.and.returnValue(Promise.resolve(mockQuerySnapshot));
    mockHttpClient.post.and.returnValue(throwError(() => new Error('API error')));

    spyOn(window, 'confirm').and.returnValue(true);

    component.confirmVenue();
    tick();

    expect(component.loading).toBeFalse();
  }));

  it('should handle check venue order with no user', fakeAsync(() => {
    mockAuth.currentUser = null;

    component.checkVenueOrder();
    tick();

    expect(component.hasExistingOrder).toBeFalse();
  }));

  it('should set hasExistingOrder to true when orders exist', fakeAsync(() => {
    mockAuth.currentUser = { uid: 'test-user-123' };

    const mockQuerySnapshot = {
      empty: false,
      docs: [{
        id: 'order-1',
        data: () => ({ customerID: 'test-user-123' })
      }]
    };

    (component as any).getDocs.and.returnValue(Promise.resolve(mockQuerySnapshot));

    component.checkVenueOrder();
    tick();

    expect(component.hasExistingOrder).toBeTrue();
  }));

  it('should set hasExistingOrder to false when no orders exist', fakeAsync(() => {
    mockAuth.currentUser = { uid: 'test-user-123' };

    const mockQuerySnapshot = {
      empty: true,
      docs: []
    };

    (component as any).getDocs.and.returnValue(Promise.resolve(mockQuerySnapshot));

    component.checkVenueOrder();
    tick();

    expect(component.hasExistingOrder).toBeFalse();
  }));

  it('should handle get recommendations with no user', fakeAsync(() => {
    mockAuth.currentUser = null;

    component.getRecommendations();
    tick();

    expect(component.recommendedVenues).toEqual([]);
    expect(component.loading).toBeFalse();
  }));

  it('should get recommendations successfully', fakeAsync(() => {
    mockAuth.currentUser = { uid: 'test-user-123' };

    const mockGuestSnapshot = {
      empty: false,
      size: 50,
      docs: []
    };

    const mockEventSnapshot = {
      exists: () => true,
      data: () => ({ budget: 10000 })
    };

    (component as any).getDocs.and.returnValue(Promise.resolve(mockGuestSnapshot));
    (component as any).getDoc.and.returnValue(Promise.resolve(mockEventSnapshot));

    const mockVenues = [
      { ...mockVenue, price: 8000, capacity: 100, status: 'active' },
      { ...mockVenue, id: 'venue-2', price: 12000, capacity: 200, status: 'active' }
    ];

    mockHttpClient.get.and.returnValue(of(mockVenues));

    component.getRecommendations();
    tick();

    expect(component.recommendedVenues.length).toBe(1);
    expect(component.recommendedVenues[0].price).toBe(8000);
    expect(component.userBudget).toBe(10000);
    expect(component.loading).toBeFalse();
  }));

  it('should handle get recommendations with no event', fakeAsync(() => {
    mockAuth.currentUser = { uid: 'test-user-123' };

    (component as any).getDoc.and.returnValue(Promise.resolve({ exists: () => false }));

    component.getRecommendations();
    tick();

    expect(component.recommendedVenues).toEqual([]);
    expect(component.loading).toBeFalse();
  }));

  it('should handle get recommendations with no budget', fakeAsync(() => {
    mockAuth.currentUser = { uid: 'test-user-123' };

    const mockEventSnapshot = {
      exists: () => true,
      data: () => ({ budget: null })
    };

    (component as any).getDoc.and.returnValue(Promise.resolve(mockEventSnapshot));

    component.getRecommendations();
    tick();

    expect(component.recommendedVenues).toEqual([]);
    expect(component.loading).toBeFalse();
  }));

  it('should handle get recommendations API error', fakeAsync(() => {
    mockAuth.currentUser = { uid: 'test-user-123' };

    const mockGuestSnapshot = {
      empty: false,
      size: 50,
      docs: []
    };

    const mockEventSnapshot = {
      exists: () => true,
      data: () => ({ budget: 10000 })
    };

    (component as any).getDocs.and.returnValue(Promise.resolve(mockGuestSnapshot));
    (component as any).getDoc.and.returnValue(Promise.resolve(mockEventSnapshot));

    mockHttpClient.get.and.returnValue(throwError(() => new Error('Failed to load recommended venues')));

    component.getRecommendations();
    tick();

    expect(component.recommendedVenues).toEqual([]);
    expect(component.error).toContain('Failed to load recommended venues');
    expect(component.loading).toBeFalse();
  }));

  it('should filter venues by capacity in recommendations', fakeAsync(() => {
    mockAuth.currentUser = { uid: 'test-user-123' };

    const mockGuestSnapshot = {
      empty: false,
      size: 150,
      docs: []
    };

    const mockEventSnapshot = {
      exists: () => true,
      data: () => ({ budget: 10000 })
    };

    (component as any).getDocs.and.returnValue(Promise.resolve(mockGuestSnapshot));
    (component as any).getDoc.and.returnValue(Promise.resolve(mockEventSnapshot));

    const mockVenues = [
      { ...mockVenue, price: 8000, capacity: 200, status: 'active' },
      { ...mockVenue, id: 'venue-2', price: 7000, capacity: 100, status: 'active' }
    ];

    mockHttpClient.get.and.returnValue(of(mockVenues));

    component.getRecommendations();
    tick();

    expect(component.recommendedVenues.length).toBe(1);
    expect(component.recommendedVenues[0].capacity).toBe(200);
  }));
});