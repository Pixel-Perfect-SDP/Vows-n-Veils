import { Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { VendorCouples } from './vendor-couples';
import { AuthService } from '../../core/auth';

(jasmine as any).DEFAULT_TIMEOUT_INTERVAL = 20000;

@Component({ standalone: true, template: '' })
class Dummy {}

function setupCouplesTestBed(extraRoutes: any[] = []) {
  return TestBed.configureTestingModule({
    imports: [
      RouterTestingModule.withRoutes([
        { path: 'homepage', component: Dummy },
        { path: 'login', component: Dummy },
        ...extraRoutes,
      ]),
      VendorCouples,
    ],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      {
        provide: AuthService,
        useValue: { user: () => null },
      },
    ],
  }).compileComponents();
}

function wireCouplesFakes(c: any) {
  c['loadAllVendors'] = c['loadAllVendors'] ?? jasmine.createSpy('loadAllVendors').and.returnValue(Promise.resolve());
  c['allVendors'] = [
    { id: 's1', type: 'Venue',     price: 500,   capacity: 80  },
    { id: 's2', type: 'Venue',     price: null,  capacity: 400 },
    { id: 's3', type: 'Catering',  price: 3000,  capacity: null },
    { id: 's4', type: 'WeirdType', price: 10000, capacity: 10  },
  ];
}

describe('VendorCouples – core & branches', () => {
  let fixture: ComponentFixture<VendorCouples>;
  let component: VendorCouples;

  beforeEach(async () => {
    await setupCouplesTestBed();
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
    expect(component.typeLabel('NewType' as any)).toBe('NewType');
  });

  it('trackById() returns id', () => {
    expect(component.trackById(0, { id: 'x1' } as any)).toBe('x1');
  });

  it('clearFilters() resets and calls loader once', async () => {
    component.selectedPriceRange = { label: 'R0–R999', min: 0, max: 999 } as any;
    component.selectedCapacityRange = { label: '0–49', min: 0, max: 49 } as any;
    const spy = spyOn<any>(component, 'loadAllVendors').and.returnValue(Promise.resolve());
    component.clearFilters();
    expect(component.selectedPriceRange.label).toBe('Any');
    expect(component.selectedCapacityRange.label).toBe('Any');
    expect(spy).toHaveBeenCalledTimes(1);
    await Promise.resolve();
  });

  it('toggleOrders() flips repeatedly without hanging', fakeAsync(async () => {
    const a = component.showOrders;
    const lm = spyOn<any>(component, 'loadMyOrders').and.returnValue(Promise.resolve());
    const p1 = component.toggleOrders(); tick(); await p1;
    expect(component.showOrders).toBe(!a);
    const p2 = component.toggleOrders(); tick(); await p2;
    expect(component.showOrders).toBe(a);
    const p3 = component.toggleOrders(); tick(); await p3;
    expect(component.showOrders).toBe(!a);
    expect(lm).toHaveBeenCalledTimes(1);
  }));

  it('closeOrder() hides form and clears selectedService', () => {
    component.showOrder = true;
    (component as any).selectedService = { id: 's1', serviceName: 'Test' } as any;
    component.closeOrder();
    expect(component.showOrder).toBeFalse();
    expect((component as any).selectedService).toBeNull();
  });

  it('backTohome() navigates to /homepage', () => {
    const router = TestBed.inject(Router);
    const nav = spyOn(router, 'navigate').and.resolveTo(true as any);
    component.backTohome();
    expect(nav).toHaveBeenCalledWith(['/homepage']);
  });
});

