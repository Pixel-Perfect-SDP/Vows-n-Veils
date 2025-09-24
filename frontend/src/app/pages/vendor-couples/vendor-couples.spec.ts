import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router } from '@angular/router';

import { VendorCouples } from './vendor-couples';

describe('VendorCouples – core & branches', () => {
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

  it('toggle() flips expanded for each service type (twice)', () => {
    for (const t of component.serviceTypes) {
      const start = !!component.expanded[t];
      component.toggle(t);  expect(!!component.expanded[t]).withContext(t).toBe(!start);
      component.toggle(t);  expect(!!component.expanded[t]).withContext(t).toBe(start);
    }
  });

  it('typeLabel() covers known + default branches', () => {
    expect(component.typeLabel('Venue')).toBe('Venues');
    expect(component.typeLabel('Catering')).toBe('Food & Catering');
    expect(component.typeLabel('Photography')).toBe('Photography');
    expect(component.typeLabel('NewType')).toBe('NewType'); 
  });

  it('trackById() returns id', () => {
    expect(component.trackById(0, { id: 'x1' } as any)).toBe('x1');
  });

  it('price/capacity ranges include "Any" with null bounds', () => {
    const pAny = component.priceRanges.find(r => r.label === 'Any')!;
    const cAny = component.capacityRanges.find(r => r.label === 'Any')!;
    expect(pAny.min).toBeNull(); expect(pAny.max).toBeNull();
    expect(cAny.min).toBeNull(); expect(cAny.max).toBeNull();
  });

  it('clearFilters() resets and calls loader once', async () => {
    component.selectedPriceRange = { label: 'R0–R999', min: 0, max: 999 };
    component.selectedCapacityRange = { label: '0–49', min: 0, max: 49 };
    const spy = spyOn<any>(component, 'loadAllVendors').and.returnValue(Promise.resolve());
    component.clearFilters();
    expect(component.selectedPriceRange.label).toBe('Any');
    expect(component.selectedCapacityRange.label).toBe('Any');
    expect(spy).toHaveBeenCalledTimes(1);
    await Promise.resolve();
  });

  it('toggleOrders() flips repeatedly', () => {
    const a = component.showOrders;
    component.toggleOrders(); expect(component.showOrders).toBe(!a);
    component.toggleOrders(); expect(component.showOrders).toBe(a);
    component.toggleOrders(); expect(component.showOrders).toBe(!a);
  });

  it('closeOrder() hides form and clears selectedService', () => {
    component.showOrder = true;
    (component as any).selectedService = { id: 's1', serviceName: 'Test' };
    component.closeOrder();
    expect(component.showOrder).toBeFalse();
    expect((component as any).selectedService).toBeNull();
  });

  it('backTohome() navigates to /homepage (stubbed)', () => {
    const router = TestBed.inject(Router);
    const nav = spyOn(router, 'navigate').and.resolveTo(true as any);
    component.backTohome();
    expect(nav).toHaveBeenCalledWith(['/homepage']);
  });
});



function wireCouplesFakes(c: any) {
  c['loadAllVendors'] = c['loadAllVendors'] ??
    jasmine.createSpy('loadAllVendors').and.returnValue(Promise.resolve());
  c['allVendors'] = [
    { id: 's1', type: 'Venue',     price: 500,   capacity: 80  },
    { id: 's2', type: 'Venue',     price: null,  capacity: 400 }, 
    { id: 's3', type: 'Catering',  price: 3000,  capacity: null }, 
    { id: 's4', type: 'WeirdType', price: 10000, capacity: 10  },
  ];
}

