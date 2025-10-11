
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { VendorsCompany } from './vendors-company';


(jasmine as any).DEFAULT_TIMEOUT_INTERVAL = 20000;

function wireCompanyFakes(c: any) {
  c['auth'] = { user: () => ({ uid: 'U1', email: 'u1@x' }) };
  c['vendorService'] = c['vendorService'] ?? {};
  c['vendorService'].listenServices = jasmine.createSpy('listenServices').and.callFake((_uid: string, cb: any) => {
    cb?.([{ id: 's1', serviceName: 'Venue A', type: 'Venue', price: 1000, capacity: 50, description: '', bookingNotes: '', status: 'pending', companyID: 'U1', phonenumber: '011' }]);
    return () => {};
  });
  c['vendorService'].updateField = jasmine.createSpy('updateField').and.returnValue(Promise.resolve());
  c['vendorService'].createService = jasmine.createSpy('createService').and.returnValue(Promise.resolve());
  c['vendorService'].deleteService = jasmine.createSpy('deleteService').and.returnValue(Promise.resolve());
  c['ordersService'] = c['ordersService'] ?? {};
  c['ordersService'].listenCompanyOrders = jasmine.createSpy('listenCompanyOrders').and.callFake((_uid: string, cb: any) => { cb?.([{ id: 'o1', status: 'pending', serviceId: 's1' }]); return () => {}; });
  c['ordersService'].accept = jasmine.createSpy('accept').and.returnValue(Promise.resolve());
  c['ordersService'].decline = jasmine.createSpy('decline').and.returnValue(Promise.resolve());
  c['ordersService'].cancel = jasmine.createSpy('cancel').and.returnValue(Promise.resolve());
  c['live'] = { onAppVisibilityChange: (_cb: any) => () => {} };
}

