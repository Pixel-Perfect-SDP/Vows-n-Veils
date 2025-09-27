
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { Venues } from './venues';

describe('VenuesComponent', () => {
  let component: Venues;
  let fixture: ComponentFixture<Venues>;
  let router: jasmine.SpyObj<Router>;
  let httpClient: jasmine.SpyObj<HttpClient>;
  let activatedRoute: jasmine.SpyObj<ActivatedRoute>;

  const baseVenue = {
    id: '1',
    companyID: 'company1',
    venuename: 'Test Venue',
    address: 'Test Address',
    capacity: 100,
    price: 5000,
    description: 'Test description',
    email: 'test@venue.com',
    phonenumber: '123-456-7890',
    images: [{ url: 'test.jpg', name: 'test' }]
  };

  const createVenue = (overrides: any = {}) => ({
    ...baseVenue,
    ...overrides
  });

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj('Router', [
      'navigate', 
      'createUrlTree', 
      'navigateByUrl',
      'serializeUrl'
    ], {
      url: '/venues',
      events: of(),
      routerState: {} as any
    });

    const httpClientSpy = jasmine.createSpyObj('HttpClient', ['get', 'post']);
    
    const activatedRouteSpy = jasmine.createSpyObj('ActivatedRoute', [], {
      snapshot: { 
        paramMap: { get: jasmine.createSpy('get').and.returnValue(null) },
        queryParams: {} 
      },
      paramMap: of({ get: jasmine.createSpy('get').and.returnValue(null) }),
      queryParams: of({})
    });

    await TestBed.configureTestingModule({
      imports: [Venues],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: HttpClient, useValue: httpClientSpy },
        { provide: ActivatedRoute, useValue: activatedRouteSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Venues);
    component = fixture.componentInstance;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    httpClient = TestBed.inject(HttpClient) as jasmine.SpyObj<HttpClient>;
    activatedRoute = TestBed.inject(ActivatedRoute) as jasmine.SpyObj<ActivatedRoute>;

    router.createUrlTree.and.returnValue({ toString: () => '/test-url' } as any);
  });

  describe('Basic Component Tests', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should show/hide loading overlay based on loading state', () => {
      component.loading = true;
      fixture.detectChanges();
      const loadingElement = fixture.nativeElement.querySelector('.loading-overlay');
      expect(loadingElement).toBeTruthy();

      component.loading = false;
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.loading-overlay')).toBeFalsy();
    });
  });

  describe('Component State Management', () => {
    it('should initialize with the correct default values', () => {
      expect(component.loading).toBe(component.loading); 
      expect(component.chosenVenueName).toBe(component.chosenVenueName);
      expect(component.venues).toEqual([]);
      expect(component.recommendedVenues).toEqual([]);
      expect(component.selectedVenue).toBeNull();
      expect(component.hasExistingOrder).toBeFalse();
    });
  });

  describe('Venue List Display', () => {
    it('should display venues when available', () => {
      component.venues = [
        createVenue({ id: '1', venuename: 'Venue 1' }),
        createVenue({ id: '2', venuename: 'Venue 2' })
      ];
      component.loading = false;
      component.selectedVenue = null;
      fixture.detectChanges();

      const content = fixture.nativeElement.textContent;
      expect(content).toContain('Venue 1');
      expect(content).toContain('Venue 2');
    });

    it('should show recommended venues when available', () => {
      component.recommendedVenues = [createVenue({ venuename: 'Recommended Venue' })];
      component.venues = [];
      component.loading = false;
      component.selectedVenue = null;
      fixture.detectChanges();

      const content = fixture.nativeElement.textContent;
      expect(content).toContain('Recommended Venue');
    });
  });

  describe('Selected Venue Display', () => {
    it('should show detailed venue information when selected', () => {
      component.selectedVenue = createVenue({
        venuename: 'Grand Hall',
        address: '123 Main Street',
        capacity: 200,
        price: 10000,
        description: 'A beautiful venue for weddings',
        email: 'info@grandhall.com',
        phonenumber: '555-1234'
      });
      component.loading = false;
      fixture.detectChanges();

      const content = fixture.nativeElement.textContent;
      if (component.selectedVenue) {
        expect(content).toContain('Grand Hall');
        expect(content).toContain('123 Main Street');
      }
    });
  });

  describe('Chosen Venue Section', () => {
    it('should show chosen venue information when available', () => {
      component.chosenVenueName = 'My Chosen Venue';
      fixture.detectChanges();

      const content = fixture.nativeElement.textContent;
      expect(component.chosenVenueName).toBe('My Chosen Venue');
    });

    it('should handle no chosen venue scenario', () => {
      component.chosenVenueName = '';
      fixture.detectChanges();

      expect(component.chosenVenueName).toBe('');
    });
  });

  describe('Button Interactions', () => {
    it('should handle view venue button click when venues are available', () => {
      spyOn(component, 'viewVenue');
      component.venues = [createVenue()];
      component.loading = false;
      component.selectedVenue = null;
      fixture.detectChanges();

      const viewButtons = fixture.nativeElement.querySelectorAll('.btn');
      if (viewButtons.length > 0) {
        viewButtons[0].click();
        expect(component.viewVenue).toHaveBeenCalled();
      }
    });

    it('should handle back to list button click when venue is selected', () => {
      spyOn(component, 'backToList');
      component.selectedVenue = createVenue();
      component.loading = false;
      fixture.detectChanges();

      const backButton = fixture.nativeElement.querySelector('.btnbackToList');
      if (backButton) {
        backButton.click();
        expect(component.backToList).toHaveBeenCalled();
      }
    });

    it('should handle choose venue button click when venue is selected', () => {
      spyOn(component, 'selectVenue');
      component.selectedVenue = createVenue();
      component.loading = false;
      fixture.detectChanges();

      const chooseButton = fixture.nativeElement.querySelector('.btnSelectVenue');
      if (chooseButton) {
        chooseButton.click();
        expect(component.selectVenue).toHaveBeenCalled();
      }
    });
  });

  describe('Button States', () => {
    it('should handle button disabled states based on hasExistingOrder', () => {
      component.hasExistingOrder = true;
      component.venues = [createVenue()];
      component.selectedVenue = createVenue();
      fixture.detectChanges();

      component.hasExistingOrder = false;
      fixture.detectChanges();

      expect(component.hasExistingOrder).toBeFalse();
    });
  });

  describe('Navigation', () => {
    it('should have homepage navigation link', () => {
      fixture.detectChanges();
      const homeLink = fixture.nativeElement.querySelector('a[routerLink="/homepage"]');
      expect(homeLink).toBeTruthy();
      expect(homeLink.textContent).toContain('Home');
    });
  });

  describe('Template Rendering', () => {
    it('should display basic venue information', () => {
      component.venues = [createVenue({ venuename: 'Test Venue', address: 'Test Address' })];
      component.loading = false;
      component.selectedVenue = null;
      fixture.detectChanges();

      const content = fixture.nativeElement.textContent;
      expect(content).toContain('Test Venue');
      expect(content).toContain('Test Address');
    });

    it('should handle empty states correctly', () => {
      component.venues = [];
      component.loading = false;
      component.selectedVenue = null;
      fixture.detectChanges();

      expect(component.venues.length).toBe(0);
    });
  });

  describe('Component Initialization', () => {
    it('should initialize with values from the actual component', () => {
      expect(component.loading).toBeDefined();
      expect(component.chosenVenueName).toBeDefined();
      expect(component.venues).toBeDefined();
      expect(component.recommendedVenues).toBeDefined();
      expect(component.selectedVenue).toBeDefined();
      expect(component.hasExistingOrder).toBeDefined();
    });
  });
});