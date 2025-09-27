import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Venues } from './venues';

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

describe('Venues', () => {
  let component: Venues;
  let fixture: ComponentFixture<Venues>;
  let mockRouter: any;
  let mockHttpClient: any;

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

    await TestBed.configureTestingModule({
      imports: [Venues],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: HttpClient, useValue: mockHttpClient }
      ],
      schemas: [NO_ERRORS_SCHEMA] 
    }).compileComponents();

    fixture = TestBed.createComponent(Venues);
    component = fixture.componentInstance;
    
    (component as any).router = mockRouter;
    (component as any).http = mockHttpClient;
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Test component initialization and default values
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

  // Test getVenues success
  it('should fetch venues successfully and filter active ones', fakeAsync(() => {
    mockHttpClient.get.and.returnValue(of(mockVenues));
    component.loading = false;

    component.getVenues();
    tick();

    expect(mockHttpClient.get).toHaveBeenCalledWith('https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues');
    expect(component.venues.length).toBe(2); // Only active venues
    expect(component.venues[0].status).toBe('active');
    expect(component.venues[1].status).toBe('active');
    expect(component.loading).toBeFalse();
  }));

  // Test getVenues error handling
  it('should handle getVenues error', fakeAsync(() => {
    mockHttpClient.get.and.returnValue(throwError(() => new Error('Network error')));
    component.loading = false;

    component.getVenues();
    tick();

    expect(component.error).toBe('Failed to load venues: Network error');
    expect(component.loading).toBeFalse();
  }));

  // Test getVenues loading state
  it('should set loading to true when fetching venues', () => {
    mockHttpClient.get.and.returnValue(of(mockVenues));
    component.loading = false;

    component.getVenues();

    expect(component.loading).toBeTrue();
  });

  // Test viewVenue success
  it('should view venue successfully', fakeAsync(() => {
    mockHttpClient.get.and.returnValue(of(mockVenue));
    component.loading = false;

    component.viewVenue('venue-1');
    tick();

    expect(mockHttpClient.get).toHaveBeenCalledWith('https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues/venue-1');
    expect(component.selectedVenue).toEqual(mockVenue);
    expect(component.loading).toBeFalse();
  }));

  // Test viewVenue error handling
  it('should handle viewVenue error', fakeAsync(() => {
    mockHttpClient.get.and.returnValue(throwError(() => new Error('Venue not found')));
    component.loading = false;

    component.viewVenue('invalid-id');
    tick();

    expect(component.error).toBe('Failed to load venue: Venue not found');
    expect(component.selectedVenue).toBeNull();
    expect(component.loading).toBeFalse();
  }));

  // Test backToList
  it('should go back to venue list', () => {
    component.selectedVenue = mockVenue;
    
    component.backToList();
    
    expect(component.selectedVenue).toBeNull();
  });

  // Test backTohome navigation
  it('should navigate back to homepage', () => {
    component.backTohome();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/homepage']);
  });

  // Test venues filtering by status
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

  // Test empty venues response
  it('should handle empty venues response', fakeAsync(() => {
    mockHttpClient.get.and.returnValue(of([]));
    component.loading = false;

    component.getVenues();
    tick();

    expect(component.venues).toEqual([]);
    expect(component.loading).toBeFalse();
  }));

  // Test venues without status field
  it('should filter venues without status field', fakeAsync(() => {
    const venuesWithoutStatus = [
      { ...mockVenue, status: 'active' },
      { ...mockVenue, id: 'venue-2' }, // No status field
      { ...mockVenue, id: 'venue-3', status: undefined },
      { ...mockVenue, id: 'venue-4', status: 'active' }
    ];
    
    mockHttpClient.get.and.returnValue(of(venuesWithoutStatus));
    component.loading = false;

    component.getVenues();
    tick();

    expect(component.venues.length).toBe(2);
    expect(component.venues.every(v => v.status === 'active')).toBeTrue();
  }));

  // Test viewVenue with different venue IDs
  it('should handle different venue IDs correctly', fakeAsync(() => {
    const differentVenue = { ...mockVenue, id: 'different-venue', venuename: 'Different Venue' };
    mockHttpClient.get.and.returnValue(of(differentVenue));
    component.loading = false;

    component.viewVenue('different-venue');
    tick();

    expect(mockHttpClient.get).toHaveBeenCalledWith('https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues/different-venue');
    expect(component.selectedVenue?.venuename).toBe('Different Venue');
  }));

  // Test error message formatting
  it('should format error messages correctly', fakeAsync(() => {
    const errorWithMessage = { message: 'Custom error message' };
    mockHttpClient.get.and.returnValue(throwError(() => errorWithMessage));
    component.loading = false;

    component.getVenues();
    tick();

    expect(component.error).toBe('Failed to load venues: Custom error message');
  }));

  // Test loading state during viewVenue
  it('should set loading state during viewVenue', () => {
    mockHttpClient.get.and.returnValue(of(mockVenue));
    component.loading = false;

    component.viewVenue('venue-1');

    expect(component.loading).toBeTrue();
  });

  // Test multiple consecutive viewVenue calls
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

  // Test venue with images
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

  // Test venue without images
  it('should handle venue without images', fakeAsync(() => {
    const venueWithoutImages = { ...mockVenue, images: [] };
    mockHttpClient.get.and.returnValue(of(venueWithoutImages));
    component.loading = false;

    component.viewVenue('venue-1');
    tick();

    expect(component.selectedVenue?.images).toEqual([]);
  }));

  // Test venue with undefined images
  it('should handle venue with undefined images', fakeAsync(() => {
    const venueWithUndefinedImages = { ...mockVenue };
    delete venueWithUndefinedImages.images;
    
    mockHttpClient.get.and.returnValue(of(venueWithUndefinedImages));
    component.loading = false;

    component.viewVenue('venue-1');
    tick();

    expect(component.selectedVenue?.images).toBeUndefined();
  }));

  // Test HTTP error with different status codes
  it('should handle HTTP error with status codes', fakeAsync(() => {
    const httpError = { status: 404, message: 'Not Found' };
    mockHttpClient.get.and.returnValue(throwError(() => httpError));
    component.loading = false;

    component.getVenues();
    tick();

    expect(component.error).toContain('Failed to load venues:');
    expect(component.loading).toBeFalse();
  }));

  // Test venue data with all properties
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

  // Test venue data with missing optional properties
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

  // Test error state reset on successful request
  it('should reset error state on successful request', fakeAsync(() => {
    component.error = 'Previous error';
    
    mockHttpClient.get.and.returnValue(of(mockVenues));
    component.loading = false;

    component.getVenues();
    tick();

    expect(component.venues.length).toBeGreaterThan(0);
  }));

  // Test concurrent requests handling
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

  // Test venue properties type safety
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

  // Test component state after error
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

  // Test viewVenue loading state reset on error
  it('should reset loading state on viewVenue error', fakeAsync(() => {
    mockHttpClient.get.and.returnValue(throwError(() => new Error('Venue error')));
    component.loading = false;

    component.viewVenue('error-venue');
    tick();

    expect(component.loading).toBeFalse();
    expect(component.error).toBe('Failed to load venue: Venue error');
  }));
});