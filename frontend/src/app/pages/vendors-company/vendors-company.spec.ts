import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

import { VendorsCompany } from './vendors-company';

(jasmine as any).DEFAULT_TIMEOUT_INTERVAL = 20000;

function snapFromDocs(docs: Array<{ id: string; data: any }>) {
  return {
    forEach(cb: any) { docs.forEach(d => cb({ id: d.id, data: () => d.data })); }
  } as any;
}

describe('VendorsCompany – with fs seam (hi-cov)', () => {
  let fixture: ComponentFixture<VendorsCompany>;
  let component: any;
  let router: Router;
  let fs: any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorsCompany, RouterTestingModule],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(VendorsCompany);
    component = fixture.componentInstance as any;
    router = TestBed.inject(Router);

    fs = {
      getApp: jasmine.createSpy('getApp'),
      getFirestore: jasmine.createSpy('getFirestore').and.returnValue({} as any),
      collection: jasmine.createSpy('collection').and.callFake((_db: any, _c: string) => ({ path: _c })),
      doc: jasmine.createSpy('doc').and.callFake((_db: any, _c: string, id?: string) => ({ id, path: _c })),
      getDoc: jasmine.createSpy('getDoc'),
      onSnapshot: jasmine.createSpy('onSnapshot'),
      query: jasmine.createSpy('query').and.callFake((...args: any[]) => ({ q: true, args })),
      where: jasmine.createSpy('where').and.callFake((_f: any, _op: any, _v: any) => ({ w: [_f, _op, _v] })),
      setDoc: jasmine.createSpy('setDoc'),
      serverTimestamp: jasmine.createSpy('serverTimestamp').and.returnValue('ts'),
    };

    component.fs = fs;
  });

  it('instantiates', () => {
    expect(component).toBeTruthy();
  });

  it('trackById() returns id and canAct() gates only pending', () => {
    expect(component.trackById(0, { id: 'x' })).toBe('x');
    expect(component.canAct({ status: 'pending' } as any)).toBeTrue();
    for (const s of ['accepted','declined','cancelled','weird']) {
      expect(component.canAct({ status: s } as any)).withContext(s).toBeFalse();
    }
  });

  it('toggleServiceForm resets on open, not on close; clears messages', () => {
    (component as any).successMsg = 'ok';
    (component as any).errorMsg = 'err';
    const start = component.showServiceForm;

    component.toggleServiceForm();
    expect(component.showServiceForm).toBe(!start);
    const v1 = component.serviceForm.getRawValue();
    expect(v1.serviceName).toBe(''); expect(v1.type).toBe('');
    expect(v1.price).toBeNull(); expect(v1.capacity).toBeNull();
    expect(v1.description).toBe(''); expect(v1.bookingNotes).toBe('');
    expect(v1.phonenumber).toBe('');
    expect((component as any).successMsg).toBe('');
    expect((component as any).errorMsg).toBe('');

    component.serviceForm.patchValue({ serviceName: 'Keep', description: 'Keep' });
    component.toggleServiceForm(); 
    const v2 = component.serviceForm.getRawValue();
    expect(v2.serviceName).toBe('Keep');
    expect(v2.description).toBe('Keep');
  });

  it('rebuildServiceNameMap & getServiceName reflect changes', () => {
    component.services = [
      { id: 's1', serviceName: '' },
      { id: 's2', serviceName: 'Real' },
    ];
    (component as any).rebuildServiceNameMap();
    expect(component.getServiceName('s1')).toBe('—');
    expect(component.getServiceName('s2')).toBe('Real');
    expect(component.getServiceName('missing')).toBe('—');

    component.services = component.services.filter((s: any) => s.id !== 's2');
    (component as any).rebuildServiceNameMap();
    expect(component.getServiceName('s2')).toBe('—');
  });

  it('detachLive()/detachOrders() safe when unset and when set', () => {
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

  it('loadCompany -> vendor, non-vendor, error', async () => {
    fs.getDoc.and.returnValues(
      Promise.resolve({ exists: () => true, data: () => ({ type: 'vendor', userID: 'u1', companyName: 'Co', email: 'e', phoneNumber: '1' }) }),
      Promise.resolve({ exists: () => true, data: () => ({ type: 'customer' }) }),
      Promise.reject(new Error('fail'))
    );

    await component['loadCompany']('u1');
    expect(component.hasVendorCompany).toBeTrue();
    expect(component.companyVendorData.companyName).toBe('Co');

    await component['loadCompany']('u2');
    expect(component.hasVendorCompany).toBeFalse();

    await component['loadCompany']('u3');
    expect(component.errorMsg).toContain('Failed to load company');
  });

  it('loadServicesFromApi → success maps & sorts; error path', async () => {
    const http = jasmine.createSpyObj('HttpClient', ['get']);
    component.http = http;

    http.get.and.returnValue(of([
      { id: 's2', serviceName: 'Zulu', type: 'Venue', price: 2000, capacity: 50, status: 'active', companyID: 'c1', phonenumber: '011' },
      { id: 's1', serviceName: 'Alpha', type: 'Venue', price: 1000, capacity: 20, status: 'active', companyID: 'c1', phonenumber: '011' },
    ]));
    await component['loadServicesFromApi']('c1');
    expect(component.services.length).toBe(2);
    expect(component.services[0].serviceName).toBe('Alpha'); 

    http.get.and.returnValue(throwError(() => ({ message: 'boom' })));
    await component['loadServicesFromApi']('c1');
    expect(component.errorMsg).toContain('Failed to load services');
    expect(component.services.length).toBe(0);
  });

  it('attachLive → updates services and handles error callback; sorted by name', () => {
    fs.onSnapshot.and.callFake((_q: any, next: any, err?: any) => {
      next(snapFromDocs([
        { id: 'b', data: { serviceName: 'Zulu', type: 'Venue', price: 1000, capacity: 50, status: 'active', companyID: 'c1', phonenumber: '011' } },
        { id: 'a', data: { serviceName: 'Alpha', type: 'Venue', price: 500, capacity: 20, status: 'active', companyID: 'c1', phonenumber: '011' } },
      ]));
      err?.({ message: 'stream err' });
      return () => {};
    });

    component['attachLive']('c1');
    expect(component.services.length).toBe(2);
    expect(component.services[0].serviceName).toBe('Alpha'); 
    expect(component.errorMsg).toContain('Failed to stream services.');
  });

  it('attachOrders → converts ISO and Timestamp-like objects; handles error', () => {
    const tsLike = (iso: string) => ({ toDate: () => new Date(iso) });
    fs.onSnapshot.and.callFake((_q: any, next: any, err?: any) => {
      next(snapFromDocs([
        { id: 'o1', data: {
          customerID: 'cu', eventID: 'ev', companyID: 'c1', vendorID: 'v1',
          guestsNum: 10, startAt: '2024-01-02T10:00:00.000Z', endAt: tsLike('2024-01-02T12:00:00.000Z'),
          status: 'pending', createdAt: tsLike('2024-01-01T09:00:00.000Z')
        } }
      ]));
      err?.({ message: 'orders err' });
      return () => {};
    });

    component['attachOrders']('c1');
    expect(component.orders.length).toBe(1);
    expect(component.orders[0].startAtDate instanceof Date).toBeTrue();
    expect(component.orders[0].endAtDate instanceof Date).toBeTrue();
    expect(component.orders[0].createdAtDate instanceof Date).toBeTrue();
    expect(component.errorMsg).toContain('Failed to stream orders.');
  });

  it('updateOrderStatus → success, not found, and setDoc error', async () => {
    fs.getDoc.and.returnValues(
      Promise.resolve({ exists: () => true, data: () => ({ customerID: 'cu', eventID: 'ev', companyID: 'c1', vendorID: 'v1', guestsNum: 1, startAt: 'x', endAt: 'y', note: '', createdAt: 'z' }) }),
      Promise.resolve({ exists: () => false }),
      Promise.resolve({ exists: () => true, data: () => ({ customerID: 'cu', eventID: 'ev', companyID: 'c1', vendorID: 'v1', guestsNum: 1, startAt: 'x', endAt: 'y', note: '', createdAt: 'z' }) }),
    );

    fs.setDoc.and.returnValues(
      Promise.resolve(),              
      Promise.reject(new Error('set fail')) 
    );

    await component['updateOrderStatus']({ id: 'o1' }, 'accepted');
    expect(fs.setDoc).toHaveBeenCalled();

    await component['updateOrderStatus']({ id: 'missing' }, 'declined');
    expect(component.errorMsg).toContain('Order not found');

    await component['updateOrderStatus']({ id: 'o2' }, 'declined');
    expect(component.errorMsg).toContain('Failed to update order.');
  });

  it('accept/decline wrappers call update', async () => {
    const spyUpd = spyOn(component as any, 'updateOrderStatus').and.returnValue(Promise.resolve());
    await component.acceptOrder({ id: 'a', status: 'pending' } as any);
    await component.declineOrder({ id: 'b', status: 'pending' } as any);
    expect(spyUpd).toHaveBeenCalledTimes(2);
  });

  it('createVendorCompany → early return, success, error', async () => {
    spyOn(window, 'alert');

    component.form.reset({ companyName: '', companyEmail: '', companyNumber: '' });
    await component.createVendorCompany();
    expect(fs.setDoc).not.toHaveBeenCalled(); 

    component.companyId = 'u1';
    component.form.setValue({ companyName: 'Co', companyEmail: 'e@x', companyNumber: '011 555 1234' });
    fs.setDoc.and.returnValue(Promise.resolve());
    fs.getDoc.and.returnValue(Promise.resolve({ exists: () => true, data: () => ({ type: 'vendor', userID: 'u1', companyName: 'Co', email: 'e@x', phoneNumber: '011' }) }));
    spyOn(component as any, 'attachLive').and.callFake(() => {});
    spyOn(component as any, 'attachOrders').and.callFake(() => {});
    spyOn(component as any, 'loadServicesFromApi').and.returnValue(Promise.resolve());
    await component.createVendorCompany();
    expect(window.alert).toHaveBeenCalledWith('Vendor Company created successfully!');

    fs.setDoc.and.returnValue(Promise.reject(new Error('boom')));
    await component.createVendorCompany();
    expect(component.errorMsg).toContain('Error creating your Vendor Company.');
  });

  it('refreshServices → no-op without companyId; calls when present', () => {
    const spyLoad = spyOn(component as any, 'loadServicesFromApi').and.returnValue(Promise.resolve());
    component.companyId = null;
    component.refreshServices();
    expect(spyLoad).not.toHaveBeenCalled();

    component.companyId = 'c1';
    component.refreshServices();
    expect(spyLoad).toHaveBeenCalledWith('c1');
  });

  it('saveEditPhone → success and HTTP error', async () => {
    const http = jasmine.createSpyObj('HttpClient', ['put']);
    component.http = http;

    component.services = [{ id: 's1', serviceName: 'A', phonenumber: '000' } as any];
    component.beginEditPhone({ id: 's1', phonenumber: '000' } as any);
    component.phoneInput = '011-555-1234';
    http.put.and.returnValue(of({}));
    await component['saveEditPhone']({ id: 's1' } as any);
    expect(component.services[0].phonenumber).toBe('011-555-1234');
    expect((component as any).editPhoneId).toBeNull();

    component.beginEditPhone({ id: 's1', phonenumber: '011-555-1234' } as any);
    component.phoneInput = '011-555-9999';
    http.put.and.returnValue(throwError(() => ({ error: { error: 'bad' } })));
    await component['saveEditPhone']({ id: 's1' } as any);
    expect((component as any).phoneErrorId).toBe('s1');
    expect((component as any).phoneInlineError).toContain('bad');
  });

  it('saveEditPrice → success and HTTP error', async () => {
    const http = jasmine.createSpyObj('HttpClient', ['put']);
    component.http = http;

    component.services = [{ id: 's1', serviceName: 'A', price: 100 } as any];
    component.beginEditPrice({ id: 's1', price: 100 } as any);
    component.priceInput = 2500;
    http.put.and.returnValue(of({}));
    await component['saveEditPrice']({ id: 's1' } as any);
    expect(component.services[0].price).toBe(2500);
    expect((component as any).editPriceId).toBeNull();

    component.beginEditPrice({ id: 's1', price: 2500 } as any);
    component.priceInput = 9999;
    http.put.and.returnValue(throwError(() => ({ error: { error: 'nope' } })));
    await component['saveEditPrice']({ id: 's1' } as any);
    expect((component as any).priceErrorId).toBe('s1');
    expect((component as any).priceInlineError).toContain('nope');
  });

  it('saveEditCapacity → success and HTTP error', async () => {
    const http = jasmine.createSpyObj('HttpClient', ['put']);
    component.http = http;

    component.services = [{ id: 's1', serviceName: 'A', capacity: 10 } as any];
    component.beginEditCapacity({ id: 's1', capacity: 10 } as any);
    component.capacityInput = 200;
    http.put.and.returnValue(of({}));
    await component['saveEditCapacity']({ id: 's1' } as any);
    expect(component.services[0].capacity).toBe(200);
    expect((component as any).editCapacityId).toBeNull();

    component.beginEditCapacity({ id: 's1', capacity: 200 } as any);
    component.capacityInput = 300;
    http.put.and.returnValue(throwError(() => ({ error: { error: 'cap-err' } })));
    await component['saveEditCapacity']({ id: 's1' } as any);
    expect((component as any).capacityErrorId).toBe('s1');
    expect((component as any).capacityInlineError).toContain('cap-err');
  });

  it('deleteService → confirm false no-op; confirm true removes & calls API', async () => {
    const http = jasmine.createSpyObj('HttpClient', ['delete']);
    http.delete.and.returnValue(of({}));
    component.http = http;

    component.services = [{ id: 'a', serviceName: 'A' } as any, { id: 'b', serviceName: 'B' } as any];
    spyOn(window, 'confirm').and.returnValue(false);
    await component.deleteService({ id: 'a', serviceName: 'A' } as any);
    expect(component.services.length).toBe(2);

    (window.confirm as jasmine.Spy).and.returnValue(true);
    await component.deleteService({ id: 'a', serviceName: 'A' } as any);
    expect(component.services.map((s: any) => s.id)).toEqual(['b']);
    expect(http.delete).toHaveBeenCalled();
  });

  it('goToNotifications navigates, fetchNotifications success + error', async () => {
    const nav = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    spyOnProperty(router, 'url', 'get').and.returnValue('/vendors-company');
    component.goToNotifications();
    expect(nav).toHaveBeenCalled();

    component.auth = { user: () => ({ uid: 'u1' }) };
    const http = jasmine.createSpyObj('HttpClient', ['get']);
    http.get.and.returnValue(of({ notifications: [
      { id: 'n1', from: 'A', to: 'u1', message: 'm1', date: '2024-01-01', read: true },
      { id: 'n2', from: 'B', to: 'u1', message: 'm2', date: '2024-01-02', read: false },
    ]}));
    component.http = http;

    await component.fetchNotifications();
    expect(component.unreadCount).toBe(1);
    expect(component.notifications[0].read).toBeFalse(); 

    http.get.and.returnValue(throwError(() => new Error('down')));
    await component.fetchNotifications();
    expect(component.notifications.length).toBe(0);
    expect(component.unreadCount).toBe(0);
  });
});
