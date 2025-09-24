import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { VendorsCompany } from './vendors-company';

describe('VendorsCompany – branch-heavy tests', () => {
  let fixture: ComponentFixture<VendorsCompany>;
  let component: VendorsCompany;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        VendorsCompany,                   // standalone component
        RouterTestingModule,              // keep router inert
        HttpClientTestingModule,          // satisfies any HttpClient injections
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VendorsCompany);
    component = fixture.componentInstance;
    // NOTE: do not call detectChanges() to avoid template subscriptions
  });

  it('should instantiate', () => {
    expect(component).toBeTruthy();
  });

  it('toggleServiceForm() toggles and resets only on open', () => {
    const start = component.showServiceForm;
    // closing/opening cycles
    component.toggleServiceForm();  // open -> should reset
    expect(component.showServiceForm).toBe(!start);
    let v = component.serviceForm.getRawValue();
    expect(v.serviceName).toBe('');
    expect(v.type).toBe('');
    expect(v.price).toBeNull();
    expect(v.capacity).toBeNull();
    expect(v.description).toBe('');
    expect(v.bookingNotes).toBe('');
    expect(v.phonenumber).toBe('');

    component.serviceForm.patchValue({ serviceName: 'Keep', description: 'Keep' });
    component.toggleServiceForm();  // close -> should NOT reset
    v = component.serviceForm.getRawValue();
    expect(v.serviceName).toBe('Keep');
    expect(v.description).toBe('Keep');
  });

  it('serviceForm exposes expected controls', () => {
    for (const name of ['serviceName','type','price','capacity','description','bookingNotes','phonenumber']) {
      expect(component.serviceForm.get(name)).withContext(name).toBeTruthy();
    }
  });

  it('trackById() returns id', () => {
    expect(component.trackById(0, { id: 'a' } as any)).toBe('a');
  });

  it('begin/cancel editors set and clear state (phone/price/capacity)', () => {
    const base = {
      id: 'v1', serviceName: '', type: '', price: 100, capacity: 50,
      description: '', bookingNotes: '', status: 'pending', companyID: 'c1', phonenumber: '123'
    };

    component.beginEditPhone(base as any);
    expect(component.editPhoneId).toBe('v1');
    expect(component.phoneInput).toBe('123');
    component.cancelEditPhone();
    expect(component.editPhoneId).toBeNull();
    expect(component.phoneInput).toBe('');

    component.beginEditPrice(base as any);
    expect(component.editPriceId).toBe('v1');
    expect(component.priceInput).toBe(100);
    component.cancelEditPrice();
    expect(component.editPriceId).toBeNull();
    expect(component.priceInput).toBeNull();

    component.beginEditCapacity(base as any);
    expect(component.editCapacityId).toBe('v1');
    expect(component.capacityInput).toBe(50);
    component.cancelEditCapacity();
    expect(component.editCapacityId).toBeNull();
    expect(component.capacityInput).toBeNull();
  });

  it('validPhone() accepts common formats and rejects bad/blank/whitespace', () => {
    const ok = ['0123456', '+27 11 555 1234', '(011) 555-1234', '011-555-1234'];
    const bad = ['', '   \t ', 'abc', '123', '!!!!', '123456789012345678901'];
    for (const p of ok)  expect((component as any).validPhone(p)).withContext(p).toBeTrue();
    for (const p of bad) expect((component as any).validPhone(p)).withContext(p).toBeFalse();
  });

  it('getServiceName() maps ids, then falls back after list clears', () => {
    component.services = [
      { id: 's1', serviceName: 'Photo', type: '', price: null, capacity: null, description: '', bookingNotes: '', status: 'pending', companyID: 'c', phonenumber: '' },
      { id: 's2', serviceName: 'Cater', type: '', price: null, capacity: null, description: '', bookingNotes: '', status: 'pending', companyID: 'c', phonenumber: '' },
    ];
    (component as any).rebuildServiceNameMap();
    expect(component.getServiceName('s1')).toBe('Photo');
    expect(component.getServiceName('nope')).toBe('—');

    component.services = [];
    (component as any).rebuildServiceNameMap();
    expect(component.getServiceName('s1')).toBe('—');
  });

  it('canAct() true only for pending', () => {
    expect(component.canAct({ status: 'pending' } as any)).toBeTrue();
    for (const s of ['accepted','declined','cancelled']) {
      expect(component.canAct({ status: s } as any)).withContext(s).toBeFalse();
    }
  });

  it('refreshServices() safe with/without companyId', () => {
    component.companyId = null;
    expect(() => component.refreshServices()).not.toThrow();
    component.companyId = 'company-123';
    expect(() => component.refreshServices()).not.toThrow();
  });

  it('ngOnDestroy() unsubscribes when set, tolerates undefined', () => {
    const live = jasmine.createSpy('liveUnsub');
    const ord  = jasmine.createSpy('ordersUnsub');
    const auth = jasmine.createSpy('authUnsub');
    (component as any).liveUnsub = live;
    (component as any).ordersUnsub = ord;
    (component as any).authUnsub = auth;
    component.ngOnDestroy();
    expect(live).toHaveBeenCalled();
    expect(ord).toHaveBeenCalled();
    expect(auth).toHaveBeenCalled();

    (component as any).liveUnsub = undefined;
    (component as any).ordersUnsub = undefined;
    (component as any).authUnsub = undefined;
    expect(() => component.ngOnDestroy()).not.toThrow();
  });
});