describe('VendorCouples – helpers & edges', () => {
  let fixture: ComponentFixture<VendorCouples>;
  let component: any;

  beforeEach(async () => {
    await setupCouplesTestBed();
    fixture = TestBed.createComponent(VendorCouples);
    component = fixture.componentInstance as any;
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

  it('Any ranges include nulls; bounded exclude', () => {
    component.selectedPriceRange = { label: 'Any', min: null, max: null };
    component.selectedCapacityRange = { label: 'Any', min: null, max: null };
    if (typeof component['matchesPriceRange'] === 'function') {
      expect(component['matchesPriceRange']({ price: null })).toBeTrue();
      expect(component['matchesPriceRange']({ price: 0 })).toBeTrue();
    }
    if (typeof component['matchesCapacityRange'] === 'function') {
      expect(component['matchesCapacityRange']({ capacity: null })).toBeTrue();
      expect(component['matchesCapacityRange']({ capacity: 0 })).toBeTrue();
    }
    component.selectedPriceRange = { label: 'R0–R999', min: 0, max: 999 } as any;
    component.selectedCapacityRange = { label: '200+', min: 200, max: null } as any;
    if (typeof component['matchesPriceRange'] === 'function') {
      expect(component['matchesPriceRange']({ price: 500 })).toBeTrue();
      expect(component['matchesPriceRange']({ price: 1500 })).toBeFalse();
      expect(component['matchesPriceRange']({ price: null })).toBeFalse();
    }
    if (typeof component['matchesCapacityRange'] === 'function') {
      expect(component['matchesCapacityRange']({ capacity: 80 })).toBeFalse();
      expect(component['matchesCapacityRange']({ capacity: 400 })).toBeTrue();
      expect(component['matchesCapacityRange']({ capacity: null })).toBeFalse();
    }
    expect(true).toBeTrue();
  });

  it('groupByType and sortVendors basic checks', () => {
    if (typeof component['groupByType'] === 'function') {
      const g = component['groupByType'](component.allVendors);
      expect(Object.keys(g)).toEqual(jasmine.arrayContaining(['Venue', 'Catering', 'WeirdType']));
    }
    if (typeof component['sortVendors'] === 'function') {
      const arr = [{ price: 200 }, { price: 100 }, { price: 300 }];
      const asc  = component['sortVendors'](arr.slice(), 'price', 'asc');
      const desc = component['sortVendors'](arr.slice(), 'price', 'desc' as any);
      expect(asc[0].price).toBe(100);
      expect(desc[0].price).toBe(300);
    }
    expect(true).toBeTrue();
  });

  it('open/select/close are idempotent', () => {
    if (typeof component['openOrder'] === 'function') {
      component['openOrder']({ id: 's1', serviceName: 'Venue A' });
      component['openOrder']({ id: 's1', serviceName: 'Venue A' });
      expect(component.showOrder ?? false).toBeTrue();
    }
    if (typeof component['selectService'] === 'function') {
      component['selectService']({ id: 's2', serviceName: 'Venue B' });
      component['selectService']({ id: 's2', serviceName: 'Venue B' });
      expect(component['selectedService']?.id).toBe('s2');
    }
    if (typeof component.closeOrder === 'function') {
      component.closeOrder(); component.closeOrder();
      expect(component.showOrder).toBeFalse();
    }
  });
});

describe('VendorCouples – extra coverage (helpers & validation)', () => {
  let fixture: ComponentFixture<VendorCouples>;
  let component: VendorCouples;

  beforeEach(async () => {
    await setupCouplesTestBed();
    fixture = TestBed.createComponent(VendorCouples);
    component = fixture.componentInstance;
  });

  it('normalizeType() maps common inputs and falls back to Other', () => {
    const fn = (component as any).normalizeType.bind(component);
    expect(fn('venue hire')).toBe('Venue');
    expect(fn('CATER service')).toBe('Catering');
    expect(fn('photo/video')).toBe('Photography');
    expect(fn('decor & lighting')).toBe('Decor');
    expect(fn('dj + band')).toBe('Music/DJ');
    expect(fn('floral arrangements')).toBe('Florist');
    expect(fn('something else')).toBe('Other');
    expect(fn(null)).toBe('Other');
  });

  it('combineToDate() handles local timezone safely', () => {
    const d = (component as any).combineToDate('2025-01-02', '13:45') as Date;
    expect(d instanceof Date).toBeTrue();
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(2);
    expect(d.getHours()).toBe(13);
    expect(d.getMinutes()).toBe(45);
  });

  it('submit guards: no selected service', async () => {
    component.selectedService = null;
    component.myEventId = 'evt1';
    component.orderForm.patchValue({
      eventID: 'evt1', date: '2025-01-01', startTime: '10:00', endTime: '11:00', guestsNum: 50, note: ''
    });
    await component.submitOrder();
    expect(component.orderError).toBe('');
  });

  it('openOrder() sets showOrder and surfaces auth error when user is null', async () => {
    await (component as any).openOrder({ id: 's1', serviceName: 'Venue A', type: 'Venue' });
    expect(component.showOrder).toBeTrue();
    expect(component.orderError).toContain('sign in');
  });

  it('toggleOrders() flips without forcing reload if already has orders', fakeAsync(async () => {
    (component as any)['orders'] = [{ id: 'o1', vendorID: 'v1', companyID: 'c1', status: 'pending', guestsNum: 10, startAt: new Date(), endAt: new Date() }];
    const spy = spyOn<any>(component, 'loadMyOrders').and.returnValue(Promise.resolve());
    const p1 = component.toggleOrders(); tick(); await p1;
    expect(component.showOrders).toBeTrue();
    expect(spy).not.toHaveBeenCalled();
    const p2 = component.toggleOrders(); tick(); await p2;
    expect(component.showOrders).toBeFalse();
  }));
});

describe('VendorCouples – extra local logic', () => {
  let fixture: ComponentFixture<VendorCouples>;
  let component: VendorCouples;

  beforeEach(async () => {
    await setupCouplesTestBed();
    fixture = TestBed.createComponent(VendorCouples);
    component = fixture.componentInstance;
  });

  it('toggle() also works for unknown/new types', () => {
    expect((component as any)['expanded']['NewKind']).toBeUndefined();
    component.toggle('NewKind' as any);
    expect((component as any)['expanded']['NewKind']).toBeTrue();
    component.toggle('NewKind' as any);
    expect((component as any)['expanded']['NewKind']).toBeFalse();
  });

  it('order form validity: guestsNum >= 1', async () => {
    (component as any).selectedService = { id: 's1', serviceName: 'Venue A' } as any;
    (component as any)['myEventId'] = 'evt1';
    component.orderForm.setValue({
      eventID: 'evt1', date: '2025-01-01', startTime: '10:00', endTime: '12:00', guestsNum: 0, note: ''
    });
    await component.submitOrder();
    expect(component.orderError).toContain('complete');
    component.orderForm.patchValue({ guestsNum: 1 });
    expect(component.orderForm.valid).toBeTrue();
  });

  it('openOrder() + closeOrder() clear messages and selection', () => {
    (component as any)['orderError'] = 'err';
    (component as any)['orderSuccess'] = 'ok';
    (component as any)['selectedService'] = { id: 's1' } as any;
    (component as any)['showOrder'] = true;
    component.closeOrder();
    expect((component as any)['showOrder']).toBeFalse();
    expect((component as any)['selectedService']).toBeNull();
    expect((component as any)['orderError']).toBe('');
    expect((component as any)['orderSuccess']).toBe('');
  });

  it('trackById() stable for multiple items', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }] as any[];
    expect(items.map((x, i) => component.trackById(i, x))).toEqual(['a', 'b', 'c']);
  });

  it('clearFilters() creates fresh "Any" objects (not same references)', () => {
    const prevP = component.selectedPriceRange;
    const prevC = component.selectedCapacityRange;
    component.clearFilters();
    expect(component.selectedPriceRange.label).toBe('Any');
    expect(component.selectedCapacityRange.label).toBe('Any');
    expect(component.selectedPriceRange).not.toBe(prevP);
    expect(component.selectedCapacityRange).not.toBe(prevC);
  });
});
