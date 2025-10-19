import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Homepage } from './homepage';
import { AuthService } from '../../core/auth';
import { DataService } from '../../core/data.service';
import { provideRouter } from '@angular/router';

describe('Homepage – nearby trail helpers', () => {
  let fixture: ComponentFixture<Homepage>;
  let comp: Homepage;
  let httpMock: HttpTestingController;

  const authStub = { user: () => ({ uid: 'U1' }) } as Partial<AuthService>;
  const dataServiceStub = {} as DataService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Homepage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authStub },
        { provide: DataService, useValue: dataServiceStub },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Homepage);
    comp = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  const trailsUrl = 'https://orion-api-qeyv.onrender.com/api/trails/near?latitude=-26.000&longitude=28.000';

  it('fetchNearbyTrail normalises trail payload', () => {
    comp.fetchNearbyTrail();

    const req = httpMock.expectOne(trailsUrl);
    expect(req.request.method).toBe('GET');

    req.flush({
      success: true,
      data: [{
        id: 'trail-1',
        title: 'Sunset Trail',
        description: 'Scenic view',
        distance: 12.4,
        level: 'Easy',
        photos: ['a.jpg', 'b.jpg'],
        location: { latitude: -25.99, longitude: 27.99 },
      }],
    });

    expect(comp.nearbyTrailLoading).toBeFalse();
    expect(comp.nearbyTrailError).toBeNull();
    expect(comp.nearbyTrail).toEqual(jasmine.objectContaining({
      id: 'trail-1',
      name: 'Sunset Trail',
      description: 'Scenic view',
      distance: 12.4,
      difficulty: 'Easy',
      photos: ['a.jpg', 'b.jpg'],
      location: {
        _latitude: -25.99,
        _longitude: 27.99,
        latitude: -25.99,
        longitude: 27.99,
      },
    }));
  });

  it('fetchNearbyTrail handles empty results', () => {
    comp.fetchNearbyTrail();

    const req = httpMock.expectOne(trailsUrl);
    req.flush({ success: true, data: [] });

    expect(comp.nearbyTrailLoading).toBeFalse();
    expect(comp.nearbyTrail).toBeNull();
    expect(comp.nearbyTrailError).toBe('No nearby trails found');
  });

  it('fetchNearbyTrail marks parse failure when payload access throws', () => {
    spyOn(console, 'error');

    comp.fetchNearbyTrail();

    const req = httpMock.expectOne(trailsUrl);
    req.flush({
      success: true,
      get data() {
        throw new Error('bad payload');
      },
    });

    expect(console.error).toHaveBeenCalled();
    expect(comp.nearbyTrailLoading).toBeFalse();
    expect(comp.nearbyTrailError).toBe('Failed to parse trail data');
  });

  it('fetchNearbyTrail marks HTTP failures', () => {
    spyOn(console, 'error');

    comp.fetchNearbyTrail();

    const req = httpMock.expectOne(trailsUrl);
    req.error(new ProgressEvent('Network'), { status: 500, statusText: 'Server Error' });

    expect(console.error).toHaveBeenCalled();
    expect(comp.nearbyTrailLoading).toBeFalse();
    expect(comp.nearbyTrailError).toBe('Failed to fetch nearby trail');
  });

  describe('getGoogleMapsLink', () => {
    it('returns a maps search URL when coordinates exist', () => {
      const link = comp.getGoogleMapsLink({
        location: { _latitude: -25.9, _longitude: 27.8 },
      });
      expect(link).toBe('https://www.google.com/maps/search/?api=1&query=-25.9%2C27.8');
    });

    it('falls back to maps homepage when data incomplete', () => {
      expect(comp.getGoogleMapsLink(null)).toBe('https://maps.google.com');
      expect(comp.getGoogleMapsLink({ location: { latitude: null } })).toBe('https://maps.google.com');
    });
  });
});