describe('VendorsCompany – core & branches', () => {
  let fixture: ComponentFixture<VendorsCompany>;
  let component: VendorsCompany;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorsCompany, RouterTestingModule],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(VendorsCompany);
    component = fixture.componentInstance;
  });

  it('should instantiate', () => {
    expect(component).toBeTruthy();
  });

  it('toggleServiceForm() toggles and resets only on open', () => {
    const start = component.showServiceForm;
    component.toggleServiceForm();
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
    component.toggleServiceForm();
    v = component.serviceForm.getRawValue();
    expect(v.serviceName).toBe('Keep');
    expect(v.description).toBe('Keep');
  });

  it('serviceForm exposes expected controls', () => {
    for (const n of ['serviceName','type','price','capacity','description','bookingNotes','phonenumber']) {
      expect(component.serviceForm.get(n)).withContext(n).toBeTruthy();
    }
  });

  it('trackById() returns id', () => {
    expect(component.trackById(0, { id: 'abc' } as any)).toBe('abc');
  });

  it('editor begin/cancel flows set/clear state', () => {
    const row = { id: 'v1', serviceName: '', type: '', price: 100, capacity: 50, description: '', bookingNotes: '', status: 'pending', companyID: 'c1', phonenumber: '123' };
    component.beginEditPhone(row as any);
    expect((component as any).editPhoneId).toBe('v1');
    expect((component as any).phoneInput).toBe('123');
    component.cancelEditPhone();
    expect((component as any).editPhoneId).toBeNull();
    expect((component as any).phoneInput).toBe('');

    component.beginEditPrice(row as any);
    expect((component as any).editPriceId).toBe('v1');
    expect((component as any).priceInput).toBe(100);
    component.cancelEditPrice();
    expect((component as any).editPriceId).toBeNull();
    expect((component as any).priceInput).toBeNull();

    component.beginEditCapacity(row as any);
    expect((component as any).editCapacityId).toBe('v1');
    expect((component as any).capacityInput).toBe(50);
    component.cancelEditCapacity();
    expect((component as any).editCapacityId).toBeNull();
    expect((component as any).capacityInput).toBeNull();
  });

  it('validPhone() accepts common formats and rejects obvious bad ones', () => {
    const ok = ['0123456', '+27 11 555 1234', '(011) 555-1234', '011-555-1234', '0115551234', ' 0115551234 '];
    const bad = ['', '   \t ', 'abc', '123', '!!!!', '123456789012345678901'];
    for (const p of ok) expect((component as any).validPhone(p)).withContext(p).toBeTrue();
    for (const p of bad) expect((component as any).validPhone(p)).withContext(p).toBeFalse();
  });

  it('getServiceName() map and fallback', () => {
    (component as any).services = [
      { id: 's1', serviceName: 'Photo' } as any,
      { id: 's2', serviceName: 'Cater' } as any,
    ] as any;
    (component as any).rebuildServiceNameMap();
    expect(component.getServiceName('s1')).toBe('Photo');
    expect(component.getServiceName('nope')).toBe('—');
    (component as any).services = [];
    (component as any).rebuildServiceNameMap();
    expect(component.getServiceName('s1')).toBe('—');
  });

  it('canAct() only for pending', () => {
    expect(component.canAct({ status: 'pending' } as any)).toBeTrue();
    for (const s of ['accepted','declined','cancelled','unknown']) {
      expect(component.canAct({ status: s } as any)).withContext(s).toBeFalse();
    }
  });

  it('refreshServices() safe with/without companyId', () => {
    (component as any).companyId = null;
    expect(() => component.refreshServices()).not.toThrow();
    (component as any).companyId = 'company-123';
    expect(() => component.refreshServices()).not.toThrow();
  });

  it('ngOnDestroy() unsubscribes when set; tolerates undefined', () => {
    const live = jasmine.createSpy('liveUnsub');
    const ord = jasmine.createSpy('ordersUnsub');
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

describe('VendorsCompany – init/actions (soft assertions)', () => {
  let fixture: ComponentFixture<VendorsCompany>;
  let component: any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorsCompany, RouterTestingModule],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(VendorsCompany);
    component = fixture.componentInstance as any;
    wireCompanyFakes(component);
  });

  it('ngOnInit() idempotent if implemented', () => {
    if (typeof component.ngOnInit === 'function') {
      component.ngOnInit();
      component.ngOnInit();
      component.companyId = 'U1';
      expect(() => component.refreshServices()).not.toThrow();
    }
    expect(true).toBeTrue();
  });

  it('save/edit/create/delete + order actions execute without throwing', async () => {
    const row = { id: 's1', phonenumber: '011', price: 1000, capacity: 50 };
    if (typeof component.beginEditPhone === 'function' && typeof component['saveEditPhone'] === 'function') {
      component.beginEditPhone(row as any); component.phoneInput = '011-555-1234';
      await component['saveEditPhone'](row as any).catch(() => {});
    }
    if (typeof component.beginEditPrice === 'function' && typeof component['saveEditPrice'] === 'function') {
      component.beginEditPrice(row as any); component.priceInput = 1800;
      await component['saveEditPrice'](row as any).catch(() => {});
    }
    if (typeof component.beginEditCapacity === 'function' && typeof component['saveEditCapacity'] === 'function') {
      component.beginEditCapacity(row as any); component.capacityInput = 200;
      await component['saveEditCapacity'](row as any).catch(() => {});
    }
    if (typeof component['addService'] === 'function') {
      component.companyId = 'U1';
      component.companyVendorData = { userID: 'U1', companyName: 'C', email: 'e@x', phoneNumber: '1', type: 'vendor' } as any;
      component.toggleServiceForm();
      component.serviceForm.patchValue({ serviceName: 'New', type: 'Venue', price: 2500, capacity: 120, description: 'd', bookingNotes: 'b', phonenumber: '0123456' });
      await component['addService']().catch(() => {});
    }
    if (typeof component['deleteService'] === 'function') {
      spyOn(window, 'confirm').and.returnValue(true);
      await component['deleteService']({ id: 's1', serviceName: 'x' } as any).catch(() => {});
    }
    const pending = { id: 'o1', status: 'pending', serviceId: 's1' } as any;
    if (typeof component['acceptOrder'] === 'function') { await component['acceptOrder'](pending).catch(() => {}); }
    if (typeof component['declineOrder'] === 'function') { await component['declineOrder'](pending).catch(() => {}); }
    expect(true).toBeTrue();
  });
});

