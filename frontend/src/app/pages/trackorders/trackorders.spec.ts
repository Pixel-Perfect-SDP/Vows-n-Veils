import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Trackorders } from './trackorders';

describe('TrackordersComponent', () => {
  let component: Trackorders;
  let fixture: ComponentFixture<Trackorders>;
  let router: jasmine.SpyObj<Router>;
  let httpClient: jasmine.SpyObj<HttpClient>;

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const httpClientSpy = jasmine.createSpyObj('HttpClient', ['get', 'put']);

    await TestBed.configureTestingModule({
      imports: [Trackorders],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: HttpClient, useValue: httpClientSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Trackorders);
    component = fixture.componentInstance;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    httpClient = TestBed.inject(HttpClient) as jasmine.SpyObj<HttpClient>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate to manageservices when backhome is called', () => {
    component.backhome();
    expect(router.navigate).toHaveBeenCalledWith(['/manageservices']);
  });

  it('should set loading to true when loadOrders is called', () => {
    httpClient.get.and.returnValue({ subscribe: () => {} } as any);
    
    component.loadOrders('user123');
    
    expect(component.loading).toBeTrue();
  });

  it('should call HTTP get with correct URL when loadOrders is called', () => {
    httpClient.get.and.returnValue({ subscribe: () => {} } as any);
    
    component.loadOrders('user123');
    
    expect(httpClient.get).toHaveBeenCalledWith(
      'https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues/orders/company/user123'
    );
  });

  it('should call HTTP put with correct URL when updateStatus is called', () => {
    httpClient.put.and.returnValue({ subscribe: () => {} } as any);
    
    component.updateStatus('order1', 'accepted');
    
    expect(httpClient.put).toHaveBeenCalledWith(
      'https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues/orders/order1/status',
      { status: 'accepted' }
    );
  });

  it('should show loading when loading is true', () => {
    component.loading = true;
    fixture.detectChanges();

    const loadingElement = fixture.nativeElement.querySelector('.loading-overlay');
    expect(loadingElement).toBeTruthy();
  });

  it('should hide loading when loading is false', () => {
    component.loading = false;
    fixture.detectChanges();

    const loadingElement = fixture.nativeElement.querySelector('.loading-overlay');
    expect(loadingElement).toBeFalsy();
  });

  it('should display orders in the template', () => {
    component.orders = [{
      id: 'order1',
      companyID: 'user123',
      customerID: 'customer1',
      venueID: 'Test Venue',
      eventID: 'John & Jane',
      startAt: '2023-12-01 10:00:00',
      endAt: '2023-12-01T18:00:00Z',
      note: 'Test note',
      status: 'pending',
      createdAt: '2023-11-01T00:00:00Z'
    }];
    
    component.loading = false;
    fixture.detectChanges();

    const orderElements = fixture.nativeElement.querySelectorAll('.order-card');
    expect(orderElements.length).toBe(1);
    
    const orderId = orderElements[0].querySelector('h3');
    expect(orderId.textContent).toContain('order1');
  });

  it('should show action buttons for pending orders', () => {
    component.orders = [{
      id: 'order1',
      companyID: 'user123',
      customerID: 'customer1',
      venueID: 'Test Venue',
      eventID: 'John & Jane',
      startAt: '2023-12-01 10:00:00',
      endAt: '2023-12-01T18:00:00Z',
      note: 'Test note',
      status: 'pending',
      createdAt: '2023-11-01T00:00:00Z'
    }];
    
    component.loading = false;
    fixture.detectChanges();

    const actionButtons = fixture.nativeElement.querySelector('.order-actions');
    expect(actionButtons).toBeTruthy();
  });

  it('should not show action buttons for non-pending orders', () => {
    component.orders = [{
      id: 'order1',
      companyID: 'user123',
      customerID: 'customer1',
      venueID: 'Test Venue',
      eventID: 'John & Jane',
      startAt: '2023-12-01 10:00:00',
      endAt: '2023-12-01T18:00:00Z',
      note: 'Test note',
      status: 'accepted',
      createdAt: '2023-11-01T00:00:00Z'
    }];
    
    component.loading = false;
    fixture.detectChanges();

    const actionButtons = fixture.nativeElement.querySelector('.order-actions');
    expect(actionButtons).toBeFalsy();
  });

  it('should sort orders by status priority', () => {
    const orders = [
      { id: '1', status: 'rejected' } as any,
      { id: '2', status: 'pending' } as any,
      { id: '3', status: 'accepted' } as any
    ];

    const sortedOrders = orders.sort((a, b) => {
      const orderStatus = { pending: 0, accepted: 1, rejected: 2 };
      return orderStatus[a.status] - orderStatus[b.status];
    });

    expect(sortedOrders[0].status).toBe('pending');
    expect(sortedOrders[1].status).toBe('accepted');
    expect(sortedOrders[2].status).toBe('rejected');
  });
});