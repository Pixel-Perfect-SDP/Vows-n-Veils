import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { Trackorders } from './trackorders';

describe('Trackorders', () => {
  let component: Trackorders;
  let fixture: ComponentFixture<Trackorders>;
  let mockRouter: any;
  let mockHttpClient: any;

  const mockVenueOrder = {
    id: 'order-1',
    companyID: 'company-1',
    customerID: 'customer-1',
    venueID: 'venue-1',
    eventID: 'event-1',
    startAt: '2024-12-25T10:00:00Z',
    endAt: '2024-12-25T18:00:00Z',
    note: 'Test order note',
    status: 'pending' as const,
    createdAt: '2024-12-20T10:00:00Z'
  };

  const mockVenueData = {
    id: 'venue-1',
    venuename: 'Test Venue',
    address: 'Test Address'
  };

  beforeEach(async () => {
    // Create simple mocks following manageservices pattern
    mockRouter = { 
      navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true))
    };
    
    mockHttpClient = {
      get: jasmine.createSpy('get').and.returnValue(of([])),
      put: jasmine.createSpy('put').and.returnValue(of({}))
    };

    await TestBed.configureTestingModule({
      imports: [Trackorders],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: HttpClient, useValue: mockHttpClient }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Trackorders);
    component = fixture.componentInstance;
    
    // Override the private properties with our mocks (same pattern as manageservices)
    (component as any).router = mockRouter;
    (component as any).http = mockHttpClient;
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Test component initialization and default values (same pattern as manageservices)
  it('should initialize with default values', () => {
    expect(component.orders).toEqual([]);
    expect(component.loading).toBeFalse();
  });

  // Test backhome navigation (similar to manageservices navigation tests)
  it('should navigate back to manageservices', () => {
    component.backhome();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/manageservices']);
  });

  // Test loadOrders main API call
  it('should call orders API with correct company ID', fakeAsync(() => {
    mockHttpClient.get.and.returnValue(of([]));
    component.loading = false;

    component.loadOrders('test-company-id');
    tick();

    expect(mockHttpClient.get).toHaveBeenCalledWith(
      'https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues/orders/company/test-company-id'
    );
    expect(component.loading).toBeFalse();
  }));

  // Test loadOrders with basic venue data (without Firebase complexity)
  it('should load orders and fetch venue data', fakeAsync(() => {
    const mockOrders = [{ ...mockVenueOrder, venueID: 'venue-1' }];
    
    mockHttpClient.get.and.callFake((url: string) => {
      if (url.includes('/venues/orders/company/')) {
        return of(mockOrders);
      } else if (url.includes('/venues/venue-1')) {
        return of(mockVenueData);
      }
      return of({});
    });

    component.loading = false;
    component.loadOrders('test-company-id');
    tick(2000); // Give enough time for all async operations

    expect(component.orders.length).toBe(1);
    expect(component.orders[0].venueID).toBe('Test Venue');
    expect(component.loading).toBeFalse();
  }));

  // Test loadOrders with no venue selected
  it('should handle orders with no venue selected', fakeAsync(() => {
    const orderWithoutVenue = { ...mockVenueOrder, venueID: '' };
    mockHttpClient.get.and.callFake((url: string) => {
      if (url.includes('/venues/orders/company/')) {
        return of([orderWithoutVenue]);
      }
      return of({});
    });

    component.loading = false;
    component.loadOrders('test-company-id');
    tick(2000);

    expect(component.orders.length).toBe(1);
    expect(component.orders[0].venueID).toBe('No venue selected');
    expect(component.loading).toBeFalse();
  }));

  // Test loadOrders with venue fetch error (following manageservices error handling pattern)
  it('should handle venue fetch error gracefully', fakeAsync(() => {
    const mockOrders = [mockVenueOrder];
    spyOn(console, 'error');
    
    mockHttpClient.get.and.callFake((url: string) => {
      if (url.includes('/venues/orders/company/')) {
        return of(mockOrders);
      } else if (url.includes('/venues/venue-1')) {
        return throwError(() => new Error('Venue fetch error'));
      }
      return of({});
    });

    component.loading = false;
    component.loadOrders('test-company-id');
    tick(2000);

    expect(console.error).toHaveBeenCalledWith('Failed to fetch venue info:', jasmine.any(Error));
    expect(component.loading).toBeFalse();
  }));

  // Test loadOrders main API error (following manageservices error pattern)
  it('should handle load orders API error', fakeAsync(() => {
    spyOn(console, 'error');
    mockHttpClient.get.and.returnValue(throwError(() => new Error('API error')));
    component.loading = false;

    component.loadOrders('test-company-id');
    tick();

    expect(console.error).toHaveBeenCalledWith('Failed to load orders:', jasmine.any(Error));
    expect(component.loading).toBeFalse();
  }));

  // Test orders sorting by status
  it('should sort orders by status priority (pending, accepted, rejected)', fakeAsync(() => {
    const mockOrders = [
      { ...mockVenueOrder, id: 'order-1', status: 'rejected' as const },
      { ...mockVenueOrder, id: 'order-2', status: 'pending' as const },
      { ...mockVenueOrder, id: 'order-3', status: 'accepted' as const }
    ];
    
    mockHttpClient.get.and.callFake((url: string) => {
      if (url.includes('/venues/orders/company/')) {
        return of(mockOrders);
      } else if (url.includes('/venues/')) {
        return of(mockVenueData);
      }
      return of({});
    });

    component.loading = false;
    component.loadOrders('test-company-id');
    tick(2000);

    expect(component.orders[0].status).toBe('pending');
    expect(component.orders[1].status).toBe('accepted');
    expect(component.orders[2].status).toBe('rejected');
  }));

  // Test updateStatus HTTP call
  it('should call update status API with correct parameters', fakeAsync(() => {
    mockHttpClient.put.and.returnValue(of({}));

    component.updateStatus('order-1', 'accepted');
    tick();

    expect(mockHttpClient.put).toHaveBeenCalledWith(
      'https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues/orders/order-1/status',
      { status: 'accepted' }
    );
  }));

  // Test updateStatus with rejection
  it('should call update status API for rejection', fakeAsync(() => {
    mockHttpClient.put.and.returnValue(of({}));

    component.updateStatus('order-1', 'rejected');
    tick();

    expect(mockHttpClient.put).toHaveBeenCalledWith(
      'https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues/orders/order-1/status',
      { status: 'rejected' }
    );
  }));

  // Test updateStatus error (following manageservices error handling pattern)
  it('should handle update status error', fakeAsync(() => {
    spyOn(console, 'error');
    mockHttpClient.put.and.returnValue(throwError(() => new Error('Update error')));

    component.updateStatus('order-1', 'accepted');
    tick();

    expect(console.error).toHaveBeenCalledWith('Failed to update status:', jasmine.any(Error));
  }));

  // Test venue name fallback
  it('should use fallback venue name when venue has no name', fakeAsync(() => {
    const mockOrders = [mockVenueOrder];
    const venueWithoutName = { id: 'venue-1' }; // No venuename property
    
    mockHttpClient.get.and.callFake((url: string) => {
      if (url.includes('/venues/orders/company/')) {
        return of(mockOrders);
      } else if (url.includes('/venues/venue-1')) {
        return of(venueWithoutName);
      }
      return of({});
    });

    component.loading = false;
    component.loadOrders('test-company-id');
    tick(2000);

    expect(component.orders[0].venueID).toBe('No venue name');
  }));

  // Test loading state during loadOrders
  it('should set loading to true during loadOrders', () => {
    mockHttpClient.get.and.returnValue(of([]));
    component.loading = false;

    component.loadOrders('test-company-id');
    
    expect(component.loading).toBeTrue();
  });

  // Test empty orders array handling
  it('should handle empty orders response', fakeAsync(() => {
    mockHttpClient.get.and.returnValue(of([]));
    component.loading = false;

    component.loadOrders('test-company-id');
    tick();

    expect(component.orders).toEqual([]);
    expect(component.loading).toBeFalse();
  }));

  // Test multiple orders with different venues
  it('should handle multiple orders with different venues', fakeAsync(() => {
    const mockOrders = [
      { ...mockVenueOrder, id: 'order-1', venueID: 'venue-1' },
      { ...mockVenueOrder, id: 'order-2', venueID: 'venue-2' }
    ];
    
    mockHttpClient.get.and.callFake((url: string) => {
      if (url.includes('/venues/orders/company/')) {
        return of(mockOrders);
      } else if (url.includes('/venues/venue-1')) {
        return of({ venuename: 'Venue One' });
      } else if (url.includes('/venues/venue-2')) {
        return of({ venuename: 'Venue Two' });
      }
      return of({});
    });

    component.loading = false;
    component.loadOrders('test-company-id');
    tick(2000);

    expect(component.orders.length).toBe(2);
    expect(component.orders[0].venueID).toBe('Venue One');
    expect(component.orders[1].venueID).toBe('Venue Two');
  }));

  // Test order with null/undefined note
  it('should handle orders with null or undefined note', fakeAsync(() => {
    const orderWithoutNote = { ...mockVenueOrder, note: null };
    mockHttpClient.get.and.returnValue(of([orderWithoutNote]));

    component.loading = false;
    component.loadOrders('test-company-id');
    tick(2000);

    expect(component.orders[0].note).toBeNull();
  }));

  // Test component state after successful loadOrders
  it('should update component state after successful loadOrders', fakeAsync(() => {
    const mockOrders = [mockVenueOrder];
    mockHttpClient.get.and.returnValue(of(mockOrders));

    component.loading = false;
    component.loadOrders('test-company-id');
    tick(2000);

    expect(component.orders.length).toBeGreaterThan(0);
    expect(component.loading).toBeFalse();
  }));

  // Test HTTP error handling for venue fetch with specific error codes
  it('should handle specific HTTP error codes for venue fetch', fakeAsync(() => {
    const mockOrders = [mockVenueOrder];
    spyOn(console, 'error');
    
    mockHttpClient.get.and.callFake((url: string) => {
      if (url.includes('/venues/orders/company/')) {
        return of(mockOrders);
      } else if (url.includes('/venues/venue-1')) {
        return throwError(() => ({ status: 404, message: 'Venue not found' }));
      }
      return of({});
    });

    component.loading = false;
    component.loadOrders('test-company-id');
    tick(2000);

    expect(console.error).toHaveBeenCalledWith('Failed to fetch venue info:', jasmine.any(Object));
    expect(component.loading).toBeFalse();
  }));

  // Test component behavior with malformed venue data
  it('should handle malformed venue data gracefully', fakeAsync(() => {
    const mockOrders = [mockVenueOrder];
    const malformedVenueData = null;
    
    mockHttpClient.get.and.callFake((url: string) => {
      if (url.includes('/venues/orders/company/')) {
        return of(mockOrders);
      } else if (url.includes('/venues/venue-1')) {
        return of(malformedVenueData);
      }
      return of({});
    });

    component.loading = false;
    component.loadOrders('test-company-id');
    tick(2000);

    // Should still process the order even with malformed venue data
    expect(component.orders.length).toBe(1);
    expect(component.loading).toBeFalse();
  }));

  // Test updateStatus network timeout/error scenarios
  it('should handle network timeout during updateStatus', fakeAsync(() => {
    spyOn(console, 'error');
    mockHttpClient.put.and.returnValue(throwError(() => ({ name: 'TimeoutError' })));

    component.updateStatus('order-1', 'accepted');
    tick();

    expect(console.error).toHaveBeenCalledWith('Failed to update status:', jasmine.any(Object));
  }));
});