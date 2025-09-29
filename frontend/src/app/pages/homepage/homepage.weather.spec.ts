import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Homepage } from './homepage';
import { DataService } from '../../core/data.service';
import { AuthService } from '../../core/auth';
import { Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('Homepage – weather fetch', () => {
  let fixture: ComponentFixture<Homepage>;
  let comp: Homepage;
  let dataSvc: jasmine.SpyObj<DataService>;

  beforeEach(async () => {
    dataSvc = jasmine.createSpyObj<DataService>('DataService', [
      'getVenueById',
      'getWeatherCrossing',
    ]);

    await TestBed.configureTestingModule({
      imports: [Homepage],
      providers: [provideHttpClient(), provideHttpClientTesting(),
        { provide: DataService, useValue: dataSvc },
        // Minimal stubs for unrelated deps:
        { provide: AuthService, useValue: { user: () => ({ uid: 'U1' }) } },
        { provide: Router, useValue: { navigate: () => {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Homepage);
    comp = fixture.componentInstance;
  });

  function callFetch(venueId = 'V1', eventDate: any = new Date('2030-01-02T10:00:00Z')) {
    // call the private method through a cast — fine in tests
    (comp as any).fetchVenueAndWeather(venueId, eventDate);
  }

  it('fetchVenueAndWeather success: venue → weather', () => {
    // Arrange
    dataSvc.getVenueById.and.returnValue(of({ address: '221B Baker St' }));
    const weather = { summary: 'Clear', days: [{ precipprob: 10, conditions: 'Clear' }] };
    dataSvc.getWeatherCrossing.and.returnValue(of(weather));

    // Act
    callFetch('V1', new Date('2030-01-02T10:00:00Z'));

    // Assert venue fetch called
    expect(dataSvc.getVenueById).toHaveBeenCalledOnceWith('V1');

    // Assert weather called with address + YYYY-MM-DD
    expect(dataSvc.getWeatherCrossing).toHaveBeenCalledOnceWith('221B Baker St', '2030-01-02');

    // Loading/error flags & data
    expect(comp.weatherLoading).toBeFalse();
    expect(comp.weatherError).toBeNull();
    expect(comp.weather).toEqual(weather);
  });

  it('formats date via toDate() if provided', () => {
    // Arrange: eventDate has toDate()
    const tsLike = { toDate: () => new Date('2031-07-15T08:30:00Z') };
    dataSvc.getVenueById.and.returnValue(of({ address: '10 Downing St' }));
    dataSvc.getWeatherCrossing.and.returnValue(of({ ok: true }));

    // Act
    callFetch('V2', tsLike);

    // YYYY-MM-DD from toDate()
    expect(dataSvc.getWeatherCrossing).toHaveBeenCalledWith('10 Downing St', '2031-07-15');
    expect(comp.weatherLoading).toBeFalse();
    expect(comp.weatherError).toBeNull();
  });

  it('failure at venue fetch → sets "Failed to fetch venue" and stops', () => {
    // Arrange
    dataSvc.getVenueById.and.returnValue(throwError(() => new Error('boom')));

    // Act
    callFetch();

    // Assert: venue error handled, weather NOT called
    expect(dataSvc.getVenueById).toHaveBeenCalled();
    expect(dataSvc.getWeatherCrossing).not.toHaveBeenCalled();

    expect(comp.weatherLoading).toBeFalse();
    expect(comp.weatherError).toBe('Failed to fetch venue');
    expect(comp.weather).toBeNull();
  });

  it('failure at weather fetch → sets "Failed to fetch weather"', () => {
    // Arrange
    dataSvc.getVenueById.and.returnValue(of({ address: '221B Baker St' }));
    dataSvc.getWeatherCrossing.and.returnValue(throwError(() => new Error('nope')));

    // Act
    callFetch('V1', new Date('2030-01-02T10:00:00Z'));

    // Assert: both called, final state reflects weather error
    expect(dataSvc.getVenueById).toHaveBeenCalled();
    expect(dataSvc.getWeatherCrossing).toHaveBeenCalledWith('221B Baker St', '2030-01-02');

    expect(comp.weatherLoading).toBeFalse();
    expect(comp.weatherError).toBe('Failed to fetch weather');
    expect(comp.weather).toBeNull();
  });
});