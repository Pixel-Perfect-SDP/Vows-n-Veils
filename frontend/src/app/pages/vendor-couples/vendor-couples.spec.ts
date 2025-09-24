import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router } from '@angular/router';

import { VendorCouples } from './vendor-couples';

describe('VendorCouples (very simple)', () => {
  let fixture: ComponentFixture<VendorCouples>;
  let component: VendorCouples;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        VendorCouples,
        RouterTestingModule,
        HttpClientTestingModule,
      ],
      providers: [
        // keep auth inert
        { provide: (await import('../../core/auth')).AuthService, useValue: { user: () => null } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VendorCouples);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('toggle() should flip expanded state per type without errors', () => {
    for (const t of component.serviceTypes) {
      const before = !!component.expanded[t];
      component.toggle(t);
      expect(component.expanded[t]).toBe(!before);
    }
  });

  it('typeLabel() returns user-friendly labels', () => {
    expect(component.typeLabel('Venue')).toBe('Venues');
    expect(component.typeLabel('Catering')).toBe('Food & Catering');
    expect(component.typeLabel('Photography')).toBe('Photography');
    expect(component.typeLabel('WeirdType')).toBe('WeirdType');
  });

  it('trackById() returns the item id', () => {
    const id = component.trackById(0, { id: 'x123' } as any);
    expect(id).toBe('x123');
  });

  it('clearFilters() resets to Any without throwing', () => {
    component.selectedPriceRange = { label: 'Over R10,000', min: 10000, max: null };
    component.selectedCapacityRange = { label: '200+ guests', min: 200, max: null };
    const orig = component.loadAllVendors;
    (component as any).loadAllVendors = () => Promise.resolve();
    component.clearFilters();
    expect(component.selectedPriceRange.label).toBe('Any');
    expect(component.selectedCapacityRange.label).toBe('Any');
    (component as any).loadAllVendors = orig;
  });



  it('priceRanges and capacityRanges contain an "Any" option', () => {
    expect(component.priceRanges.some(r => r.label === 'Any')).toBeTrue();
    expect(component.capacityRanges.some(r => r.label === 'Any')).toBeTrue();
  });

  it('toggleOrders() flips showOrders flag', () => {
    const start = component.showOrders;
    component.toggleOrders();
    expect(component.showOrders).toBe(!start);
    component.toggleOrders();
    expect(component.showOrders).toBe(start);
  });

  it('closeOrder() hides the form and clears selected service', () => {
    component.showOrder = true;
    (component as any).selectedService = { id: 's1', serviceName: 'Test' };
    component.closeOrder();
    expect(component.showOrder).toBeFalse();
    expect((component as any).selectedService).toBeNull();
  });

  it('backTohome() navigates to /homepage (no route resolution required)', () => {
    const router = TestBed.inject(Router);
    const nav = spyOn(router, 'navigate');
    component.backTohome();
    expect(nav).toHaveBeenCalledWith(['/homepage']);
  });

  it('expanded map toggles correctly regardless of initial value', () => {
    for (const t of component.serviceTypes) {
      const start = !!component.expanded[t];
      component.toggle(t);
      expect(!!component.expanded[t]).toBe(!start);
      component.toggle(t);
      expect(!!component.expanded[t]).toBe(start);
    }
  });

});
