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
});