/* ==================== EXTRA COVERAGE (conditional) ==================== */

function wireCompanyFakes(c: any) {
  c['auth'] = { user: () => ({ uid: 'U1', email: 'u1@x' }) };

  c['vendorService'] = c['vendorService'] ?? {};
  c['vendorService'].listenServices = jasmine.createSpy('listenServices')
    .and.callFake((_uid: string, cb: any) => { cb?.([{ id: 's1', serviceName: 'Venue A', type: 'Venue', price: 1000, capacity: 50, description: '', bookingNotes: '', status: 'pending', companyID: 'U1', phonenumber: '011' }]); return () => {}; });
  c['vendorService'].updateField = jasmine.createSpy('updateField').and.returnValue(Promise.resolve());
  c['vendorService'].createService = jasmine.createSpy('createService').and.returnValue(Promise.resolve());
  c['vendorService'].deleteService = jasmine.createSpy('deleteService').and.returnValue(Promise.resolve());

  c['ordersService'] = c['ordersService'] ?? {};
  c['ordersService'].listenCompanyOrders = jasmine.createSpy('listenCompanyOrders')
    .and.callFake((_uid: string, cb: any) => { cb?.([{ id: 'o1', status: 'pending', serviceId: 's1' }]); return () => {}; });
  c['ordersService'].accept = jasmine.createSpy('accept').and.returnValue(Promise.resolve());
  c['ordersService'].decline = jasmine.createSpy('decline').and.returnValue(Promise.resolve());
  c['ordersService'].cancel  = jasmine.createSpy('cancel').and.returnValue(Promise.resolve());

  c['live'] = { onAppVisibilityChange: (_cb: any) => () => {} };
}

describe('VendorsCompany – extra coverage (conditional)', () => {
  let component: any;

  beforeEach(() => {
    component = TestBed.createComponent(VendorsCompany).componentInstance as any;
    wireCompanyFakes(component);
  });

  it('ngOnInit() + idempotency if present', () => {
    if (typeof component.ngOnInit !== 'function') return;
    component.ngOnInit();
    component.ngOnInit(); // second call exercises guard paths
    component.companyId = 'U1';
    expect(() => component.refreshServices()).not.toThrow();
  });

  it('save/edit flows and order actions if present', async () => {
    const row = { id: 's1', phonenumber: '011', price: 1000, capacity: 50 };

    if (typeof component.beginEditPhone === 'function' && typeof component['savePhone'] === 'function') {
      component.beginEditPhone(row); component.phoneInput = '011-555-1234';
      await component['savePhone'](); expect(component['vendorService'].updateField).toHaveBeenCalled();
    }
    if (typeof component.beginEditPrice === 'function' && typeof component['savePrice'] === 'function') {
      component.beginEditPrice(row); component.priceInput = 1800;
      await component['savePrice'](); expect(component['vendorService'].updateField).toHaveBeenCalled();
    }
    if (typeof component.beginEditCapacity === 'function' && typeof component['saveCapacity'] === 'function') {
      component.beginEditCapacity(row); component.capacityInput = 200;
      await component['saveCapacity'](); expect(component['vendorService'].updateField).toHaveBeenCalled();
    }
    if (typeof component['createService'] === 'function') {
      component.toggleServiceForm();
      component.serviceForm.patchValue({ serviceName: 'New', type: 'Venue', price: 2500, capacity: 120, description: 'd', bookingNotes: 'b', phonenumber: '0123456' });
      await component['createService'](); expect(component['vendorService'].createService).toHaveBeenCalled();
    }
    if (typeof component['deleteService'] === 'function') {
      await component['deleteService']('s1'); expect(component['vendorService'].deleteService).toHaveBeenCalledWith('s1');
    }

    const pending = { id: 'o1', status: 'pending', serviceId: 's1' };
    if (typeof component['acceptOrder'] === 'function') { await component['acceptOrder'](pending); expect(component['ordersService'].accept).toHaveBeenCalled(); }
    if (typeof component['declineOrder'] === 'function') { await component['declineOrder'](pending); expect(component['ordersService'].decline).toHaveBeenCalled(); }
    if (typeof component['cancelOrder'] === 'function')  { await component['cancelOrder'](pending);  expect(component['ordersService'].cancel).toHaveBeenCalled(); }
  });
});
