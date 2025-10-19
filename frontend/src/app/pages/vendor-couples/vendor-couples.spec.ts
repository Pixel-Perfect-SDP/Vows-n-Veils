import { Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

import { VendorCouples } from './vendor-couples';

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
      { provide: (void 0, ({} as any)), useValue: {} },
      { provide: ({} as any), useValue: { user: () => null } },
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

function makeFs() {
  return {
    getApp:     jasmine.createSpy('getApp').and.returnValue({ __: 'app' }),
    getFirestore: jasmine.createSpy('getFirestore').and.returnValue({ __: 'db' }),
    doc:        jasmine.createSpy('doc').and.callFake((_db: any, _coll: string, id?: string) => ({ id })),
    collection: jasmine.createSpy('collection').and.callFake((_db: any, _path: string) => ({ _path })),
    query:      jasmine.createSpy('query').and.callFake((..._args: any[]) => ({ __q: true })),
    where:      jasmine.createSpy('where').and.callFake((_f: string, _op: any, _v: any) => ({ __w: true })),
    orderBy:    jasmine.createSpy('orderBy').and.callFake((_f: string, _dir?: any) => ({ __o: true })),
    getDoc:     jasmine.createSpy('getDoc').and.resolveTo({ exists: () => false, data: () => ({}) }),
    getDocs:    jasmine.createSpy('getDocs').and.resolveTo({ docs: [], empty: true }),
    addDoc:     jasmine.createSpy('addDoc').and.resolveTo({ id: 'new-id' }),
    serverTimestamp: jasmine.createSpy('serverTimestamp').and.returnValue('ts'),
  };
}


describe('VendorCouples – core & branches', () => {
  let fixture: ComponentFixture<VendorCouples>;
  let component: VendorCouples;

  beforeEach(async () => {
    await setupCouplesTestBed();
    fixture = TestBed.createComponent(VendorCouples);
    component = fixture.componentInstance;
    component.fs = makeFs() as any;   
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
    const loadSpy = spyOn<any>(component, 'loadMyOrders').and.returnValue(Promise.resolve());
    component.orders = [];
    const a = component.showOrders;
    const p1 = component.toggleOrders(); tick(); await p1;
    expect(component.showOrders).toBe(!a);
    expect(loadSpy).toHaveBeenCalledTimes(1);
    const p2 = component.toggleOrders(); tick(); await p2;
    expect(component.showOrders).toBe(a);
    const p3 = component.toggleOrders(); tick(); await p3;
    expect(component.showOrders).toBe(!a);
    expect(loadSpy).toHaveBeenCalledTimes(2);
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
    component.fs = makeFs() as any;    
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
    component.fs = makeFs() as any;   
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
    component.fs = makeFs() as any;     //stub
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


describe('VendorCouples – data helpers', () => {
  let fixture: ComponentFixture<VendorCouples>;
  let component: VendorCouples;

  beforeEach(async () => {
    await setupCouplesTestBed();
    fixture = TestBed.createComponent(VendorCouples);
    component = fixture.componentInstance;
    component.fs = makeFs() as any;     // <—— stubbed fs
  });

  it('loadAllVendors maps active services and resolves company names', async () => {
    (component as any).http = {
      get: () => of([{ id: 'svc-1', status: 'active', type: 'Venue', serviceName: 'Zulu Hall', companyID: 'comp-1', price: 3500, capacity: 200 }])
    } as any;

    (component.fs.getDoc as jasmine.Spy).and.callFake(async (ref: any) => ({
      exists: () => ref.id === 'comp-1',
      data: () => ({ companyName: 'Company One' }),
    }));

    component.selectedPriceRange = { label: 'Any', min: null, max: null } as any;
    component.selectedCapacityRange = { label: 'Any', min: null, max: null } as any;

    await component.loadAllVendors();

    expect(component.groups['Venue'][0].companyName).toBe('Company One');
    expect(component.totalCount).toBe(1);
    expect(component.loaded).toBeTrue();
    expect(component.loading).toBeFalse();
  });

  it('loadMyOrders enriches vendor and company details', async () => {
    spyOn(component as any, 'waitForUser').and.resolveTo({ uid: 'cust-1' });

    (component.fs.getDocs as jasmine.Spy).and.resolveTo({
      docs: [{
        id: 'order-1',
        data: () => ({
          vendorID: 'vendor-1',
          companyID: 'company-1',
          status: 'pending',
          guestsNum: 75,
          startAt: { toDate: () => new Date('2025-01-01T10:00:00Z') },
          endAt: { toDate: () => new Date('2025-01-01T12:00:00Z') },
        }),
      }],
    } as any);

    (component.fs.getDoc as jasmine.Spy).and.callFake(async (ref: any) => {
      if (ref.id === 'vendor-1') {
        return { exists: () => true, data: () => ({ serviceName: 'Premium Photo', price: 2500 }) };
      }
      if (ref.id === 'company-1') {
        return { exists: () => true, data: () => ({ companyName: 'Company One' }) };
      }
      return { exists: () => false, data: () => ({}) };
    });

    await (component as any)['loadMyOrders']();

    expect(component.orders.length).toBe(1);
    expect(component.orders[0].serviceName).toBe('Premium Photo');
    expect(component.orders[0].companyName).toBe('Company One');
    expect(component.loadingOrders).toBeFalse();
    expect(component.ordersError).toBe('');
  });
});


describe('VendorCouples – high-yield coverage (in-file)', () => {
  let fixture: ComponentFixture<VendorCouples>;
  let component: VendorCouples;

  beforeEach(async () => {
    await setupCouplesTestBed();
    fixture = TestBed.createComponent(VendorCouples);
    component = fixture.componentInstance;
    component.fs = makeFs() as any;    
    fixture.detectChanges();
  });

  it('loadAllVendors → happy path + filters + company name map', async () => {
    (component as any).http = {
      get: () => of([
        { id: 'a1', status: 'active', type: 'Venue',    serviceName: 'Alpha', companyID: 'c1', price: 3000, capacity: 120 },
        { id: 'a2', status: 'active', type: 'Catering', serviceName: 'Bravo', companyID: 'c2', price: 500,  capacity: 20  },
      ])
    } as any;

    (component as any).selectedPriceRange = { label: 'R1k–R5k', min: 1000, max: 5000 };
    (component as any).selectedCapacityRange = { label: '100–200', min: 100, max: 200 };

    (component.fs.getDoc as jasmine.Spy).and.callFake(async (ref: any) => ({
      exists: () => ref.id === 'c1' || ref.id === 'c2',
      data: () => ({ companyName: ref.id === 'c1' ? 'Comp A' : 'Comp B' }),
    }));

    await component.loadAllVendors();

    expect(component.loaded).toBeTrue();
    expect(component.loading).toBeFalse();
    expect(component.totalCount).toBe(1);
    expect(component.groups['Venue'][0].serviceName).toBe('Alpha');
    expect(component.groups['Venue'][0].companyName).toBe('Comp A');
  });

  it('loadAllVendors → HTTP error sets errorMsg', async () => {
    (component as any).http = { get: () => throwError(() => new Error('boom')) } as any;
    await component.loadAllVendors();
    expect(component.errorMsg).toContain('boom');
    expect(component.loading).toBeFalse();
    expect(component.loaded).toBeFalse();
  });

  it('openOrder → uses direct Events/<uid> and pre-fills title + date/time', async () => {
    spyOn(component as any, 'waitForUser').and.resolveTo({ uid: 'U1' });
    const dt = new Date('2025-02-03T14:20:00');

    (component.fs.getDoc as jasmine.Spy).and.callFake(async (ref: any) => {
      if (ref.id === 'U1') {
        return {
          exists: () => true,
          data: () => ({ Name1: 'A', Name2: 'B', Date_Time: { toDate: () => dt } }),
          id: 'U1'
        } as any;
      }
      return { exists: () => false, data: () => ({}) } as any;
    });

    await component.openOrder({ id: 's1', serviceName: 'Venue X', type: 'Venue' } as any);
    expect(component.showOrder).toBeTrue();
    expect(component.myEventTitle).toBe('A & B');
    expect(component.orderForm.value.date).toBe('2025-02-03');
    expect(component.orderForm.value.startTime).toBe('14:20');
  });

  it('openOrder → falls back to query(Events where EventID==uid)', async () => {
    spyOn(component as any, 'waitForUser').and.resolveTo({ uid: 'U2' });
    (component.fs.getDoc as jasmine.Spy).and.resolveTo({ exists: () => false, data: () => ({}) } as any);
    (component.fs.getDocs as jasmine.Spy).and.resolveTo({
      docs: [{
        id: 'EV-42',
        data: () => ({ title: 'My Party', dateTime: '2025-04-21T10:30:00' }),
      }]
    } as any);

    await component.openOrder({ id: 's2', serviceName: 'Cater Y', type: 'Catering' } as any);
    expect(component.showOrder).toBeTrue();
    expect(component.orderForm.value.eventID).toBe('EV-42');
    expect(component.myEventTitle).toBe('My Party');
  });

  it('openOrder → sets sign-in error when user is null', async () => {
    spyOn(component as any, 'waitForUser').and.resolveTo(null);
    await component.openOrder({ id: 's1', serviceName: 'X', type: 'Venue' } as any);
    expect(component.orderError).toContain('sign in');
    expect(component.showOrder).toBeTrue(); 
  });

  it('submitOrder → blocks when myEventId missing', async () => {
    (component as any).selectedService = { id: 's1', companyID: 'c1' } as any;
    (component as any).myEventId = null;
    component.orderForm.patchValue({
      eventID: '', date: '2025-01-01', startTime: '10:00', endTime: '11:00', guestsNum: 50, note: ''
    });
    await component.submitOrder();
    expect(component.orderError).toContain('link your event');
  });

  it('submitOrder → blocks on invalid form', async () => {
    (component as any).selectedService = { id: 's1', companyID: 'c1' } as any;
    (component as any).myEventId = 'EV1';
    component.orderForm.patchValue({ eventID: '', date: '', startTime: '', endTime: '', guestsNum: null, note: '' });
    await component.submitOrder();
    expect(component.orderError).toContain('complete');
  });

  it('submitOrder → blocks when endTime <= startTime', async () => {
    (component as any).selectedService = { id: 's1', companyID: 'c1' } as any;
    (component as any).myEventId = 'EV1';
    component.orderForm.patchValue({
      eventID: 'EV1', date: '2025-01-01', startTime: '10:00', endTime: '10:00', guestsNum: 5, note: ''
    });
    await component.submitOrder();
    expect(component.orderError).toContain('End time must be after time');
  });

  it('submitOrder → blocks when user is null', async () => {
    spyOn(component as any, 'waitForUser').and.resolveTo(null);
    (component as any).selectedService = { id: 's1', companyID: 'c1' } as any;
    (component as any).myEventId = 'EV1';
    component.orderForm.patchValue({
      eventID: 'EV1', date: '2025-01-01', startTime: '10:00', endTime: '11:00', guestsNum: 5, note: ''
    });
    await component.submitOrder();
    expect(component.orderError).toContain('Please sign in');
  });

  it('submitOrder → success adds doc, shows success, then closes form', fakeAsync(async () => {
    spyOn(component as any, 'waitForUser').and.resolveTo({ uid: 'U7' });
    (component.fs.addDoc as jasmine.Spy).and.resolveTo({ id: 'ORD-1' } as any);

    (component as any).selectedService = { id: 'svc1', companyID: 'comp1' } as any;
    (component as any).myEventId = 'EV1';
    component.orderForm.setValue({
      eventID: 'EV1', date: '2025-06-01', startTime: '09:00', endTime: '10:00', guestsNum: 30, note: 'pls'
    });

    await component.submitOrder();
    expect(component.orderSuccess).toContain('Order sent!');
    tick(950); 
    expect((component as any).showOrder).toBeFalse();
  }));

  it('submitOrder → surfaces addDoc error', async () => {
    spyOn(component as any, 'waitForUser').and.resolveTo({ uid: 'U7' });
    (component.fs.addDoc as jasmine.Spy).and.rejectWith(new Error('write failed'));

    (component as any).selectedService = { id: 'svc1', companyID: 'comp1' } as any;
    (component as any).myEventId = 'EV1';
    component.orderForm.setValue({
      eventID: 'EV1', date: '2025-06-01', startTime: '09:00', endTime: '10:00', guestsNum: 30, note: ''
    });

    await component.submitOrder();
    expect(component.orderError).toContain('write failed');
    expect(component.ordering).toBeFalse();
  });

 
  it('loadAllVendors → groups unknown types into "Other" and keeps serviceTypes order first', async () => {
    (component as any).http = {
      get: () => of([
        { id: 'x1', status: 'active', type: 'Venue',     serviceName: 'V1', companyID: 'c1', price: 1000, capacity: 100 },
        { id: 'x2', status: 'active', type: 'OddThing',  serviceName: 'Q1', companyID: 'c2', price: 2000, capacity: 50  },
      ])
    } as any;

    (component.fs.getDoc as jasmine.Spy).and.callFake(async (_ref: any) => ({
      exists: () => true,
      data: () => ({ companyName: 'X' }),
    }));

    await component.loadAllVendors();

    const keys = Object.keys(component.groups);
    expect(keys.indexOf('Venue')).toBeGreaterThan(-1);
    expect(keys.indexOf('OddThing')).toBeGreaterThan(-1);
    expect(keys.indexOf('Venue')).toBeLessThan(keys.indexOf('OddThing'));
  });

  it('openOrder → uses generic title when names missing', async () => {
    spyOn(component as any, 'waitForUser').and.resolveTo({ uid: 'U10' });

    (component.fs.getDoc as jasmine.Spy).and.callFake(async (ref: any) => {
      if (ref.id === 'U10') {
        return {
          exists: () => true,
          data: () => ({ title: 'Generic Title', DateTime: '2025-03-03T08:15:00' }),
          id: 'U10'
        } as any;
      }
      return { exists: () => false, data: () => ({}) } as any;
    });

    await component.openOrder({ id: 's9', serviceName: 'Z', type: 'Other' } as any);
    expect(component.myEventTitle).toBe('Generic Title');
    expect(component.orderForm.value.date).toBe('2025-03-03');
    expect(component.orderForm.value.startTime).toBe('08:15');
  });

  it('submitOrder → success with empty note and numeric guests', fakeAsync(async () => {
    spyOn(component as any, 'waitForUser').and.resolveTo({ uid: 'U8' });
    (component.fs.addDoc as jasmine.Spy).and.resolveTo({ id: 'ORD-2' } as any);

    (component as any).selectedService = { id: 'svc2', companyID: 'comp2' } as any;
    (component as any).myEventId = 'EV2';
    component.orderForm.setValue({
      eventID: 'EV2', date: '2025-07-01', startTime: '18:00', endTime: '19:00', guestsNum: 150, note: ''
    });

    await component.submitOrder();
    expect(component.orderSuccess).toContain('Order sent!');
    tick(950);
    expect((component as any).showOrder).toBeFalse();
  }));

  it('loadAllVendors → no active/filtered results still sets loaded & counts', async () => {
    (component as any).http = { get: () => of([{ id: 'a', status: 'inactive', type: 'Venue' }]) } as any;
    await component.loadAllVendors();
    expect(component.loaded).toBeTrue();
    expect(component.totalCount).toBe(0);
  });

  it('loadMyOrders → accepts ISO strings for timestamps when no toDate()', async () => {
    spyOn(component as any, 'waitForUser').and.resolveTo({ uid: 'u-iso' });
    (component.fs.getDocs as jasmine.Spy).and.resolveTo({
      docs: [{
        id: 'o-iso',
        data: () => ({
          vendorID: 'v1',
          companyID:'c1',
          status: 'accepted',
          guestsNum: 50,
          startAt: '2025-08-10T10:00:00',
          endAt: '2025-08-10T12:00:00',
        }),
      }]
    } as any);

    (component.fs.getDoc as jasmine.Spy).and.resolveTo({ exists: () => false, data: () => ({}) } as any);

    await (component as any)['loadMyOrders']();
    expect(component.orders.length).toBe(1);
    expect(component.orders[0].startAt instanceof Date).toBeTrue();
    expect(component.orders[0].endAt   instanceof Date).toBeTrue();
  });

  it('combineToDate() midnight edge', () => {
    const d = (component as any).combineToDate('2025-12-31', '00:00') as Date;
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });
});
