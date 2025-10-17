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

  const activeVenue = {
    id: 'v1',
    venuename: 'Active Hall',
    address: '123 Street',
    capacity: 200,
    companyID: 'c1',
    description: 'Nice venue',
    email: 'x@y.com',
    phonenumber: '123',
    price: 1000,
    status: 'active',
    image: 'img',
    images: [{ url: 'u', name: 'n' }]
  };

  const inactiveVenue = { ...activeVenue, id: 'v2', venuename: 'Inactive', status: 'inactive' };

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

  describe('ngOnInit', () => {
    it('runs immediate flow when user exists', fakeAsync(() => {
      mockAuth.currentUser = { uid: 'u1' };
      mockHttpClient.get.and.returnValue(of([activeVenue, inactiveVenue]));

      component.ngOnInit();
      tick();

      expect(mockHttpClient.get).toHaveBeenCalledWith('https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues');
      expect(component.venues.length).toBe(1);
      expect(component.loading).toBeFalse();
      expect((component as any).collection).toHaveBeenCalledWith(mockDb, 'VenuesOrders');
    }));

    it('subscribes to onAuthStateChanged when user not present', fakeAsync(() => {
      mockAuth.currentUser = null;
      const mockOnAuthStateChanged = jasmine.createSpy('onAuthStateChanged').and.callFake((_auth: any, cb: (u: any) => void) => {
        cb({ uid: 'u2' });
      });
      (component as any).onAuthStateChanged = mockOnAuthStateChanged;
      mockHttpClient.get.and.returnValue(of([activeVenue]));

      component.ngOnInit();
      tick();

      expect(mockOnAuthStateChanged).toHaveBeenCalled();
      expect(component.venues.length).toBe(1);
    }));
  });

  describe('getVenues', () => {
    it('loads active venues on success', fakeAsync(() => {
      mockHttpClient.get.and.returnValue(of([activeVenue, inactiveVenue]));

      component.getVenues();
      tick();

      expect(component.loading).toBeFalse();
      expect(component.venues.map(v => v.id)).toEqual(['v1']);
    }));

    it('sets error on failure', fakeAsync(() => {
      mockHttpClient.get.and.returnValue(throwError(() => new Error('Failed to load venues')));

      component.getVenues();
      tick();

      expect(component.loading).toBeFalse();
      expect(component.error).toContain('Failed to load venues');
    }));
  });

  describe('viewVenue', () => {
    it('loads selected venue on success', fakeAsync(() => {
      mockHttpClient.get.and.returnValue(of(activeVenue));

      component.viewVenue('v1');
      tick();

      expect(component.selectedVenue?.id).toBe('v1');
      expect(component.loading).toBeFalse();
    }));

    it('sets error on failure', fakeAsync(() => {
      mockHttpClient.get.and.returnValue(throwError(() => new Error('Failed to load venue')));

      component.viewVenue('bad');
      tick();

      expect(component.error).toContain('Failed to load venue');
      expect(component.loading).toBeFalse();
    }));
  });

  it('backToList clears selectedVenue', () => {
    component.selectedVenue = activeVenue as any;
    component.backToList();
    expect(component.selectedVenue).toBeNull();
  });

  describe('selectVenue', () => {
    it('returns early when no user', fakeAsync(() => {
      mockAuth.currentUser = null;
      component.selectVenue('v1');
      tick();
      expect(component.loading).toBeFalse();
      expect((component as any).getDocs).not.toHaveBeenCalled();
    }));

    it('handles empty events query', fakeAsync(() => {
      mockAuth.currentUser = { uid: 'u1' };
      (component as any).getDocs.and.returnValue(Promise.resolve({ empty: true, docs: [] }));

      component.selectVenue('v1');
      tick();

      expect((component as any).getDocs).toHaveBeenCalled();
      expect(component.loading).toBeFalse();
    }));

    it('updates event doc and sets chosen fields in finally', fakeAsync(() => {
      mockAuth.currentUser = { uid: 'u1' };
      component.selectedVenue = activeVenue as any;

      const fakeDoc = { id: 'doc1', data: () => ({ VenueID: 'old' }) };
      (component as any).getDocs.and.returnValue(Promise.resolve({ empty: false, docs: [fakeDoc] }));
      (component as any).updateDoc.and.returnValue(Promise.resolve());

      component.selectVenue('v1');
      tick();

      expect((component as any).updateDoc).toHaveBeenCalled();
      expect(component.chosenVenueName).toBe('Active Hall');
      expect(component.chosenVenueID).toBe('v1');
      expect(component.chosenVenuecompanyID).toBe('c1');
      expect(component.loading).toBeFalse();
    }));

    it('catches updateDoc error but still sets finally fields', fakeAsync(() => {
      mockAuth.currentUser = { uid: 'u1' };
      component.selectedVenue = activeVenue as any;
      const fakeDoc = { id: 'doc1', data: () => ({}) };

      (component as any).getDocs.and.returnValue(Promise.resolve({ empty: false, docs: [fakeDoc] }));
      (component as any).updateDoc.and.returnValue(Promise.reject(new Error('fail')));

      spyOn(console, 'error'); // Spy to catch error logging
      component.selectVenue('v1');
      tick();

      expect(console.error).toHaveBeenCalledWith(jasmine.any(Error));
      expect(component.chosenVenueName).toBe('Active Hall');
      expect(component.chosenVenueID).toBe('v1');
      expect(component.chosenVenuecompanyID).toBe('c1');
      expect(component.loading).toBeFalse();
    }));
  });

  describe('getChosenVenue', () => {
    it('clears when no user', () => {
      mockAuth.currentUser = null;
      component.getChosenVenue();
      expect(component.chosenVenueID).toBeNull();
      expect(component.chosenVenueName).toBeNull();
      expect(component.chosenVenuecompanyID).toBeNull();
    });

    it('clears when query empty', fakeAsync(() => {
      mockAuth.currentUser = { uid: 'u1' };
      (component as any).getDocs.and.returnValue(Promise.resolve({ empty: true, docs: [] }));

      component.getChosenVenue();
      tick();

      expect(component.chosenVenueID).toBeNull();
    }));

    it('clears when no VenueID', fakeAsync(() => {
      mockAuth.currentUser = { uid: 'u1' };
      const fakeDoc = { data: () => ({}) };
      (component as any).getDocs.and.returnValue(Promise.resolve({ empty: false, docs: [fakeDoc] }));

      component.getChosenVenue();
      tick();

      expect(component.chosenVenueID).toBeNull();
    }));

    it('loads chosen venue when venueId exists', fakeAsync(() => {
      mockAuth.currentUser = { uid: 'u1' };
      const fakeDoc = { data: () => ({ VenueID: 'v1' }) };
      (component as any).getDocs.and.returnValue(Promise.resolve({ empty: false, docs: [fakeDoc] }));
      mockHttpClient.get.and.returnValue(of(activeVenue));

      component.getChosenVenue();
      tick();

      expect(component.chosenVenueID).toBe('v1');
      expect(component.chosenVenuecompanyID).toBe('c1');
      expect(component.chosenVenueName).toBe('Active Hall');
    }));

    it('handles http error for chosen venue', fakeAsync(() => {
      mockAuth.currentUser = { uid: 'u1' };
      const fakeDoc = { data: () => ({ VenueID: 'v1' }) };
      (component as any).getDocs.and.returnValue(Promise.resolve({ empty: false, docs: [fakeDoc] }));
      mockHttpClient.get.and.returnValue(throwError(() => new Error('HTTP error')));

      component.getChosenVenue();
      tick();

      expect(component.chosenVenueID).toBeNull();
      expect(component.chosenVenueName).toBeNull();
      expect(component.chosenVenuecompanyID).toBeNull();
    }));

    it('catch on getDocs failure', fakeAsync(() => {
      mockAuth.currentUser = { uid: 'u1' };
      (component as any).getDocs.and.returnValue(Promise.reject(new Error('bad')));

      spyOn(console, 'error');
      component.getChosenVenue();
      tick();

      expect(console.error).toHaveBeenCalledWith(jasmine.any(Error));
      expect(component.chosenVenueID).toBeNull();
      expect(component.loading).toBeFalse();
    }));
  });

  describe('backTohome', () => {
    it('navigates to /homepage', fakeAsync(() => {
      component.backTohome();
      tick();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/homepage']);
    }));
  });

  describe('confirmVenue', () => {
    beforeEach(() => {
      const btn = document.createElement('button');
      btn.className = 'btn-confirm';
      document.body.appendChild(btn);
    });

    afterEach(() => {
      const btn = document.querySelector('.btn-confirm');
      btn?.remove();
    });

    it('returns early when no user or missing chosen IDs', fakeAsync(() => {
      mockAuth.currentUser = null;
      component.confirmVenue();
      tick();
      expect(component.loading).toBeFalse();

      mockAuth.currentUser = { uid: 'u1' };
      component.chosenVenueID = null;
      component.chosenVenuecompanyID = 'c1';
      component.confirmVenue();
      tick();
      expect(component.loading).toBeFalse();

      component.chosenVenueID = 'v1';
      component.chosenVenuecompanyID = null;
      component.confirmVenue();
      tick();
      expect(component.loading).toBeFalse();
    }));

    it('alerts when no event found', fakeAsync(() => {
      mockAuth.currentUser = { uid: 'u1' };
      component.chosenVenueID = 'v1';
      component.chosenVenuecompanyID = 'c1';

      (component as any).getDocs.and.returnValue(Promise.resolve({ empty: true, docs: [] }));
      const alertSpy = spyOn(window, 'alert');

      component.confirmVenue();
      tick();

      expect(alertSpy).toHaveBeenCalledWith('No event found.');
      expect(component.loading).toBeFalse();
    }));

    it('cancels when user does not confirm', fakeAsync(() => {
      mockAuth.currentUser = { uid: 'u1' };
      component.chosenVenueID = 'v1';
      component.chosenVenuecompanyID = 'c1';

      const fakeEventDoc = {
        data: () => ({ Date_Time: { toDate: () => new Date() }, guestsNum: 120 })
      };
      (component as any).getDocs.and.returnValue(Promise.resolve({ empty: false, docs: [fakeEventDoc] }));
      spyOn(window, 'confirm').and.returnValue(false);

      component.confirmVenue();
      tick();

      expect(component.loading).toBeFalse();
    }));

    it('alerts when event missing Date_Time', fakeAsync(() => {
      mockAuth.currentUser = { uid: 'u1' };
      component.chosenVenueID = 'v1';
      component.chosenVenuecompanyID = 'c1';

      const fakeEventDoc = { data: () => ({}) };
      (component as any).getDocs.and.returnValue(Promise.resolve({ empty: false, docs: [fakeEventDoc] }));

      spyOn(window, 'confirm').and.returnValue(true);
      const alertSpy = spyOn(window, 'alert');

      component.confirmVenue();
      tick();

      expect(alertSpy).toHaveBeenCalledWith('Event does not have a wedding date set.');
      expect(component.loading).toBeFalse();
    }));

    it('posts order successfully and dims button', fakeAsync(() => {
      mockAuth.currentUser = { uid: 'u1' };
      component.chosenVenueID = 'v1';
      component.chosenVenuecompanyID = 'c1';

      const eventDate = new Date();
      const fakeEventDoc = {
        data: () => ({ Date_Time: { toDate: () => eventDate }, guestsNum: 200 })
      };
      (component as any).getDocs.and.returnValue(Promise.resolve({ empty: false, docs: [fakeEventDoc] }));
      mockHttpClient.post.and.returnValue(of({ ok: true, orderID: 'o1' }));

      spyOn(window, 'confirm').and.returnValue(true);
      const alertSpy = spyOn(window, 'alert');

      component.confirmVenue();
      tick();

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues/confirm-order',
        jasmine.objectContaining({
          customerID: 'u1',
          venueID: 'v1',
          companyID: 'c1'
        })
      );

      const btn = document.querySelector('.btn-confirm') as HTMLElement;
      expect(btn.style.opacity).toBe('0.3');
      expect(alertSpy).toHaveBeenCalledWith('Venue order created! Waiting for confirmation.');
      expect(component.loading).toBeFalse();
    }));

    it('handles http error on order', fakeAsync(() => {
      mockAuth.currentUser = { uid: 'u1' };
      component.chosenVenueID = 'v1';
      component.chosenVenuecompanyID = 'c1';

      const eventDate = new Date();
      const fakeEventDoc = {
        data: () => ({ Date_Time: { toDate: () => eventDate }, guestsNum: 200 })
      };
      (component as any).getDocs.and.returnValue(Promise.resolve({ empty: false, docs: [fakeEventDoc] }));
      mockHttpClient.post.and.returnValue(throwError(() => new Error('Failed')));

      spyOn(window, 'confirm').and.returnValue(true);
      const alertSpy = spyOn(window, 'alert');

      component.confirmVenue();
      tick();

      expect(alertSpy).toHaveBeenCalledWith('Failed');
      expect(component.loading).toBeFalse();
    }));
  });

  describe('checkVenueOrder', () => {
    it('returns when no user', fakeAsync(() => {
      mockAuth.currentUser = null;
      component.checkVenueOrder();
      tick();
      expect((component as any).collection).not.toHaveBeenCalled();
    }));

    it('sets hasExistingOrder correctly', fakeAsync(() => {
      mockAuth.currentUser = { uid: 'u1' };
      (component as any).getDocs.and.returnValue(Promise.resolve({ empty: true, docs: [] }));
      component.checkVenueOrder();
      tick();
      expect(component.hasExistingOrder).toBeFalse();

      (component as any).getDocs.and.returnValue(Promise.resolve({ empty: false, docs: [{}] }));
      component.checkVenueOrder();
      tick();
      expect(component.hasExistingOrder).toBeTrue();
    }));
  });

  describe('getRecommendations', () => {
    it('clears when no user', fakeAsync(() => {
      mockAuth.currentUser = null;
      component.getRecommendations();
      tick();
      expect(component.recommendedVenues).toEqual([]);
      expect(component.loading).toBeFalse();
    }));

    it('clears when event doc does not exist', fakeAsync(() => {
      mockAuth.currentUser = { uid: 'u1' };
      (component as any).getDocs.and.callFake((qArg: any) => {
        if ((qArg?.ref?.name || qArg?.name) === 'Guests') return Promise.resolve({ size: 10 });
        return Promise.resolve({ empty: true, docs: [] });
      });
      (component as any).getDoc.and.returnValue(Promise.resolve({ exists: () => false }));

      component.getRecommendations();
      tick();

      expect(component.recommendedVenues).toEqual([]);
      expect(component.loading).toBeFalse();
    }));

    it('clears when no budget', fakeAsync(() => {
      mockAuth.currentUser = { uid: 'u1' };
      (component as any).getDocs.and.returnValue(Promise.resolve({ size: 50 }));
      (component as any).getDoc.and.returnValue(Promise.resolve({ exists: () => true, data: () => ({ budget: null }) }));

      component.getRecommendations();
      tick();

      expect(component.recommendedVenues).toEqual([]);
    }));

    it('clears when venues response is falsy', fakeAsync(() => {
      mockAuth.currentUser = { uid: 'u1' };
      (component as any).getDocs.and.returnValue(Promise.resolve({ size: 50 }));
      (component as any).getDoc.and.returnValue(Promise.resolve({ exists: () => true, data: () => ({ budget: 1500 }) }));
      mockHttpClient.get.and.returnValue(of(null));

      component.getRecommendations();
      tick();

      expect(component.recommendedVenues).toEqual([]);
    }));

    it('filters active venues by budget and capacity', fakeAsync(() => {
      mockAuth.currentUser = { uid: 'u1' };
      (component as any).getDocs.and.returnValue(Promise.resolve({ size: 180 }));
      (component as any).getDoc.and.returnValue(Promise.resolve({ exists: () => true, data: () => ({ budget: 1200 }) }));
      mockHttpClient.get.and.returnValue(of([
        activeVenue,
        { ...activeVenue, id: 'v3', price: 1300 },
        { ...activeVenue, id: 'v4', capacity: 100 },
        inactiveVenue
      ]));

      component.getRecommendations();
      tick();

      expect(component.recommendedVenues.map(v => v.id)).toEqual(['v1']);
      expect(component.loading).toBeFalse();
    }));

    it('handles catch error gracefully', fakeAsync(() => {
      mockAuth.currentUser = { uid: 'u1' };
      (component as any).getDocs.and.returnValue(Promise.reject(new Error('boom')));

      spyOn(console, 'error');
      component.getRecommendations();
      tick();

      expect(console.error).toHaveBeenCalledWith(jasmine.any(Error));
      expect(component.recommendedVenues).toEqual([]);
      expect(component.error).toBe('boom');
      expect(component.loading).toBeFalse();
    }));
  });
});