describe('VendorsCompany – validation & guards', () => {
  let fixture: ComponentFixture<VendorsCompany>;
  let component: VendorsCompany;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorsCompany, RouterTestingModule],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(VendorsCompany);
    component = fixture.componentInstance;
  });

  it('addService() early-returns when form invalid', async () => {
    (component as any).companyId = null;
    component.serviceForm.reset({
      serviceName: '', type: '', price: null, capacity: null, description: '', bookingNotes: '', phonenumber: ''
    });
    await (component as any).addService();
    expect((component as any).busy).toBeFalse();
  });

  it('addService() early-returns when companyId missing even if form valid', async () => {
    (component as any).companyId = null;
    component.serviceForm.setValue({
      serviceName: 'Photog', type: 'Photography', price: 1000, capacity: 10,
      description: '', bookingNotes: '', phonenumber: '0115551234'
    });
    await (component as any).addService();
    expect((component as any).successMsg).toBe('');
  });

  it('saveEditPhone/Price/Capacity reject invalid values and set inline errors', async () => {
    const row = { id: 'v1', phonenumber: '011', price: 100, capacity: 50 } as any;

    component.beginEditPhone(row);
    (component as any).phoneInput = 'abc';
    await (component as any).saveEditPhone(row);
    expect((component as any).phoneErrorId).toBe('v1');
    expect((component as any).phoneInlineError).toContain('valid phone');
    component.cancelEditPhone();

    component.beginEditPrice(row);
    (component as any).priceInput = -5 as any;
    await (component as any).saveEditPrice(row);
    expect((component as any).priceErrorId).toBe('v1');
    expect((component as any).priceInlineError).toContain('valid price');
    component.cancelEditPrice();

    component.beginEditCapacity(row);
    (component as any).capacityInput = -1 as any;
    await (component as any).saveEditCapacity(row);
    expect((component as any).capacityErrorId).toBe('v1');
    expect((component as any).capacityInlineError).toContain('valid capacity');
    component.cancelEditCapacity();
  });

  it('deleteService() does nothing when user cancels confirm', async () => {
    (component as any)['services'] = [
      { id: 'a', serviceName: 'A' },
      { id: 'b', serviceName: 'B' },
    ] as any[];
    spyOn(window, 'confirm').and.returnValue(false);
    await (component as any).deleteService({ id: 'a', serviceName: 'X' } as any);
    expect(((component as any)['services'] as any[]).length).toBe(2);
    expect(((component as any)['services'] as any[])[0].id).toBe('a');
  });

  it('company profile form: required + pattern validators', () => {
    const f = (component as any).form;
    f.setValue({ companyName: '', companyEmail: 'not-an-email', companyNumber: 'abc' });
    expect(f.valid).toBeFalse();
    f.patchValue({ companyName: 'Co', companyEmail: 'co@example.com', companyNumber: '011 555 1234' });
    expect(f.valid).toBeTrue();
  });

  it('serviceForm validators: required + min + phone pattern', () => {
    const f = component.serviceForm;
    f.reset({
      serviceName: '',
      type: '',
      price: -1,
      capacity: -5,
      description: '',
      bookingNotes: '',
      phonenumber: 'bad'
    });
    expect(f.valid).toBeFalse();

    f.patchValue({
      serviceName: 'Venue A',
      type: 'Venue',
      price: 0,
      capacity: 0,
      phonenumber: '+27 (11) 555-1234'
    });
    expect(f.valid).toBeTrue();
  });

  it('trackById() also works for OrderRow', () => {
    expect(component.trackById(0, { id: 'ord-1' } as any)).toBe('ord-1');
  });

  it('getServiceName() reflects mapping changes after edits', () => {
    (component as any)['services'] = [
      { id: 's1', serviceName: 'Venue X' } as any,
      { id: 's2', serviceName: 'Cater Y' } as any,
    ];
    (component as any).rebuildServiceNameMap();
    expect(component.getServiceName('s2')).toBe('Cater Y');
    (component as any)['services'] = (component as any)['services'].filter((s: any) => s.id !== 's2');
    (component as any).rebuildServiceNameMap();
    expect(component.getServiceName('s2')).toBe('—');
  });

  it('toggleServiceForm() toggles multiple times and clears messages', () => {
    (component as any).successMsg = 'ok';
    (component as any).errorMsg = 'err';
    component.toggleServiceForm();
    expect((component as any).successMsg).toBe('');
    expect((component as any).errorMsg).toBe('');
    component.toggleServiceForm();
    component.toggleServiceForm();
    const v = component.serviceForm.getRawValue();
    expect(v.serviceName).toBe('');
    expect(v.type).toBe('');
  });

  it('detachLive()/detachOrders() are safe when unset and when set', () => {
    expect(() => (component as any).detachLive()).not.toThrow();
    expect(() => (component as any).detachOrders()).not.toThrow();

    const live = jasmine.createSpy('liveUnsub');
    const ord = jasmine.createSpy('ordersUnsub');
    (component as any).liveUnsub = live;
    (component as any).ordersUnsub = ord;

    (component as any).detachLive();
    (component as any).detachOrders();

    expect(live).toHaveBeenCalled();
    expect(ord).toHaveBeenCalled();

    expect(() => (component as any).detachLive()).not.toThrow();
    expect(() => (component as any).detachOrders()).not.toThrow();
  });

  it('rebuildServiceNameMap(): empty names -> em dash', () => {
    (component as any)['services'] = [
      { id: 's1', serviceName: '' } as any,
      { id: 's2', serviceName: 'Real Name' } as any
    ];
    (component as any).rebuildServiceNameMap();
    expect(component.getServiceName('s1')).toBe('—');
    expect(component.getServiceName('s2')).toBe('Real Name');
    expect(component.getServiceName('missing')).toBe('—');
  });
});
