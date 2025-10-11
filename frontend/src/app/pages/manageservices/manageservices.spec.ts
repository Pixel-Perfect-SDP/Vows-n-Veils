import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { Manageservices } from './manageservices';
import { AuthService } from '../../core/auth';
import { DataService } from '../../core/data.service';

describe('Manageservices', () => {
  let component: Manageservices;
  let fixture: ComponentFixture<Manageservices>;
  let mockRouter: any;
  let mockAuth: any;
  let mockHttpClient: any;
  let mockDataService: any;

  beforeEach(async () => {
    // Create simple mocks following landing.spec.ts pattern
    mockRouter = { 
      navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true)),
      navigateByUrl: jasmine.createSpy('navigateByUrl').and.returnValue(Promise.resolve(true))
    };
    
    mockAuth = {
      user: jasmine.createSpy('user').and.returnValue({ uid: 'test-user-id', email: 'test@example.com' }),
      firestore: jasmine.createSpy('firestore').and.returnValue({})
    };
    
    mockHttpClient = {
      get: jasmine.createSpy('get').and.returnValue(of([])),
      post: jasmine.createSpy('post').and.returnValue(of({})),
      put: jasmine.createSpy('put').and.returnValue(of({})),
      delete: jasmine.createSpy('delete').and.returnValue(of({}))
    };
    
    mockDataService = {
      getMapData: jasmine.createSpy('getMapData').and.returnValue(of({ 
        lat: 40.7128, 
        lon: -74.0060, 
        display_name: 'Test Location' 
      })),
      getNearbyPlaces: jasmine.createSpy('getNearbyPlaces').and.returnValue(of([]))
    };

    await TestBed.configureTestingModule({
      imports: [Manageservices, ReactiveFormsModule],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: AuthService, useValue: mockAuth },
        { provide: HttpClient, useValue: mockHttpClient },
        { provide: DataService, useValue: mockDataService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Manageservices);
    component = fixture.componentInstance;
    
    // Override the private properties with our mocks since the component uses inject()
    (component as any).http = mockHttpClient;
    (component as any).router = mockRouter;
    (component as any).auth = mockAuth;
    (component as any).dataService = mockDataService;
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Test component initialization and default values
  it('should initialize with default values', () => {
    expect(component.hasVenueCompany).toBeNull();
    expect(component.companyVenueData).toBeNull();
    expect(component.selected).toBeNull();
    expect(component.venues).toEqual([]);
    expect(component.loading).toBeFalse();
    expect(component.editingVenue).toBeNull();
    expect(component.addingVenue).toBeFalse();
  });

  // Test form validation
  it('should validate form fields', () => {
    expect(component.form.get('companyName')?.hasError('required')).toBeTrue();
    expect(component.form.get('companyEmail')?.hasError('required')).toBeTrue();
    expect(component.form.get('companyNumber')?.hasError('required')).toBeTrue();
  });

  // Test venue selection functionality
  it('should select venues option and fetch data when user is set', () => {
    spyOn(component, 'fetchVenues');
    component.user = { uid: 'test-user' } as any;
    
    component.select('Venues');
    
    expect(component.selected).toBe('Venues');
    expect(component.fetchVenues).toHaveBeenCalled();
  });

  it('should select venues option but not fetch when no user', () => {
    spyOn(component, 'fetchVenues');
    component.user = null;
    
    component.select('Venues');
    
    expect(component.selected).toBe('Venues');
    expect(component.fetchVenues).toHaveBeenCalled(); // fetchVenues is called but will show alert
  });

  it('should clear data when selecting non-venue option', () => {
    component.venues = [{ id: '1' }];
    component.editingVenue = { id: '1' };
    component.addingVenue = true;
    
    component.select('Other');
    
    expect(component.selected).toBe('Other');
    expect(component.venues).toEqual([]);
    expect(component.editingVenue).toBeNull();
    expect(component.addingVenue).toBeFalse();
  });

  // Test venue fetching
  it('should fetch venues successfully', fakeAsync(() => {
    const mockVenues = [{ id: '1', venuename: 'Test Venue' }];
    mockHttpClient.get.and.returnValue(of(mockVenues));
    component.user = { uid: 'test-user-id' } as any;
    component.loading = false;

    component.fetchVenues();
    tick(); // Process async operations

    expect(mockHttpClient.get).toHaveBeenCalledWith(
      'https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues/company/test-user-id'
    );
    expect(component.venues).toEqual(mockVenues);
    expect(component.loading).toBeFalse();
  }));

  it('should handle fetch venues error', fakeAsync(() => {
    mockHttpClient.get.and.returnValue(throwError(() => new Error('Network error')));
    spyOn(console, 'error');
    component.user = { uid: 'test-user-id' } as any;
    component.loading = false;

    component.fetchVenues();
    tick(); // Process async operations

    expect(console.error).toHaveBeenCalledWith('Error fetching venues', jasmine.any(Error));
    expect(component.venues).toEqual([]);
    expect(component.loading).toBeFalse();
  }));

  it('should not fetch venues when no user logged in', () => {
    component.user = null;
    spyOn(window, 'alert');

    component.fetchVenues();

    expect(window.alert).toHaveBeenCalledWith('No user logged in!');
    expect(mockHttpClient.get).not.toHaveBeenCalled();
  });

  // Test venue addition
  it('should start adding new venue', () => {
    component.AddVenue();

    expect(component.addingVenue).toBeTrue();
    expect(component.newVenueData.status).toBe('pending');
  });

  it('should cancel adding venue', () => {
    component.addingVenue = true;
    
    component.CancelAdd();
    
    expect(component.addingVenue).toBeFalse();
  });

  // Test venue editing
  it('should start editing venue', () => {
    const mockVenue = { id: '1', venuename: 'Test Venue' };

    component.UpdateVenue(mockVenue);

    expect(component.editingVenue).toEqual(mockVenue);
    expect(component.updateData).toEqual(jasmine.objectContaining(mockVenue));
  });

  it('should cancel venue editing', () => {
    component.editingVenue = { id: '1' };
    
    component.CancelUpdate();
    
    expect(component.editingVenue).toBeNull();
  });

  // Test venue deletion
  it('should delete venue when confirmed', fakeAsync(() => {
    const mockVenue = { id: '1', venuename: 'Test Venue' };
    spyOn(window, 'confirm').and.returnValue(true);
    spyOn(window, 'alert');
    mockHttpClient.delete.and.returnValue(of({}));
    spyOn(component, 'fetchVenues');
    component.loading = false;

    component.DeleteVenue(mockVenue);
    tick(); // Process async operations

    expect(window.confirm).toHaveBeenCalledWith(
      'Are you sure you want to delete "Test Venue"? This cannot be undone!'
    );
    expect(mockHttpClient.delete).toHaveBeenCalledWith(
      'https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues/1'
    );
    expect(component.fetchVenues).toHaveBeenCalled();
    expect(component.loading).toBeFalse();
  }));

  it('should not delete venue when cancelled', () => {
    const mockVenue = { id: '1', venuename: 'Test Venue' };
    spyOn(window, 'confirm').and.returnValue(false);

    component.DeleteVenue(mockVenue);

    expect(mockHttpClient.delete).not.toHaveBeenCalled();
  });

  it('should handle delete venue error', fakeAsync(() => {
    const mockVenue = { id: '1', venuename: 'Test Venue' };
    spyOn(window, 'confirm').and.returnValue(true);
    spyOn(window, 'alert');
    spyOn(console, 'error');
    mockHttpClient.delete.and.returnValue(throwError(() => new Error('Delete error')));
    component.loading = false;

    component.DeleteVenue(mockVenue);
    tick(); // Process async operations

    expect(console.error).toHaveBeenCalledWith('Error deleting venue', jasmine.any(Error));
    expect(window.alert).toHaveBeenCalledWith('Failed to delete venue.');
    expect(component.loading).toBeFalse();
  }));

  // Test file handling
  it('should handle file selection for new venue', () => {
    const mockFiles = ['file1.jpg'] as any;
    const mockEvent = { target: { files: mockFiles } };

    component.onFileSelected(mockEvent);

    expect(component.selectedFiles).toBe(mockFiles);
  });

  it('should handle file selection for venue update', () => {
    const mockFiles = ['file1.jpg'] as any;
    const mockEvent = { target: { files: mockFiles } };

    component.onNewFilesSelected(mockEvent);

    expect(component.newUpdateFiles).toBe(mockFiles);
  });

  // Test logout functionality - Note: actual logout uses Firebase signOut directly
  it('should call logout method', () => {
    // Since logout uses Firebase signOut directly, we test that the method exists and can be called
    expect(typeof component.logout).toBe('function');
    
    // We can't easily mock the Firebase signOut call without more complex setup,
    // so we just verify the method exists and doesn't throw an error when called
    expect(() => component.logout()).not.toThrow();
  });

  // Test map functionality
  it('should toggle map visibility', () => {
    expect(component.mapVisible).toBeFalse();
    
    component.toggleMap();
    
    expect(component.mapVisible).toBeTrue();
  });

  it('should search location successfully', fakeAsync(() => {
    component.searchAddress = 'Test Address';
    const mockMapData = { lat: 40.7128, lon: -74.0060, display_name: 'Test Location' };
    mockDataService.getMapData.and.returnValue(of(mockMapData));
    component.mapLoading = false;
    component.mapError = null;

    component.searchLocation();
    tick(); // Process async operations

    expect(mockDataService.getMapData).toHaveBeenCalledWith('Test Address');
    expect(component.mapData).toEqual(mockMapData);
    expect(component.mapLoading).toBeFalse();
  }));

  it('should handle search location error', fakeAsync(() => {
    component.searchAddress = 'Invalid Address';
    mockDataService.getMapData.and.returnValue(throwError(() => ({ status: 404 })));
    component.mapLoading = false;

    component.searchLocation();
    tick(); // Process async operations

    expect(component.mapError).toBe('Address not found. Please try a different search term.');
    expect(component.mapLoading).toBeFalse();
  }));

  it('should not search when address is empty', () => {
    component.searchAddress = '';

    component.searchLocation();

    expect(mockDataService.getMapData).not.toHaveBeenCalled();
  });

  it('should not search when address is only whitespace', () => {
    component.searchAddress = '   ';

    component.searchLocation();

    expect(mockDataService.getMapData).not.toHaveBeenCalled();
  });

  // Test map pin functionality
  it('should set map pin', () => {
    component.setMapPin(40.7128, -74.0060, 'Test Location');

    expect(component.mapPin).toEqual({
      lat: 40.7128,
      lon: -74.0060,
      address: 'Test Location'
    });
  });

  // Test using location for venue
  it('should use location for new venue', () => {
    component.mapPin = { lat: 40.7128, lon: -74.0060, address: 'Test Location' };
    component.addingVenue = true;
    component.newVenueData = {};

    component.useLocationForVenue();

    expect(component.newVenueData.address).toBe('Test Location');
  });

  // Test venue type labels
  it('should return correct venue type labels', () => {
    expect(component.getVenueTypeLabel('hotel')).toBe('Hotel & Resort');
    expect(component.getVenueTypeLabel('event_space')).toBe('Event Space');
    expect(component.getVenueTypeLabel('unknown')).toBe('Venue');
  });

  // Test track orders navigation
  it('should navigate to track orders', () => {
    component.trackorders();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/trackorders']);
  });

});
