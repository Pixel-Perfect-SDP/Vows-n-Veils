import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { VendorsCompany } from './vendors-company';

describe('VendorsCompany (very simple)', () => {
  let fixture: ComponentFixture<VendorsCompany>;
  let component: VendorsCompany;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        VendorsCompany,
        RouterTestingModule,
        HttpClientTestingModule,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VendorsCompany);
    component = fixture.componentInstance;
    // DO NOT call fixture.detectChanges()
  });

  it('should instantiate the class', () => {
    expect(component).toBeTruthy();
  });

  it('toggleServiceForm() toggles UI flag', () => {
    const start = component.showServiceForm;
    component.toggleServiceForm();
    expect(component.showServiceForm).toBe(!start);
    component.toggleServiceForm();
    expect(component.showServiceForm).toBe(start);
  });

  it('toggleServiceForm() resets service form when opening', () => {
    // prefill form with junk, then open
    component.serviceForm.patchValue({
      serviceName: 'x',
      type: 'Photography',
      price: 123,
      capacity: 5,
      description: 'd',
      bookingNotes: 'b',
      phonenumber: '+27 11 123 4567'
    });
    expect(component.showServiceForm).toBeFalse();
    component.toggleServiceForm(); // open -> should reset
    const v = component.serviceForm.getRawValue();
    expect(v.serviceName).toBe('');
    expect(v.type).toBe('');
    expect(v.price).toBeNull();
    expect(v.capacity).toBeNull();
    expect(v.description).toBe('');
    expect(v.bookingNotes).toBe('');
    expect(v.phonenumber).toBe('');
  });

  it('trackById() returns stable ids', () => {
    const id1 = component.trackById(0, { id: 'a' } as any);
    const id2 = component.trackById(1, { id: 'b' } as any);
    expect(id1).toBe('a');
    expect(id2).toBe('b');
  });

  it('begin/cancel edit phone should set and reset editor state', () => {
    const row = {
      id: 'v1',
      serviceName: 'Service',
      type: 'Type',
      price: 0,
      capacity: 0,
      description: '',
      bookingNotes: '',
      status: 'pending',
      companyID: 'c1',
      phonenumber: '123',
    };
    component.beginEditPhone(row as any);
    expect(component.editPhoneId).toBe('v1');
    expect(component.phoneInput).toBe('123');

    component.cancelEditPhone();
    expect(component.editPhoneId).toBeNull();
    expect(component.phoneInput).toBe('');
  });

  it('begin/cancel edit price should set and reset editor state', () => {
    const row = {
      id: 'v2',
      serviceName: 'Service',
      type: 'Type',
      price: 100,
      capacity: 0,
      description: '',
      bookingNotes: '',
      status: 'pending',
      companyID: 'c1',
      phonenumber: '',
    };
    component.beginEditPrice(row as any);
    expect(component.editPriceId).toBe('v2');
    expect(component.priceInput).toBe(100);

    component.cancelEditPrice();
    expect(component.editPriceId).toBeNull();
    expect(component.priceInput).toBeNull();
  });

  it('begin/cancel edit capacity should set and reset editor state', () => {
    const row = {
      id: 'v3',
      serviceName: 'Service',
      type: 'Type',
      price: 0,
      capacity: 50,
      description: '',
      bookingNotes: '',
      status: 'pending',
      companyID: 'c1',
      phonenumber: '',
    };
    component.beginEditCapacity(row as any);
    expect(component.editCapacityId).toBe('v3');
    expect(component.capacityInput).toBe(50);

    component.cancelEditCapacity();
    expect(component.editCapacityId).toBeNull();
    expect(component.capacityInput).toBeNull();
  });

  // --- NEW, simple / logic-only tests below ---

  it('validPhone() accepts common formats and rejects bad ones', () => {
    const valid = ['0123456', '+27 11 555 1234', '(011) 555-1234', '011-555-1234'];
    const invalid = ['', 'abc', '123', '!!!!', '123456789012345678901']; // >20 chars

    for (const p of valid) {
      expect((component as any).validPhone(p)).toBeTrue();
    }
    for (const p of invalid) {
      expect((component as any).validPhone(p)).toBeFalse();
    }
  });

  it('getServiceName() returns mapped name or "—" if unknown', () => {
    component.services = [
      { id: 's1', serviceName: 'Photo', type: '', price: null, capacity: null, description: '', bookingNotes: '', status: 'pending', companyID: 'c', phonenumber: '' },
      { id: 's2', serviceName: 'Cater', type: '', price: null, capacity: null, description: '', bookingNotes: '', status: 'pending', companyID: 'c', phonenumber: '' },
    ];
    (component as any).rebuildServiceNameMap();
    expect(component.getServiceName('s1')).toBe('Photo');
    expect(component.getServiceName('nope')).toBe('—');
  });

  it('canAct() only true for pending orders', () => {
    expect(component.canAct({ status: 'pending' } as any)).toBeTrue();
    expect(component.canAct({ status: 'accepted' } as any)).toBeFalse();
    expect(component.canAct({ status: 'declined' } as any)).toBeFalse();
    expect(component.canAct({ status: 'cancelled' } as any)).toBeFalse();
  });

  it('ngOnDestroy() unsubscribes live/order/auth listeners if present', () => {
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
  });

  it('refreshServices() is safe when companyId is null', () => {
    component.companyId = null;
    // Should be a no-op without throwing
    component.refreshServices();
    expect(true).toBeTrue();
  });
});
