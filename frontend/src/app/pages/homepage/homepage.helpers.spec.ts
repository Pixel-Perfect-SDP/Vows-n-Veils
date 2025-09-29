import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Homepage } from './homepage';
import { AuthService } from '../../core/auth';
import { DataService } from '../../core/data.service';
import { of } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('Homepage (helpers & small toggles)', () => {
  let fixture: ComponentFixture<Homepage>;
  let comp: Homepage;

  // Minimal mocks – these won’t be exercised in this spec
  const mockAuth = {
    user: () => ({ uid: 'U1', email: 'u@mail.test' }),
  } as Partial<AuthService>;

  const mockData = {
    getVenueById: jasmine.createSpy().and.returnValue(of({ address: '123 Street' })),
    getWeatherCrossing: jasmine.createSpy().and.returnValue(of({})),
    getGuestsByEvent: jasmine.createSpy().and.returnValue(of([])),
    getGuestFilterOptions: jasmine.createSpy().and.returnValue(of({ dietary: [], allergies: [] })),
    postGuest: jasmine.createSpy().and.returnValue(of({})),
    deleteGuest: jasmine.createSpy().and.returnValue(of({})),
    downloadGuestsCsv: jasmine.createSpy().and.returnValue(of(new Blob(['csv']))),
    downloadGuestsPdf: jasmine.createSpy().and.returnValue(of(new Blob(['pdf']))),
  } as unknown as DataService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Homepage],
      providers: [provideHttpClient(), provideHttpClientTesting(),
        { provide: AuthService, useValue: mockAuth },
        { provide: DataService, useValue: mockData },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Homepage);
    comp = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ---------- Weather helpers ----------
  it('getPrecipPercent returns rounded percent or null', () => {
    expect(comp.getPrecipPercent({ precipprob: 42.2 })).toBe(42);
    expect(comp.getPrecipPercent({ precipprob: '18.7' })).toBe(19);
    expect(comp.getPrecipPercent({})).toBeNull();
    expect(comp.getPrecipPercent({ precipprob: null })).toBeNull();
    expect(comp.getPrecipPercent({ precipprob: 'abc' })).toBeNull();
  });

  it('getConditionLabel: trims and falls back to —', () => {
    expect(comp.getConditionLabel({ conditions: '  Sunny ' })).toBe('Sunny');
    expect(comp.getConditionLabel({ conditions: '' })).toBe('—');
    expect(comp.getConditionLabel({})).toBe('—');
  });

  it('getWeatherIconClass picks an icon from conditions + precipprob', () => {
    expect(comp.getWeatherIconClass({ conditions: 'Clear skies', precipprob: 0 })).toBe('icon-clear');
    expect(comp.getWeatherIconClass({ conditions: 'Overcast clouds' })).toBe('icon-overcast');
    expect(comp.getWeatherIconClass({ conditions: 'Snow showers' })).toBe('icon-snow');
    // precip > 50 should force rain, even if condition says clear
    expect(comp.getWeatherIconClass({ conditions: 'clear', precipprob: 60 })).toBe('icon-rain');
  });

  // ---------- UI toggles ----------
  it('toggleAddGuest toggles form visibility and resets when closing', () => {
    // starts hidden
    expect(comp.showAddGuest).toBeFalse();

    // open
    comp.toggleAddGuest();
    expect(comp.showAddGuest).toBeTrue();

    // put some value into the form then close
    comp.addGuestForm.patchValue({ Name: 'Alice' });
    comp.toggleAddGuest();
    expect(comp.showAddGuest).toBeFalse();
    expect(comp.addGuestForm.value.Name).toBe(''); // reset to ''
  });

  // ---------- Export helpers ----------
  it('makeExportOpts reflects selected filters', () => {
    // by default 'all' means no rsvp param
    comp.selectedDietary = null;
    comp.selectedAllergy = null;
    comp.selectedRsvp = 'all';
    expect((comp as any).makeExportOpts()).toEqual({});

    comp.selectedDietary = 'vegan';
    comp.selectedAllergy = 'nuts';
    comp.selectedRsvp = 'true';
    expect((comp as any).makeExportOpts()).toEqual({ dietary: 'vegan', allergy: 'nuts', rsvp: true });

    comp.selectedRsvp = 'false';
    expect((comp as any).makeExportOpts()).toEqual({ dietary: 'vegan', allergy: 'nuts', rsvp: false });
  });

  it('buildFilename includes only active filters', () => {
    comp.selectedDietary = null;
    comp.selectedAllergy = null;
    comp.selectedRsvp = 'all';
    expect((comp as any).buildFilename('csv')).toBe('guest-list.csv');

    comp.selectedDietary = 'vegan';
    comp.selectedAllergy = 'nuts';
    comp.selectedRsvp = 'true';
    expect((comp as any).buildFilename('pdf'))
      .toBe('guest-list-diet_vegan-allergy_nuts-rsvp_true.pdf');
  });
});
