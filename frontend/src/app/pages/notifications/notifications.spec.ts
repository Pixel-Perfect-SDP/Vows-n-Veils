import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { Notifications } from './notifications';

describe('Notifications', () => {
  let component: Notifications;
  let fixture: ComponentFixture<Notifications>;
  let mockRouter: any;
  let mockHttpClient: any;

  const mockNotifications = [
    {
      id: '1',
      from: 'Venue A',
      message: 'Your booking was confirmed',
      date: { toDate: () => new Date('2024-01-01') },
      read: false
    },
    {
      id: '2',
      from: 'Venue B',
      message: 'Booking request received',
      date: new Date('2024-01-02'),
      read: true
    },
    {
      id: '3',
      from: 'Venue C',
      message: 'Payment received',
      date: { toDate: () => new Date('2024-01-03') },
      read: false
    }
  ];

  beforeEach(async () => {
    // Create simple mocks following trackorders pattern
    mockRouter = { 
      navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true)),
      navigateByUrl: jasmine.createSpy('navigateByUrl').and.returnValue(Promise.resolve(true))
    };
    
    mockHttpClient = {
      get: jasmine.createSpy('get').and.returnValue(of({})),
      put: jasmine.createSpy('put').and.returnValue(of({}))
    };

    await TestBed.configureTestingModule({
      imports: [Notifications],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: HttpClient, useValue: mockHttpClient }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Notifications);
    component = fixture.componentInstance;
    
    // Mock the user property directly (simpler than Firebase mocking)
    component.user = {
      uid: 'test-user-123',
      email: 'test@example.com'
    } as any;
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty notifications array', () => {
    expect(component.notifications).toEqual([]);
  });

  describe('ngOnInit', () => {
    it('should fetch notifications successfully and mark unread as read', fakeAsync(() => {
      const apiUrl = `https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues/notifications/${component.user?.uid}`;
      
      mockHttpClient.get.and.returnValue(of({ notifications: mockNotifications }));

      component.ngOnInit();
      tick();

      expect(mockHttpClient.get).toHaveBeenCalledWith(apiUrl);
      expect(component.notifications.length).toBe(3);
      
      // Should mark unread notifications as read
      expect(mockHttpClient.put).toHaveBeenCalledWith(
        `https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues/notifications/1/read`,
        {}
      );
      expect(mockHttpClient.put).toHaveBeenCalledWith(
        `https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues/notifications/3/read`,
        {}
      );

      // Verify date processing
      expect(component.notifications[0].date instanceof Date).toBeTrue();
      expect(component.notifications[1].date instanceof Date).toBeTrue();
      expect(component.notifications[2].date instanceof Date).toBeTrue();
    }));

    it('should handle case when user is not logged in', () => {
      component.user = null;
      spyOn(console, 'warn');
      
      component.ngOnInit();

      expect(console.warn).toHaveBeenCalledWith('No user logged in, cannot fetch notifications');
      expect(mockHttpClient.get).not.toHaveBeenCalled();
    });

    it('should handle empty notifications array from API', fakeAsync(() => {
      mockHttpClient.get.and.returnValue(of({ notifications: [] }));

      component.ngOnInit();
      tick();

      expect(component.notifications).toEqual([]);
      expect(mockHttpClient.put).not.toHaveBeenCalled(); // No unread notifications to mark
    }));

    it('should handle API error gracefully', fakeAsync(() => {
      spyOn(console, 'error');
      mockHttpClient.get.and.returnValue(throwError(() => new Error('API error')));

      component.ngOnInit();
      tick();

      expect(console.error).toHaveBeenCalledWith('Error fetching notifications from API:', jasmine.any(Error));
    }));

    it('should handle mark read API errors gracefully', fakeAsync(() => {
      spyOn(console, 'error');
      
      // Return successful notifications but failing mark read calls
      mockHttpClient.get.and.returnValue(of({ notifications: [mockNotifications[0]] }));
      mockHttpClient.put.and.returnValue(throwError(() => new Error('Mark read error')));

      component.ngOnInit();
      tick();

      expect(console.error).toHaveBeenCalled();
    }));

    it('should sort notifications with unread first', fakeAsync(() => {
      const mixedNotifications = [
        { id: '1', from: 'A', message: 'A', date: new Date(), read: true },
        { id: '2', from: 'B', message: 'B', date: new Date(), read: false },
        { id: '3', from: 'C', message: 'C', date: new Date(), read: true }
      ];
      
      mockHttpClient.get.and.returnValue(of({ notifications: mixedNotifications }));

      component.ngOnInit();
      tick();

      // The unread notification (id: 2) should be first after sorting
      expect(component.notifications[0].id).toBe('2');
      expect(component.notifications[0].read).toBeFalse();
    }));

    it('should handle date conversion for both firebase timestamp and regular date', fakeAsync(() => {
      const mixedDateNotifications = [
        {
          id: '1',
          from: 'Test',
          message: 'Test message',
          date: { toDate: () => new Date('2024-01-01') }, // Firebase timestamp
          read: false
        },
        {
          id: '2', 
          from: 'Test 2',
          message: 'Test message 2',
          date: '2024-01-02T00:00:00.000Z', // Regular date string
          read: true
        }
      ];

      mockHttpClient.get.and.returnValue(of({ notifications: mixedDateNotifications }));

      component.ngOnInit();
      tick();

      expect(component.notifications[0].date instanceof Date).toBeTrue();
      expect(component.notifications[1].date instanceof Date).toBeTrue();
    }));

    it('should not mark read requests when no unread notifications', fakeAsync(() => {
      const allReadNotifications = [
        { id: '1', from: 'A', message: 'A', date: new Date(), read: true },
        { id: '2', from: 'B', message: 'B', date: new Date(), read: true }
      ];
      
      mockHttpClient.get.and.returnValue(of({ notifications: allReadNotifications }));

      component.ngOnInit();
      tick();

      expect(mockHttpClient.put).not.toHaveBeenCalled();
    }));
  });

  describe('backhome', () => {
    it('should navigate to previous page when from state exists', () => {
      const mockState = { from: '/previous-page' };
      spyOnProperty(history, 'state', 'get').and.returnValue(mockState);

      component.backhome();

      expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/previous-page');
    });

    it('should navigate to landing page when no from state exists', () => {
      spyOnProperty(history, 'state', 'get').and.returnValue({});

      component.backhome();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/landing']);
    });

    it('should navigate to landing page when from state is empty', () => {
      spyOnProperty(history, 'state', 'get').and.returnValue({ from: '' });

      component.backhome();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/landing']);
    });

    it('should navigate to landing page when from state is null', () => {
      spyOnProperty(history, 'state', 'get').and.returnValue({ from: null });

      component.backhome();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/landing']);
    });
  });

  describe('Edge Cases', () => {
    it('should handle notifications with missing properties', fakeAsync(() => {
      const incompleteNotifications = [
        { id: '1', read: false }, // Missing from, message, date
        { id: '2', from: 'Test', read: true } // Missing message, date
      ];
      
      mockHttpClient.get.and.returnValue(of({ notifications: incompleteNotifications }));

      component.ngOnInit();
      tick();

      expect(component.notifications.length).toBe(2);
      expect(component.notifications[0].from).toBeUndefined();
      expect(component.notifications[1].message).toBeUndefined();
    }));

    it('should handle null date values gracefully', fakeAsync(() => {
      const notificationsWithNullDate = [
        { id: '1', from: 'Test', message: 'Test', date: null, read: false }
      ];
      
      mockHttpClient.get.and.returnValue(of({ notifications: notificationsWithNullDate }));

      component.ngOnInit();
      tick();

      expect(component.notifications[0].date).toBeNull();
    }));

    it('should handle undefined date values gracefully', fakeAsync(() => {
      const notificationsWithUndefinedDate = [
        { id: '1', from: 'Test', message: 'Test', read: false } // No date property
      ];
      
      mockHttpClient.get.and.returnValue(of({ notifications: notificationsWithUndefinedDate }));

      component.ngOnInit();
      tick();

      expect(component.notifications[0].date).toBeUndefined();
    }));

    it('should handle network timeout during notifications fetch', fakeAsync(() => {
      spyOn(console, 'error');
      mockHttpClient.get.and.returnValue(throwError(() => ({ name: 'TimeoutError' })));

      component.ngOnInit();
      tick();

      expect(console.error).toHaveBeenCalledWith('Error fetching notifications from API:', jasmine.any(Object));
    }));

    it('should process notifications even when some mark read requests fail', fakeAsync(() => {
      spyOn(console, 'error');
      
      const multipleUnreadNotifications = [
        { id: '1', from: 'A', message: 'A', date: new Date(), read: false },
        { id: '2', from: 'B', message: 'B', date: new Date(), read: false },
        { id: '3', from: 'C', message: 'C', date: new Date(), read: false }
      ];
      
      mockHttpClient.get.and.returnValue(of({ notifications: multipleUnreadNotifications }));
      
      // First call succeeds, second fails, third succeeds
      let callCount = 0;
      mockHttpClient.put.and.callFake(() => {
        callCount++;
        if (callCount === 2) {
          return throwError(() => new Error('Second mark read failed'));
        }
        return of({});
      });

      component.ngOnInit();
      tick();

      expect(console.error).toHaveBeenCalled();
      expect(component.notifications.length).toBe(3);
    }));
  });
});