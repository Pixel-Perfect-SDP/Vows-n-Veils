import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { Manageservices } from './manageservices';
import { AuthService } from '../../core/auth';
import { DataService } from '../../core/data.service';
import * as L from 'leaflet';

//ng test --include src/app/pages/manageservices/manageservices.spec.ts --code-coverage --watch=false --browsers=ChromeHeadless

describe('Manageservices', () => {


  let component: Manageservices;
  let fixture: ComponentFixture<Manageservices>;
  let mockRouter: any;
  let mockAuth: any;
  let mockHttpClient: any;
  let mockDataService: any;

  beforeEach(async () => {
    //Create simple mocks following landing.spec.ts pattern
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
    
    //
    (component as any).http = mockHttpClient;
    (component as any).router = mockRouter;
    (component as any).auth = mockAuth;
    (component as any).dataService = mockDataService;
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  //Test component default values and initialization
  it('should initialize with default values', () => {
    expect(component.hasVenueCompany).toBeNull();
    expect(component.companyVenueData).toBeNull();
    expect(component.selected).toBeNull();
    expect(component.venues).toEqual([]);
    expect(component.loading).toBeFalse();
    expect(component.editingVenue).toBeNull();
    expect(component.addingVenue).toBeFalse();
  });

   //Test validating form NB:DOUBLE CHECK THIS ONE!
  it('should validate form fields', () => {
    expect(component.form.get('companyName')?.hasError('required')).toBeTrue();
    expect(component.form.get('companyEmail')?.hasError('required')).toBeTrue();
    expect(component.form.get('companyNumber')?.hasError('required')).toBeTrue();
  });

  //Test selecetion of venues
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
    expect(component.fetchVenues).toHaveBeenCalled(); //fetchVenues is called but will show alert
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

  //Test fetching venyues
  it('should fetch venues successfully', fakeAsync(() => {
    const mockVenues = [{ id: '1', venuename: 'Test Venue' }];
    mockHttpClient.get.and.returnValue(of(mockVenues));
    component.user = { uid: 'test-user-id' } as any;
    component.loading = false;

    component.fetchVenues();
    tick(); 

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
    tick(); 

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

  //Test if we can add a venue
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

  //Test if we can edit a venue
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

  //Test if we can delete a venue
  it('should delete venue when confirmed', fakeAsync(() => {
    const mockVenue = { id: '1', venuename: 'Test Venue' };
    spyOn(window, 'confirm').and.returnValue(true);
    spyOn(window, 'alert');
    mockHttpClient.delete.and.returnValue(of({}));
    spyOn(component, 'fetchVenues');
    component.loading = false;

    component.DeleteVenue(mockVenue);
    tick(); 

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
    tick(); 

    expect(console.error).toHaveBeenCalledWith('Error deleting venue', jasmine.any(Error));
    expect(window.alert).toHaveBeenCalledWith('Failed to delete venue.');
    expect(component.loading).toBeFalse();
  }));

  //Test how files are handled
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

  //Test logout functionality-
  // NB TO NOTE, actual logout uses Firebase signOut directly
  it('should call logout method', () => {
    //logout uses Firebase signoOut directly, test method exits and can be called
    expect(typeof component.logout).toBe('function');
    
    //Keeping the simple setup, might need to make complex later to mock firebase calls
    //so we just verify the method exists and doesn't throw an error when called
    expect(() => component.logout()).not.toThrow();
  });

  //test the map functionality
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
    tick(); //process ops

    expect(mockDataService.getMapData).toHaveBeenCalledWith('Test Address');
    expect(component.mapData).toEqual(mockMapData);
    expect(component.mapLoading).toBeFalse();
  }));

  it('should handle search location error', fakeAsync(() => {
    component.searchAddress = 'Invalid Address';
    mockDataService.getMapData.and.returnValue(throwError(() => ({ status: 404 })));
    component.mapLoading = false;

    component.searchLocation();
    tick(); //async ops process

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

  //Test map pin functionality
  it('should set map pin', () => {
    component.setMapPin(40.7128, -74.0060, 'Test Location');

    expect(component.mapPin).toEqual({
      lat: 40.7128,
      lon: -74.0060,
      address: 'Test Location'
    });
  });


  it('should use location for new venue', () => {
    component.mapPin = { lat: 40.7128, lon: -74.0060, address: 'Test Location' };
    component.addingVenue = true;
    component.newVenueData = {};

    component.useLocationForVenue();

    expect(component.newVenueData.address).toBe('Test Location');
  });

  //added in 
  it('should return correct venue type labels', () => {
    expect(component.getVenueTypeLabel('hotel')).toBe('Hotel & Resort');
    expect(component.getVenueTypeLabel('event_space')).toBe('Event Space');
    expect(component.getVenueTypeLabel('unknown')).toBe('Venue');
  });

  //navigation for track orders
  it('should navigate to track orders', () => {
    component.trackorders();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/trackorders']);
  });













  

it('should early-return in createVenueCompany when form is invalid', async () => {
  
  component.hasVenueCompany = true;
  const spyWait = spyOn<any>(component as any, 'waitForUser').and.resolveTo({ uid: 'u1' });

  await component.createVenueCompany();

  expect(spyWait).not.toHaveBeenCalled();
  expect(component.hasVenueCompany).toBeTrue(); //keep as is, since was working before
});


it('should early-return in createVenueCompany when user is null', async () => {
  component.form.setValue({
    companyName: 'ACME Venues',
    companyEmail: 'acme@example.com',
    companyNumber: '0123456789'
  });
  component.hasVenueCompany = false; 
  const spyWait = spyOn<any>(component as any, 'waitForUser').and.resolveTo(null);

  await component.createVenueCompany();

  expect(spyWait).toHaveBeenCalled();
  expect(component.hasVenueCompany).toBeFalse(); 
});








  it('SubmitUpdate: success path updates images, clears state, refetches', async () => {
    component.user = { uid: 'u123' } as any;
    component.editingVenue = {
      id: 'v1',
      images: [{ name: 'a.jpg' }, { name: 'b.jpg' }]
    };
    component.updateData = {
      venuename: 'Hall A',
      imagesToDelete: [true, false] //delete first one only
    };
    spyOn(component, 'fetchVenues');

    mockHttpClient.put.and.returnValue(of({ images: [{ name: 'new1' }, { name: 'new2' }] }));
    spyOn(window, 'alert');

    await component.SubmitUpdate();

    expect(mockHttpClient.put).toHaveBeenCalled();
    //editVenue cleared after success
    expect(component.editingVenue).toBeNull();
    expect(component.fetchVenues).toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith('Venue updated successfully!');
    expect(component.loading).toBeFalse();
    expect(component.newUpdateFiles).toBeNull();
  });

  it('SubmitUpdate: error path shows alert and keeps editingVenue', async () => {
    component.user = { uid: 'u123' } as any;
    component.editingVenue = { id: 'v1', images: [{ name: 'a.jpg' }] };
    component.updateData = { imagesToDelete: [false] };
    mockHttpClient.put.and.returnValue(throwError(() => new Error('boom')));
    spyOn(window, 'alert');
    spyOn(console, 'error');

    await component.SubmitUpdate();

    expect(window.alert).toHaveBeenCalledWith('Failed to update venue.');
    //on failure, stays in edit mode
    expect(component.editingVenue).not.toBeNull();
    expect(component.loading).toBeFalse();
  });

  it('SubmitNewVenue: success path posts formData, resets flags and refetches', fakeAsync(() => {
    component.user = { uid: 'u99' } as any;
    component.addingVenue = true;
    component.newVenueData = {
      venuename: 'New V',
      description: 'desc',
      address: 'addr',
      email: 'v@e.com',
      phonenumber: '0123',
      capacity: 10,
      price: 1000,
      status: 'pending'
    } as any;
    //incl selected file
    component.selectedFiles = [{ name: 'p1.png' }] as any;

    spyOn(component, 'fetchVenues');
    spyOn(window, 'alert');
    mockHttpClient.post.and.returnValue(of({}));
    component.newVenueData.images = ['dummy'] as any; //ensures the delete line executes


    component.SubmitNewVenue();
    tick();

    expect(mockHttpClient.post).toHaveBeenCalled();
    expect(component.addingVenue).toBeFalse();
    expect(component.fetchVenues).toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith('New venue added successfully!');
    expect(component.loading).toBeFalse();
  }));

  it('SubmitNewVenue: error path shows alert and clears loading', fakeAsync(() => {
    component.user = { uid: 'u99' } as any;
    component.addingVenue = true;
    component.newVenueData = { venuename: 'X' } as any;

    spyOn(window, 'alert');
    mockHttpClient.post.and.returnValue(throwError(() => new Error('add fail')));

    component.SubmitNewVenue();
    tick();

    expect(window.alert).toHaveBeenCalledWith('Failed to add venue.');
    expect(component.loading).toBeFalse();
  }));

  it('fetchNotifications: success maps + sorts + counts unread', async () => {
    component.user = { uid: 'notif-user' } as any;
    mockHttpClient.get.and.returnValue(of({
      notifications: [
        { id: '2', read: true,  date: 1, from: 'a' },
        { id: '1', read: false, date: 2, from: 'b' }
      ]
    }));

    await component.fetchNotifications();

    expect(mockHttpClient.get).toHaveBeenCalled();
    expect(component.notifications.length).toBe(2);
    //unread first because of saorting by read flag
    expect(component.notifications[0].read).toBeFalse();
    expect(component.unreadCount).toBe(1);
  });

  it('fetchNotifications: error path clears list and unreadCount', async () => {
    component.user = { uid: 'notif-user' } as any;
    mockHttpClient.get.and.returnValue(throwError(() => new Error('net')));
    spyOn(console, 'error');

    await component.fetchNotifications();

    expect(component.notifications).toEqual([]);
    expect(component.unreadCount).toBe(0);
  });

  it('goToNotifications navigates with state', () => {
    (component as any).router.url = '/manageservices';
    component.goToNotifications();
    expect(mockRouter.navigate).toHaveBeenCalledWith(
      ['/notifications'],
      { state: { from: '/manageservices' } }
    );
  });

  it('useLocationForVenue applies to editing path', () => {
    component.mapPin = { lat: 1, lon: 2, address: 'Addr' };
    component.editingVenue = { id: 'e1' };
    component.updateData = {};
    component.useLocationForVenue();
    expect(component.updateData.address).toBe('Addr');
  });

  it('setMapPin triggers nearby places fetch (happy path)', fakeAsync(() => {
    mockDataService.getNearbyPlaces.and.returnValue(of([{ name: 'A' }, { name: 'B' }, { name: 'C' }]));
    component.mapError = null;

    component.setMapPin(10, 20, 'Somewhere');
    tick();

    //10 max, have 3 here
    expect(component.nearbyPlaces.length).toBe(3);
    expect(mockDataService.getNearbyPlaces).toHaveBeenCalledWith(10, 20);
  }));

  it('onLeafletMapClick: when map service temporarily unavailable, directly sets pin', () => {
    component.mapError = 'Map service temporarily unavailable';
    const spy = spyOn(component, 'setMapPin');
    (component as any).onLeafletMapClick(11.1111, 22.2222);
    expect(spy).toHaveBeenCalled();
    const addr = (spy.calls.argsFor(0)[2] as string);
    expect(addr).toContain('11.1111');
    expect(addr).toContain('22.2222');
  });

  it('onLeafletMapClick: reverse geocode success uses display_name', fakeAsync(() => {
    component.mapError = null;
    mockDataService.getMapData.and.returnValue(of({ display_name: 'Nice Place' }));
    const spy = spyOn(component, 'setMapPin');

    (component as any).onLeafletMapClick(-26.2, 28.0);
    tick();

    expect(mockDataService.getMapData).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith(-26.2, 28.0, 'Nice Place');
    expect(component.mapLoading).toBeFalse();
  }));

  it('onLeafletMapClick: reverse geocode failure falls back to coords string', fakeAsync(() => {
    component.mapError = null;
    mockDataService.getMapData.and.returnValue(throwError(() => new Error('rg fail')));
    const spy = spyOn(component, 'setMapPin');

    (component as any).onLeafletMapClick(1.23456, 2.34567);
    tick();

    expect(spy).toHaveBeenCalled();
    const addr = (spy.calls.argsFor(0)[2] as string);
    expect(addr).toContain('1.2346'); 
    expect(addr).toContain('2.3457');
    expect(component.mapLoading).toBeFalse();
  }));

  it('toggleMap hides and removes an existing map instance', () => {
    //Fake map initialized
    (component as any).mapVisible = true;
    const fakeMap = { remove: jasmine.createSpy('remove') };
    (component as any).map = fakeMap as any;
    (component as any).currentMarker = {} as any;

    component.toggleMap(); //when toggle foes to false, map removed

    expect(fakeMap.remove).toHaveBeenCalled();
    expect((component as any).map).toBeNull();
    expect((component as any).currentMarker).toBeNull();
  });
























it('fixLeafletIcons sets default marker icon (covers ~463)', () => {
  const originalOptions = (L.Marker as any).prototype.options;
  (L.Marker as any).prototype.options = {}; //empty

  (component as any).fixLeafletIcons();

  expect((L.Marker as any).prototype.options.icon).toBeDefined();

 //restore to original
  (L.Marker as any).prototype.options = originalOptions;
});


  it('ngOnDestroy removes map if present (covers ~468-469)', () => {
    const fakeMap = { remove: jasmine.createSpy('remove') };
    (component as any).map = fakeMap as any;

    component.ngOnDestroy();

    expect(fakeMap.remove).toHaveBeenCalled();
    expect((component as any).map).toBeNull();
  });

it('searchLocation pans map when available (covers ~487)', fakeAsync(() => {
  component.searchAddress = 'Some place';
  //leaflet marker().addTo(map) is going to call map.addLayer(...) for test
  (component as any).map = {
    setView: jasmine.createSpy('setView'),
    addLayer: jasmine.createSpy('addLayer'),
    remove: jasmine.createSpy('remove')
  } as any;

  const mockMapData = { lat: 1, lon: 2, display_name: 'X' };
  (mockDataService.getMapData as jasmine.Spy).and.returnValue(of(mockMapData));

  component.searchLocation();
  tick();

  expect((component as any).map.setView).toHaveBeenCalledWith([1, 2], 13);

 //exclude ngdestroy

}));


  it('searchLocation shows "temporarily unavailable" when backend down (covers ~497)', fakeAsync(() => {
    component.searchAddress = 'Anywhere';
    (mockDataService.getMapData as jasmine.Spy).and.returnValue(
      throwError(() => ({ status: 0 }))    //temp unavailable branch
    );

    component.searchLocation();
    tick();

    expect(component.mapError).toContain('temporarily unavailable');
    expect(component.mapLoading).toBeFalse();
  }));

it('setMapPin removes existing marker and creates new one (covers ~534-539)', () => {
  const fakeMap = {
    removeLayer: jasmine.createSpy('removeLayer'),
    addLayer: jasmine.createSpy('addLayer'),
    remove: jasmine.createSpy('remove'),
  };
  (component as any).map = fakeMap as any;
  (component as any).currentMarker = {} as any; 

  component.setMapPin(5, 6, 'Addr');

  expect(fakeMap.removeLayer).toHaveBeenCalled();   //remove old check
  expect((component as any).currentMarker).toBeTruthy();  
});





  it('loadNearbyPlaces error path clears list (covers ~559-560)', fakeAsync(() => {
    component.mapError = null;   //loads nearby places
    //error ch
    (mockDataService.getNearbyPlaces as jasmine.Spy).and.returnValue(
      throwError(() => new Error('oops'))
    );

    //we dont need to make a real map here since setMappin will load closeby places
     component.setMapPin(10, 20, 'Somewhere');
    tick();

    expect(component.nearbyPlaces).toEqual([]);
  }));























  



it('initializeLeafletMap: sets mapError when container is missing', () => {
  const getElSpy = spyOn(document, 'getElementById').and.returnValue(null as any);
  const errSpy = spyOn(console, 'error');

  (component as any).initializeLeafletMap();

  expect(getElSpy).toHaveBeenCalledWith('leaflet-map');
  expect(errSpy).toHaveBeenCalled();    //to log an error ie from component
  expect(component.mapError).toContain('Map container not found');
  expect(component.mapLoading).toBeFalse();
  expect((component as any).map).toBeNull();
});























it('attemptMapInitialization initializes immediately when container is ready', fakeAsync(() => {
  spyOn(document, 'getElementById').and.returnValue({ offsetWidth: 100, offsetHeight: 100 } as any);
  const initSpy = spyOn<any>(component as any, 'initializeLeafletMap').and.stub();

  (component as any).attemptMapInitialization(0);
  tick(100); //100ms

  expect(initSpy).toHaveBeenCalled();
}));

it('attemptMapInitialization sets mapError after max retries', fakeAsync(() => {
  spyOn(document, 'getElementById').and.returnValue({ offsetWidth: 0, offsetHeight: 0 } as any);
  (component as any).mapError = null;
  (component as any).mapLoading = true;

  (component as any).attemptMapInitialization(4);
  tick(100 + 4 * 100);

  expect(component.mapError).toContain('failed to load');
  expect(component.mapLoading).toBeFalse();
}));















it('createVenueCompany: handles Firestore error and alerts (covers 170–191 catch)', async () => {
  component.form.setValue({
    companyName: 'V Co',
    companyEmail: 'v@co.com',
    companyNumber: '0123456789'
  });

  const waitSpy = spyOn<any>(component as any, 'waitForUser').and.resolveTo({ uid: 'u-err' });
  spyOn(window, 'alert');
  spyOn(console, 'error');

  await component.createVenueCompany();

  expect(waitSpy).toHaveBeenCalled();
  expect(window.alert).toHaveBeenCalledWith('Error creating your Venue Company.');
});



it('UpdateVenue initializes imagesToDelete as all false (covers 253–254)', () => {
  const v = { id: '1', images: [{name:'a'},{name:'b'},{name:'c'}] };
  component.UpdateVenue(v as any);

  expect(component.updateData.imagesToDelete).toEqual([false, false, false]);
});
it('SubmitUpdate: appends new files when provided', async () => {
  component.user = { uid: 'u1' } as any;
  component.editingVenue = { id: 'v1', images: [{ name: 'a.jpg' }] };
  component.updateData = { imagesToDelete: [false], venuename: 'X' };

  //fake filelist obj
  const f1 = new Blob(['x'], { type: 'image/png' }) as any;
  const f2 = new Blob(['y'], { type: 'image/png' }) as any;
  component.newUpdateFiles = { 0: f1, 1: f2, length: 2, item: (i: number) => (i === 0 ? f1 : f2) } as any;

  spyOn(window, 'alert');
  spyOn(component, 'fetchVenues');
  (mockHttpClient.put as jasmine.Spy).and.returnValue(of({ images: [{ name: 'z.jpg' }] }));

  await component.SubmitUpdate();

  expect(window.alert).toHaveBeenCalledWith('Venue updated successfully!');
  expect(component.fetchVenues).toHaveBeenCalled();
  expect(component.newUpdateFiles).toBeNull(); 
});
it('SubmitNewVenue: early-returns with alert when no user (covers 302–303)', () => {
  component.user = null;
  spyOn(window, 'alert');
  component.SubmitNewVenue();

  expect(window.alert).toHaveBeenCalledWith('No user logged in!');
  expect(mockHttpClient.post).not.toHaveBeenCalled();
});
it('initializeLeafletMap: success creates a map and sets an initial pin (covers 410–447)', () => {
  //for leaflet to attach
  const el = document.createElement('div');
  el.id = 'leaflet-map';
  el.style.width = '300px';
  el.style.height = '200px';
  document.body.appendChild(el);

  const pinSpy = spyOn(component, 'setMapPin').and.callThrough();

  (component as any).initializeLeafletMap();

  expect((component as any).map).toBeTruthy();
  expect(pinSpy).toHaveBeenCalled();        //initial pin set for spy
  expect(component.mapLoading).toBeFalse(); //loading complete


  component.ngOnDestroy();
  document.body.removeChild(el);
});





it('setMapPin does not load nearby places when mapError is set', () => {
  component.mapError = 'anything truthy';
  const spyNP = (mockDataService.getNearbyPlaces as jasmine.Spy);
  spyNP.calls.reset();

  component.setMapPin(1, 2, 'Addr');

  expect(spyNP).not.toHaveBeenCalled();
});
it('fetchNotifications: early return when no user', async () => {
  component.user = null;
  await component.fetchNotifications();
  expect(mockHttpClient.get).not.toHaveBeenCalled();


});

it('toggleMap: when showing map, calls attemptMapInitialization(0)', () => {
  const spyInit = spyOn<any>(component as any, 'attemptMapInitialization').and.stub();
  component.toggleMap();
  expect(spyInit).toHaveBeenCalledWith(0);
  expect(component.mapVisible).toBeTrue();
});



});











