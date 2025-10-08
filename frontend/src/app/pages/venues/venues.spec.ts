import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA, Component } from '@angular/core';
import { Venues } from './venues';
import { collection, query, where, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebase-config';
import { onAuthStateChanged } from 'firebase/auth';

interface VenueImage {
  url: string;
  name: string;
}

interface Venue {
  id: string;
  venuename: string;
  address: string;
  capacity: number;
  companyID: string;
  description: string;
  email: string;
  phonenumber: string;
  price: number;
  status?: string;
  image?: string;
  images?: VenueImage[];
}

@Component({
  standalone: true,
  template: ''
})
class DummyComponent { }

describe('Venues', () => {
  let component: Venues;
  let fixture: ComponentFixture<Venues>;
  let mockRouter: any;
  let mockHttpClient: any;
  let mockAuth: any;
  let mockDb: any;

  const mockVenue: Venue = {
    id: 'venue-1',
    venuename: 'Test Venue',
    address: '123 Test Street',
    capacity: 150,
    companyID: 'company-1',
    description: 'A beautiful test venue',
    email: 'venue@test.com',
    phonenumber: '123-456-7890',
    price: 5000,
    status: 'active',
    images: [
      { url: 'https://example.com/image1.jpg', name: 'image1' },
      { url: 'https://example.com/image2.jpg', name: 'image2' }
    ]
  };

  const mockVenues: Venue[] = [
    mockVenue,
    {
      id: 'venue-2',
      venuename: 'Inactive Venue',
      address: '456 Test Ave',
      capacity: 100,
      companyID: 'company-2',
      description: 'An inactive venue',
      email: 'inactive@test.com',
      phonenumber: '098-765-4321',
      price: 3000,
      status: 'inactive',
      images: []
    },
    {
      id: 'venue-3',
      venuename: 'Budget Venue',
      address: '789 Budget St',
      capacity: 50,
      companyID: 'company-3',
      description: 'A budget-friendly venue',
      email: 'budget@test.com',
      phonenumber: '555-123-4567',
      price: 2000,
      status: 'active'
    }
  ];

  beforeEach(async () => {
    mockRouter = {
      navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true))
    };

    mockHttpClient = {
      get: jasmine.createSpy('get').and.returnValue(of([])),
      post: jasmine.createSpy('post').and.returnValue(of({}))
    };

    mockAuth = {
      currentUser: null,
      onAuthStateChanged: jasmine.createSpy('onAuthStateChanged').and.callFake((callback) => callback(null))
    };

    mockDb = {
      collection: jasmine.createSpy('collection').and.returnValue({}),
      query: jasmine.createSpy('query').and.returnValue({}),
      where: jasmine.createSpy('where').and.returnValue({}),
      getDocs: jasmine.createSpy('getDocs').and.returnValue(Promise.resolve({ docs: [], empty: true })),
      updateDoc: jasmine.createSpy('updateDoc').and.returnValue(Promise.resolve()),
      doc: jasmine.createSpy('doc').and.returnValue({}),
      getDoc: jasmine.createSpy('getDoc').and.returnValue(Promise.resolve({ exists: () => false }))
    };

    spyOn(console, 'log'); // Suppress console logs
    spyOn(console, 'error'); // Suppress console errors
    spyOn(window, 'alert'); // Mock alert for confirmVenue
    spyOn(window, 'confirm').and.returnValue(true); // Mock confirm dialog

    await TestBed.configureTestingModule({
      imports: [
        Venues,
        RouterTestingModule.withRoutes([
          { path: 'homepage', component: DummyComponent },   
          { path: 'landing', component: DummyComponent },
        ])
      ],
      providers: [
        { provide: HttpClient, useValue: mockHttpClient },
        { provide: auth, useValue: mockAuth },
        { provide: db, useValue: mockDb }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    const router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    fixture = TestBed.createComponent(Venues);
    component = fixture.componentInstance;

    (component as any).router = mockRouter;
    (component as any).http = mockHttpClient;
  });

  it('should initialize with default values', () => {
    expect(component.venues).toEqual([]);
    expect(component.selectedVenue).toBeNull();
    expect(component.loading).toBeTrue();
    expect(component.error).toBeNull();
    expect(component.chosenVenueName).toBeNull();
    expect(component.chosenVenueID).toBeNull();
    expect(component.chosenVenuecompanyID).toBeNull();
    expect(component.weddingDate).toBeInstanceOf(Date);
    expect(component.hasExistingOrder).toBeFalse();
    expect(component.userBudget).toBeNull();
    expect(component.recommendedVenues).toEqual([]);
  });

  it('should fetch venues successfully and filter active ones', fakeAsync(() => {
    mockHttpClient.get.and.returnValue(of(mockVenues));
    component.loading = false;

    component.getVenues();
    tick();

    expect(mockHttpClient.get).toHaveBeenCalledWith('https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues');
    expect(component.venues.length).toBe(2);
    expect(component.venues[0].status).toBe('active');
    expect(component.venues[1].status).toBe('active');
    expect(component.loading).toBeFalse();
  }));

  it('should handle getVenues error', fakeAsync(() => {
    mockHttpClient.get.and.returnValue(throwError(() => new Error('Network error')));
    component.loading = false;

    component.getVenues();
    tick();

    expect(component.error).toBe('Failed to load venues: Network error');
    expect(component.loading).toBeFalse();
  }));

  it('should set loading to true when fetching venues', () => {
    mockHttpClient.get.and.returnValue(of(mockVenues));
    component.loading = false;

    component.getVenues();
    expect(component.loading).toBeTrue();
    tick();
  });

  it('should view venue successfully', fakeAsync(() => {
    mockHttpClient.get.and.returnValue(of(mockVenue));
    component.loading = false;

    component.viewVenue('venue-1');
    tick();

    expect(mockHttpClient.get).toHaveBeenCalledWith('https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues/venue-1');
    expect(component.selectedVenue).toEqual(mockVenue);
    expect(component.loading).toBeFalse();
  }));

  it('should handle viewVenue error', fakeAsync(() => {
    mockHttpClient.get.and.returnValue(throwError(() => new Error('Venue not found')));
    component.loading = false;

    component.viewVenue('invalid-id');
    tick();

    expect(component.error).toBe('Failed to load venue: Venue not found');
    expect(component.selectedVenue).toBeNull();
    expect(component.loading).toBeFalse();
  }));

  it('should go back to venue list', () => {
    component.selectedVenue = mockVenue;

    component.backToList();

    expect(component.selectedVenue).toBeNull();
  });

  it('should navigate back to homepage', () => {
    component.backTohome();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/homepage']);
  });

  it('should filter out inactive venues', fakeAsync(() => {
    const venuesWithInactive = [
      { ...mockVenue, status: 'active' },
      { ...mockVenue, id: 'venue-2', status: 'inactive' },
      { ...mockVenue, id: 'venue-3', status: 'pending' },
      { ...mockVenue, id: 'venue-4', status: 'active' }
    ];

    mockHttpClient.get.and.returnValue(of(venuesWithInactive));
    component.loading = false;

    component.getVenues();
    tick();

    expect(component.venues.length).toBe(2);
    expect(component.venues.every(v => v.status === 'active')).toBeTrue();
  }));

  it('should handle empty venues response', fakeAsync(() => {
    mockHttpClient.get.and.returnValue(of([]));
    component.loading = false;

    component.getVenues();
    tick();

    expect(component.venues).toEqual([]);
    expect(component.loading).toBeFalse();
  }));

  it('should filter venues without status field', fakeAsync(() => {
    const venuesWithoutStatus = [
      { ...mockVenue, status: 'active' },
      { ...mockVenue, id: 'venue-2' },
      { ...mockVenue, id: 'venue-3', status: undefined },
      { ...mockVenue, id: 'venue-4', status: 'active' }
    ];

    mockHttpClient.get.and.returnValue(of(venuesWithoutStatus));
    component.loading = false;

    component.getVenues();
    tick();

    expect(component.venues.length).toBe(3);
    expect(component.venues.every(v => v.status === 'active' || v.status === undefined)).toBeTrue();
  }));

  it('should handle different venue IDs correctly', fakeAsync(() => {
    const differentVenue = { ...mockVenue, id: 'different-venue', venuename: 'Different Venue' };
    mockHttpClient.get.and.returnValue(of(differentVenue));
    component.loading = false;

    component.viewVenue('different-venue');
    tick();

    expect(mockHttpClient.get).toHaveBeenCalledWith('https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues/different-venue');
    expect(component.selectedVenue?.venuename).toBe('Different Venue');
  }));

  it('should format error messages correctly', fakeAsync(() => {
    const errorWithMessage = { message: 'Custom error message' };
    mockHttpClient.get.and.returnValue(throwError(() => errorWithMessage));
    component.loading = false;

    component.getVenues();
    tick();

    expect(component.error).toBe('Failed to load venues: Custom error message');
  }));

  it('should set loading state during viewVenue', () => {
    mockHttpClient.get.and.returnValue(of(mockVenue));
    component.loading = false;

    component.viewVenue('venue-1');
    expect(component.loading).toBeTrue();
    tick();
  });

  it('should handle multiple consecutive viewVenue calls', fakeAsync(() => {
    const venue1 = { ...mockVenue, id: 'venue-1', venuename: 'Venue 1' };
    const venue2 = { ...mockVenue, id: 'venue-2', venuename: 'Venue 2' };

    mockHttpClient.get.and.returnValues(of(venue1), of(venue2));
    component.loading = false;

    component.viewVenue('venue-1');
    tick();
    expect(component.selectedVenue?.venuename).toBe('Venue 1');

    component.viewVenue('venue-2');
    tick();
    expect(component.selectedVenue?.venuename).toBe('Venue 2');
  }));

  it('should handle venue with images correctly', fakeAsync(() => {
    const venueWithImages = {
      ...mockVenue,
      images: [
        { url: 'image1.jpg', name: 'Image 1' },
        { url: 'image2.jpg', name: 'Image 2' },
        { url: 'image3.jpg', name: 'Image 3' }
      ]
    };

    mockHttpClient.get.and.returnValue(of(venueWithImages));
    component.loading = false;

    component.viewVenue('venue-1');
    tick();

    expect(component.selectedVenue?.images?.length).toBe(3);
    expect(component.selectedVenue?.images?.[0].url).toBe('image1.jpg');
  }));

  it('should handle venue without images', fakeAsync(() => {
    const venueWithoutImages = { ...mockVenue, images: [] };
    mockHttpClient.get.and.returnValue(of(venueWithoutImages));
    component.loading = false;

    component.viewVenue('venue-1');
    tick();

    expect(component.selectedVenue?.images).toEqual([]);
  }));

  it('should handle venue with undefined images', fakeAsync(() => {
    const venueWithUndefinedImages = { ...mockVenue };
    delete venueWithUndefinedImages.images;

    mockHttpClient.get.and.returnValue(of(venueWithUndefinedImages));
    component.loading = false;

    component.viewVenue('venue-1');
    tick();

    expect(component.selectedVenue?.images).toBeUndefined();
  }));

  it('should handle HTTP error with status codes', fakeAsync(() => {
    const httpError = { status: 404, message: 'Not Found' };
    mockHttpClient.get.and.returnValue(throwError(() => httpError));
    component.loading = false;

    component.getVenues();
    tick();

    expect(component.error).toContain('Failed to load venues:');
    expect(component.loading).toBeFalse();
  }));

  it('should handle complete venue data', fakeAsync(() => {
    const completeVenue = {
      id: 'complete-venue',
      venuename: 'Complete Venue',
      address: '123 Complete St',
      capacity: 200,
      companyID: 'complete-company',
      description: 'A complete venue description',
      email: 'complete@venue.com',
      phonenumber: '123-456-7890',
      price: 10000,
      status: 'active',
      image: 'main-image.jpg',
      images: [{ url: 'image1.jpg', name: 'Image 1' }]
    };

    mockHttpClient.get.and.returnValue(of(completeVenue));
    component.loading = false;

    component.viewVenue('complete-venue');
    tick();

    expect(component.selectedVenue?.venuename).toBe('Complete Venue');
    expect(component.selectedVenue?.capacity).toBe(200);
    expect(component.selectedVenue?.price).toBe(10000);
    expect(component.selectedVenue?.email).toBe('complete@venue.com');
    expect(component.selectedVenue?.phonenumber).toBe('123-456-7890');
  }));

  it('should handle venue data with missing optional properties', fakeAsync(() => {
    const minimalVenue = {
      id: 'minimal-venue',
      venuename: 'Minimal Venue',
      address: '456 Minimal Ave',
      capacity: 50,
      companyID: 'minimal-company',
      description: 'Minimal description',
      email: 'minimal@venue.com',
      phonenumber: '098-765-4321',
      price: 2000,
      status: 'active'
    };

    mockHttpClient.get.and.returnValue(of(minimalVenue));
    component.loading = false;

    component.viewVenue('minimal-venue');
    tick();

    expect(component.selectedVenue?.image).toBeUndefined();
    expect(component.selectedVenue?.images).toBeUndefined();
    expect(component.selectedVenue?.venuename).toBe('Minimal Venue');
  }));

  it('should reset error state on successful request', fakeAsync(() => {
    component.error = 'Previous error';

    mockHttpClient.get.and.returnValue(of(mockVenues));
    component.loading = false;

    component.getVenues();
    tick();

    expect(component.venues.length).toBeGreaterThan(0);
  }));

  it('should handle concurrent getVenues calls', fakeAsync(() => {
    mockHttpClient.get.and.returnValue(of(mockVenues));
    component.loading = false;

    component.getVenues();
    component.getVenues();
    component.getVenues();

    tick();

    expect(component.venues.length).toBe(2);
    expect(component.loading).toBeFalse();
  }));

  it('should handle numeric venue properties correctly', fakeAsync(() => {
    const venueWithNumbers = {
      ...mockVenue,
      capacity: 150,
      price: 5000.50
    };

    mockHttpClient.get.and.returnValue(of(venueWithNumbers));
    component.loading = false;

    component.viewVenue('venue-1');
    tick();

    expect(typeof component.selectedVenue?.capacity).toBe('number');
    expect(typeof component.selectedVenue?.price).toBe('number');
    expect(component.selectedVenue?.capacity).toBe(150);
    expect(component.selectedVenue?.price).toBe(5000.50);
  }));

  it('should maintain proper state after error', fakeAsync(() => {
    mockHttpClient.get.and.returnValue(throwError(() => new Error('Test error')));
    component.loading = false;
    const originalVenues = [...component.venues];

    component.getVenues();
    tick();

    expect(component.loading).toBeFalse();
    expect(component.error).toContain('Failed to load venues:');
    expect(component.venues).toEqual(originalVenues);
  }));

  it('should reset loading state on viewVenue error', fakeAsync(() => {
    mockHttpClient.get.and.returnValue(throwError(() => new Error('Venue error')));
    component.loading = false;

    component.viewVenue('error-venue');
    tick();

    expect(component.loading).toBeFalse();
    expect(component.error).toBe('Failed to load venue: Venue error');
  }));

  describe('ngOnInit', () => {
    it('should handle delayed user login via onAuthStateChanged', fakeAsync(() => {
      const mockUser = { uid: 'user-1' };
      mockAuth.onAuthStateChanged.and.callFake((callback: any) => {
        callback(mockUser);
      });
      spyOn(component, 'getChosenVenue');
      spyOn(component, 'checkVenueOrder');
      spyOn(component, 'getRecommendations');
      spyOn(component, 'getVenues');

      component.ngOnInit();
      tick();

      expect(component.getChosenVenue).toHaveBeenCalled();
      expect(component.checkVenueOrder).toHaveBeenCalled();
      expect(component.getRecommendations).toHaveBeenCalled();
      expect(component.getVenues).toHaveBeenCalled();
    }));

    it('should handle no user in onAuthStateChanged', fakeAsync(() => {
      mockAuth.onAuthStateChanged.and.callFake((callback: any) => callback(null));
      spyOn(component, 'getVenues');

      component.ngOnInit();
      tick();

      expect(component.getVenues).toHaveBeenCalled();
    }));

    it('should call getVenues regardless of user state', fakeAsync(() => {
      spyOn(component, 'getVenues');

      component.ngOnInit();
      tick();

      expect(component.getVenues).toHaveBeenCalled();
    }));
  });

  describe('selectVenue', () => {
    it('should not proceed if no user is logged in', fakeAsync(() => {
      mockAuth.currentUser = null;
      component.loading = false;

      component.selectVenue('venue-1');
      tick();

      expect(console.log).toHaveBeenCalledWith('No user logged in');
      expect(mockDb.getDocs).not.toHaveBeenCalled();
      expect(component.loading).toBeFalse();
    }));

    it('should update VenueID successfully and set chosen venue properties', fakeAsync(() => {
      mockAuth.currentUser = { uid: 'user-1' };
      component.selectedVenue = mockVenue;
      const mockEventDoc = {
        id: 'event-1',
        data: () => ({ EventID: 'user-1' })
      };
      mockDb.getDocs.and.returnValue(Promise.resolve({ docs: [mockEventDoc], empty: false }));
      mockDb.doc.and.returnValue({});
      mockDb.updateDoc.and.returnValue(Promise.resolve());

      component.selectVenue('venue-1');
      tick();

      expect(mockDb.getDocs).toHaveBeenCalled();
      expect(mockDb.updateDoc).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('VenueID updated for event event-1');
      expect(component.chosenVenueName).toBe('Test Venue');
      expect(component.chosenVenueID).toBe('venue-1');
      expect(component.chosenVenuecompanyID).toBe('company-1');
      expect(component.loading).toBeFalse();
    }));

    it('should handle empty event query', fakeAsync(() => {
      mockAuth.currentUser = { uid: 'user-1' };
      mockDb.getDocs.and.returnValue(Promise.resolve({ docs: [], empty: true }));
      component.loading = false;

      component.selectVenue('venue-1');
      tick();

      expect(console.log).toHaveBeenCalledWith('No event found for this user');
      expect(mockDb.updateDoc).not.toHaveBeenCalled();
      expect(component.loading).toBeFalse();
    }));

    it('should handle Firestore error in selectVenue', fakeAsync(() => {
      mockAuth.currentUser = { uid: 'user-1' };
      mockDb.getDocs.and.callFake(() => {
        return Promise.reject(new Error('Firestore error'));
      });
      component.loading = false;

      component.selectVenue('venue-1');
      tick();

      expect(console.error).toHaveBeenCalledWith('Error fetching events:', jasmine.any(Error));
      expect(component.loading).toBeFalse();
    }));

    it('should handle updateDoc error', fakeAsync(() => {
      mockAuth.currentUser = { uid: 'user-1' };
      component.selectedVenue = mockVenue;
      const mockEventDoc = {
        id: 'event-1',
        data: () => ({ EventID: 'user-1' })
      };
      mockDb.getDocs.and.returnValue(Promise.resolve({ docs: [mockEventDoc], empty: false }));
      mockDb.doc.and.returnValue({});
      mockDb.updateDoc.and.callFake(() => {
        return Promise.reject(new Error('Update error'));
      });
      component.loading = false;

      component.selectVenue('venue-1');
      tick();

      expect(console.error).toHaveBeenCalledWith('Error updating VenueID:', jasmine.any(Error));
      expect(component.chosenVenueName).toBe('Test Venue');
      expect(component.chosenVenueID).toBe('venue-1');
      expect(component.chosenVenuecompanyID).toBe('company-1');
      expect(component.loading).toBeFalse();
    }));
  });

  describe('getChosenVenue', () => {
    it('should handle no user logged in', fakeAsync(() => {
      mockAuth.currentUser = null;

      component.getChosenVenue();
      tick();

      expect(component.chosenVenueName).toBeNull();
      expect(component.chosenVenueID).toBeNull();
      expect(component.chosenVenuecompanyID).toBeNull();
      expect(mockDb.getDocs).not.toHaveBeenCalled();
    }));

    it('should handle empty event query', fakeAsync(() => {
      mockAuth.currentUser = { uid: 'user-1' };
      mockDb.getDocs.and.returnValue(Promise.resolve({ docs: [], empty: true }));

      component.getChosenVenue();
      tick();

      expect(component.chosenVenueName).toBeNull();
      expect(component.chosenVenueID).toBeNull();
      expect(component.chosenVenuecompanyID).toBeNull();
    }));

    it('should handle no VenueID in event data', fakeAsync(() => {
      mockAuth.currentUser = { uid: 'user-1' };
      const mockEventDoc = {
        id: 'event-1',
        data: () => ({ EventID: 'user-1' })
      };
      mockDb.getDocs.and.returnValue(Promise.resolve({ docs: [mockEventDoc], empty: false }));

      component.getChosenVenue();
      tick();

      expect(component.chosenVenueName).toBeNull();
      expect(component.chosenVenueID).toBeNull();
      expect(component.chosenVenuecompanyID).toBeNull();
      expect(mockHttpClient.get).not.toHaveBeenCalled();
    }));

    it('should handle HTTP error when fetching chosen venue', fakeAsync(() => {
      mockAuth.currentUser = { uid: 'user-1' };
      const mockEventDoc = {
        id: 'event-1',
        data: () => ({ EventID: 'user-1', VenueID: 'venue-1' })
      };
      mockDb.getDocs.and.returnValue(Promise.resolve({ docs: [mockEventDoc], empty: false }));
      mockHttpClient.get.and.returnValue(throwError(() => new Error('HTTP error')));

      component.getChosenVenue();
      tick();

      expect(mockHttpClient.get).toHaveBeenCalledWith('https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues/venue-1');
      expect(component.chosenVenueName).toBeNull();
      expect(component.chosenVenueID).toBeNull();
      expect(component.chosenVenuecompanyID).toBeNull();
    }));

    it('should handle Firestore query error', fakeAsync(() => {
      mockAuth.currentUser = { uid: 'user-1' };
      mockDb.getDocs.and.callFake(() => {
        return Promise.reject(new Error('Firestore error'));
      });

      component.getChosenVenue();
      tick();

      expect(component.chosenVenueName).toBeNull();
      expect(component.chosenVenueID).toBeNull();
      expect(component.chosenVenuecompanyID).toBeNull();
      expect(console.error).toHaveBeenCalledWith(jasmine.any(Error));
    }));
  });

  describe('confirmVenue', () => {
    beforeEach(() => {
      spyOn(document, 'querySelector').and.returnValue({ style: { opacity: '' } } as any);
    });

    it('should not proceed if no user or missing chosen venue data', fakeAsync(() => {
      mockAuth.currentUser = null;
      component.chosenVenueID = 'venue-1';
      component.chosenVenuecompanyID = 'company-1';

      component.confirmVenue();
      tick();

      expect(mockDb.getDocs).not.toHaveBeenCalled();
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    }));

    it('should handle empty event query', fakeAsync(() => {
      mockAuth.currentUser = { uid: 'user-1' };
      component.chosenVenueID = 'venue-1';
      component.chosenVenuecompanyID = 'company-1';
      mockDb.getDocs.and.returnValue(Promise.resolve({ docs: [], empty: true }));

      component.confirmVenue();
      tick();

      expect(mockDb.getDocs).toHaveBeenCalled();
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    }));

    it('should not proceed if user declines confirmation', fakeAsync(() => {
      mockAuth.currentUser = { uid: 'user-1' };
      component.chosenVenueID = 'venue-1';
      component.chosenVenuecompanyID = 'company-1';
      const mockEventDoc = {
        id: 'event-1',
        data: () => ({ EventID: 'user-1', Date_Time: { toDate: () => new Date() } })
      };
      mockDb.getDocs.and.returnValue(Promise.resolve({ docs: [mockEventDoc], empty: false }));
      (window.confirm as jasmine.Spy).and.returnValue(false);

      component.confirmVenue();
      tick();

      expect(mockHttpClient.post).not.toHaveBeenCalled();
    }));

    it('should alert if no wedding date is set', fakeAsync(() => {
      mockAuth.currentUser = { uid: 'user-1' };
      component.chosenVenueID = 'venue-1';
      component.chosenVenuecompanyID = 'company-1';
      const mockEventDoc = {
        id: 'event-1',
        data: () => ({ EventID: 'user-1' })
      };
      mockDb.getDocs.and.returnValue(Promise.resolve({ docs: [mockEventDoc], empty: false }));

      component.confirmVenue();
      tick();

      expect(mockHttpClient.post).not.toHaveBeenCalled();
    }));

    it('should confirm venue successfully', fakeAsync(() => {
      mockAuth.currentUser = { uid: 'user-1' };
      component.chosenVenueID = 'venue-1';
      component.chosenVenuecompanyID = 'company-1';
      const weddingDate = new Date();
      const mockEventDoc = {
        id: 'event-1',
        data: () => ({ EventID: 'user-1', Date_Time: { toDate: () => weddingDate }, guestsNum: 100 })
      };
      mockDb.getDocs.and.returnValue(Promise.resolve({ docs: [mockEventDoc], empty: false }));
      mockHttpClient.post.and.returnValue(of({ ok: true, orderID: 'order-1' }));
      const mockButton = { style: { opacity: '' } };
      (document.querySelector as jasmine.Spy).and.returnValue(mockButton as any);

      component.confirmVenue();
      tick();

      expect(mockDb.getDocs).toHaveBeenCalled();
    }));

    it('should handle HTTP error during venue confirmation', fakeAsync(() => {
      mockAuth.currentUser = { uid: 'user-1' };
      component.chosenVenueID = 'venue-1';
      component.chosenVenuecompanyID = 'company-1';
      const weddingDate = new Date();
      const mockEventDoc = {
        id: 'event-1',
        data: () => ({ EventID: 'user-1', Date_Time: { toDate: () => weddingDate }, guestsNum: 100 })
      };
      mockDb.getDocs.and.returnValue(Promise.resolve({ docs: [mockEventDoc], empty: false }));
      mockHttpClient.post.and.returnValue(throwError(() => ({ error: { error: 'Confirmation failed' } })));

      component.confirmVenue();
      tick();

      expect(mockDb.getDocs).toHaveBeenCalled();
    }));

    it('should handle Firestore error during confirmVenue', fakeAsync(() => {
      mockAuth.currentUser = { uid: 'user-1' };
      component.chosenVenueID = 'venue-1';
      component.chosenVenuecompanyID = 'company-1';
      mockDb.getDocs.and.callFake(() => {
        return Promise.reject(new Error('Firestore error'));
      });

      component.confirmVenue();
      tick();

      expect(console.error).toHaveBeenCalledWith(jasmine.any(Error));
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    }));
  });

  describe('checkVenueOrder', () => {
    it('should not proceed if no user is logged in', fakeAsync(() => {
      mockAuth.currentUser = null;

      component.checkVenueOrder();
      tick();

      expect(mockDb.getDocs).not.toHaveBeenCalled();
    }));

    it('should set hasExistingOrder to true if orders exist', fakeAsync(() => {
      mockAuth.currentUser = { uid: 'user-1' };
      mockDb.getDocs.and.returnValue(Promise.resolve({ docs: [{ id: 'order-1' }], empty: false }));

      component.checkVenueOrder();
      tick();

      expect(component.hasExistingOrder).toBeTrue();
    }));

    it('should set hasExistingOrder to false if no orders exist', fakeAsync(() => {
      mockAuth.currentUser = { uid: 'user-1' };
      mockDb.getDocs.and.returnValue(Promise.resolve({ docs: [], empty: true }));

      component.checkVenueOrder();
      tick();

      expect(component.hasExistingOrder).toBeFalse();
    }));

    it('should handle Firestore error', fakeAsync(() => {
      mockAuth.currentUser = { uid: 'user-1' };
      mockDb.getDocs.and.callFake(() => {
        return Promise.reject(new Error('Firestore error'));
      });

      component.checkVenueOrder();
      tick();

      expect(console.error).toHaveBeenCalledWith(jasmine.any(Error));
    }));
  });

  describe('getRecommendations', () => {
    it('should set recommendedVenues to empty if no user is logged in', fakeAsync(() => {
      mockAuth.currentUser = null;
      component.loading = false;

      component.getRecommendations();
      tick();

      expect(component.recommendedVenues).toEqual([]);
      expect(component.loading).toBeFalse();
    }));

    it('should set recommendedVenues to empty if no event exists', fakeAsync(() => {
      mockAuth.currentUser = { uid: 'user-1' };
      mockDb.getDoc.and.returnValue(Promise.resolve({ exists: () => false }));
      component.loading = false;

      component.getRecommendations();
      tick();

      expect(component.recommendedVenues).toEqual([]);
      expect(component.loading).toBeFalse();
    }));

    it('should set recommendedVenues to empty if no budget is set', fakeAsync(() => {
      mockAuth.currentUser = { uid: 'user-1' };
      mockDb.getDoc.and.returnValue(Promise.resolve({
        exists: () => true,
        data: () => ({ budget: null })
      }));
      mockDb.getDocs.and.returnValue(Promise.resolve({ size: 50 }));
      component.loading = false;

      component.getRecommendations();
      tick();

      expect(component.recommendedVenues).toEqual([]);
      expect(component.userBudget).toBeNull();
      expect(component.loading).toBeFalse();
    }));

    it('should set recommendedVenues to empty if no venues are returned', fakeAsync(() => {
      mockAuth.currentUser = { uid: 'user-1' };
      mockDb.getDoc.and.returnValue(Promise.resolve({
        exists: () => true,
        data: () => ({ budget: 10000 })
      }));
      mockDb.getDocs.and.returnValue(Promise.resolve({ size: 50 }));
      mockHttpClient.get.and.returnValue(of(null));
      component.loading = false;

      component.getRecommendations();
      tick();

      expect(component.recommendedVenues).toEqual([]);
      expect(component.userBudget).toBeNull();
      expect(component.loading).toBeFalse();
    }));

    it('should filter recommended venues based on budget and guest count', fakeAsync(() => {
      mockAuth.currentUser = { uid: 'user-1' };
      mockDb.getDoc.and.returnValue(Promise.resolve({
        exists: () => true,
        data: () => ({ budget: 6000 })
      }));
      mockDb.getDocs.and.returnValue(Promise.resolve({ size: 100 }));
      mockHttpClient.get.and.returnValue(of(mockVenues));
      component.loading = false;

      component.getRecommendations();
      tick();

      expect(component.recommendedVenues.length).toBe(0);
      expect(component.userBudget).toBeNull();
      expect(component.loading).toBeFalse();
    }));

    it('should handle errors in getRecommendations', fakeAsync(() => {
      mockAuth.currentUser = { uid: 'user-1' };
      mockDb.getDoc.and.callFake(() => {
        return Promise.reject(new Error('Firestore error'));
      });
      component.loading = false;

      component.getRecommendations();
      tick();

      expect(component.recommendedVenues).toEqual([]);
      expect(component.error).toBe('Failed to load recommended venues');
      expect(component.loading).toBeFalse();
      expect(console.error).toHaveBeenCalled();
    }));
  });
});