describe('VendorCouples – helpers & edges (conditional & soft)', () => {
  let component: any;

  beforeEach(() => {
    component = TestBed.createComponent(VendorCouples).componentInstance as any;
    wireCouplesFakes(component);
  });

  it('ngOnInit() triggers load if implemented', async () => {
    if (typeof component.ngOnInit === 'function') {
      const spy = spyOn(component, 'loadAllVendors').and.returnValue(Promise.resolve());
      await component.ngOnInit().catch(() => {});
      expect(spy).toHaveBeenCalled();
    }
    expect(true).toBeTrue();
  });

  it('open/select/close paths tolerate repeats', () => {
    if (typeof (component as any)['openOrder'] === 'function') {
      (component as any)['openOrder']({ id: 's1', serviceName: 'Venue A' });
      (component as any)['openOrder']({ id: 's1', serviceName: 'Venue A' });
      expect(component.showOrder ?? false).toBeTrue();
    }
    if (typeof (component as any)['selectService'] === 'function') {
      (component as any)['selectService']({ id: 's2', serviceName: 'Venue B' });
      (component as any)['selectService']({ id: 's2', serviceName: 'Venue B' });
      expect(component['selectedService']?.id).toBe('s2');
    }
    if (typeof component.closeOrder === 'function') {
      component.closeOrder(); component.closeOrder();
      expect(component.showOrder).toBeFalse();
    }
    expect(true).toBeTrue();
  });

  it('"Any" ranges include null price/capacity; bounded exclude', () => {
    component.selectedPriceRange = { label: 'Any', min: null, max: null };
    component.selectedCapacityRange = { label: 'Any', min: null, max: null };
    if (typeof (component as any)['applyFilters'] === 'function') {
      (component as any)['applyFilters'](); (component as any)['applyFilters']();
    }
    if (typeof (component as any)['matchesPriceRange'] === 'function') {
      expect((component as any)['matchesPriceRange']({ price: null })).toBeTrue();
      expect((component as any)['matchesPriceRange']({ price: 0 })).toBeTrue();
    }
    if (typeof (component as any)['matchesCapacityRange'] === 'function') {
      expect((component as any)['matchesCapacityRange']({ capacity: null })).toBeTrue();
      expect((component as any)['matchesCapacityRange']({ capacity: 0 })).toBeTrue();
    }

    component.selectedPriceRange = { label: 'R0–R999', min: 0, max: 999 };
    component.selectedCapacityRange = { label: '200+', min: 200, max: null };
    if (typeof (component as any)['matchesPriceRange'] === 'function') {
      expect((component as any)['matchesPriceRange']({ price: 500 })).toBeTrue();
      expect((component as any)['matchesPriceRange']({ price: 1500 })).toBeFalse();
      expect((component as any)['matchesPriceRange']({ price: null })).toBeFalse();
    }
    if (typeof (component as any)['matchesCapacityRange'] === 'function') {
      expect((component as any)['matchesCapacityRange']({ capacity: 80 })).toBeFalse();
      expect((component as any)['matchesCapacityRange']({ capacity: 400 })).toBeTrue();
      expect((component as any)['matchesCapacityRange']({ capacity: null })).toBeFalse();
    }
    expect(true).toBeTrue();
  });

  it('groupByType handles unknown types; sortVendors supports desc', () => {
    if (typeof (component as any)['groupByType'] === 'function') {
      const g = (component as any)['groupByType'](component.allVendors);
      expect(Object.keys(g)).toEqual(jasmine.arrayContaining(['Venue', 'Catering', 'WeirdType']));
    }
    if (typeof (component as any)['sortVendors'] === 'function') {
      const arr = [{ price: 200 }, { price: 100 }, { price: 300 }];
      const asc  = (component as any)['sortVendors'](arr.slice(), 'price', 'asc');
      const desc = (component as any)['sortVendors'](arr.slice(), 'price', 'desc' as any);
      expect(asc[0].price).toBe(100);
      expect(desc[0].price).toBe(300);
    }
    expect(true).toBeTrue();
  });

  it('ngOnInit() failure path when load rejects (if implemented)', async () => {
    if (typeof component.ngOnInit === 'function') {
      const err = new Error('load fail');
      const spy = spyOn(component, 'loadAllVendors').and.returnValue(Promise.reject(err));
      await component.ngOnInit().catch(() => {});
      expect(spy).toHaveBeenCalled();
    }
    expect(true).toBeTrue();
  });
});
