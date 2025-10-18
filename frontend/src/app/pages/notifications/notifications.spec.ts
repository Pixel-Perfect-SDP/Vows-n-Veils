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
  let mockUser: any;
  let mockAuth: any;

  const mockNotification = {
    id: 'notification-1',
    from: 'Test User',
    message: 'Test notification message',
    date: { toDate: () => new Date('2024-01-01') },
    read: false
  };

  const mockNotificationRead = {
    id: 'notification-2', 
    from: 'Test User 2',
    message: 'Read notification message',
    date: new Date('2024-01-02'),
    read: true
  };

  beforeEach(async () => {
    // Create mocks following trackorders pattern
    mockRouter = { 
      navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true)),
      navigateByUrl: jasmine.createSpy('navigateByUrl').and.returnValue(Promise.resolve(true))
    };
    
    mockHttpClient = {
      get: jasmine.createSpy('get').and.returnValue(of({})),
      put: jasmine.createSpy('put').and.returnValue(of({}))
    };

    mockUser = {
      uid: 'test-user-123'
    };

    mockAuth = {
      currentUser: mockUser
    };

    // Mock Firebase imports
   
    await TestBed.configureTestingModule({
      imports: [Notifications],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: HttpClient, useValue: mockHttpClient }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Notifications);
    component = fixture.componentInstance;
    component.user = { uid: 'test-user-123' } as any;
    // Override private properties with our mocks (same pattern as trackorders)
    (component as any).router = mockRouter;
    (component as any).http = mockHttpClient;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.notifications).toEqual([]);
    expect(component.loading).toBeFalse();
    expect(component.user).toEqual(mockUser);
  });

  it('should handle no user logged in during ngOnInit', fakeAsync(() => {
    // Set user to null
    mockAuth.currentUser = null;
    
    // Recreate component with null user
    fixture = TestBed.createComponent(Notifications);
    component = fixture.componentInstance;
    (component as any).router = mockRouter;
    (component as any).http = mockHttpClient;

    spyOn(console, 'warn');
    
    component.ngOnInit();
    tick();

    expect(console.warn).toHaveBeenCalledWith('No user logged in, cannot fetch notifications');
    expect(component.loading).toBeFalse();
  }));

  it('should fetch notifications successfully', fakeAsync(() => {
    const mockResponse = {
      notifications: [mockNotification, mockNotificationRead]
    };

    mockHttpClient.get.and.returnValue(of(mockResponse));
    mockHttpClient.put.and.returnValue(of({}));

    component.ngOnInit();
    tick();

    expect(mockHttpClient.get).toHaveBeenCalledWith(
      'https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues/notifications/test-user-123'
    );
    expect(component.notifications.length).toBe(2);
    expect(component.loading).toBeFalse();
  }));

  it('should sort notifications by read status', fakeAsync(() => {
    const mockResponse = {
      notifications: [mockNotificationRead, mockNotification] // Read first, unread second
    };

    mockHttpClient.get.and.returnValue(of(mockResponse));
    mockHttpClient.put.and.returnValue(of({}));

    component.ngOnInit();
    tick();

    // Should be sorted with unread first
    expect(component.notifications[0].read).toBeFalse();
    expect(component.notifications[1].read).toBeTrue();
  }));

  it('should mark unread notifications as read', fakeAsync(() => {
    const mockResponse = {
      notifications: [mockNotification] // One unread notification
    };

    mockHttpClient.get.and.returnValue(of(mockResponse));
    mockHttpClient.put.and.returnValue(of({}));

    component.ngOnInit();
    tick();

    expect(mockHttpClient.put).toHaveBeenCalledWith(
      `https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues/notifications/${mockNotification.id}/read`,
      {}
    );
  }));

  it('should handle date conversion for Firebase Timestamp', fakeAsync(() => {
    const mockResponse = {
      notifications: [mockNotification]
    };

    mockHttpClient.get.and.returnValue(of(mockResponse));
    mockHttpClient.put.and.returnValue(of({}));

    component.ngOnInit();
    tick();

    expect(component.notifications[0].date).toEqual(jasmine.any(Date));
  }));

  it('should handle date conversion for regular Date string', fakeAsync(() => {
    const notificationWithStringDate = {
      ...mockNotification,
      date: '2024-01-01T00:00:00.000Z'
    };

    const mockResponse = {
      notifications: [notificationWithStringDate]
    };

    mockHttpClient.get.and.returnValue(of(mockResponse));
    mockHttpClient.put.and.returnValue(of({}));

    component.ngOnInit();
    tick();

    expect(component.notifications[0].date).toEqual(jasmine.any(Date));
  }));

  it('should handle fetch notifications error', fakeAsync(() => {
    spyOn(console, 'error');
    mockHttpClient.get.and.returnValue(throwError(() => new Error('API error')));

    component.ngOnInit();
    tick();

    expect(console.error).toHaveBeenCalledWith('Error fetching notifications from API:', jasmine.any(Error));
    expect(component.loading).toBeFalse();
  }));

  it('should handle mark as read API errors gracefully', fakeAsync(() => {
    const mockResponse = {
      notifications: [mockNotification]
    };

    spyOn(console, 'error');
    mockHttpClient.get.and.returnValue(of(mockResponse));
    mockHttpClient.put.and.returnValue(throwError(() => new Error('Mark read error')));

    component.ngOnInit();
    tick();

    expect(console.error).toHaveBeenCalledWith('Error fetching notifications from API:', jasmine.any(Error));
  }));

  it('should handle empty notifications array', fakeAsync(() => {
    const mockResponse = {
      notifications: []
    };

    mockHttpClient.get.and.returnValue(of(mockResponse));

    component.ngOnInit();
    tick();

    expect(component.notifications.length).toBe(0);
    expect(component.loading).toBeFalse();
    expect(mockHttpClient.put).not.toHaveBeenCalled(); // No unread notifications to mark
  }));

  it('should handle undefined notifications in response', fakeAsync(() => {
    const mockResponse = {
      notifications: undefined
    };

    mockHttpClient.get.and.returnValue(of(mockResponse));

    component.ngOnInit();
    tick();

    expect(component.notifications).toEqual([]);
    expect(component.loading).toBeFalse();
  }));

  it('should set loading states correctly during fetch', fakeAsync(() => {
    const mockResponse = {
      notifications: [mockNotification]
    };

    mockHttpClient.get.and.returnValue(of(mockResponse));
    mockHttpClient.put.and.returnValue(of({}));

    expect(component.loading).toBeFalse();
    
    component.ngOnInit();
    expect(component.loading).toBeTrue();
    
    tick();
    expect(component.loading).toBeFalse();
  }));

  it('should navigate back home with history state', () => {
    spyOnProperty(history, 'state', 'get').and.returnValue({ from: '/previous-page' });

    component.backhome();

    expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/previous-page');
  });

  it('should navigate to landing when no history state', () => {
    spyOnProperty(history, 'state', 'get').and.returnValue({});

    component.backhome();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/landing']);
  });

  it('should handle multiple unread notifications', fakeAsync(() => {
    const multipleUnreadNotifications = [
      mockNotification,
      { ...mockNotification, id: 'notification-2' },
      { ...mockNotification, id: 'notification-3' }
    ];

    const mockResponse = {
      notifications: multipleUnreadNotifications
    };

    mockHttpClient.get.and.returnValue(of(mockResponse));
    mockHttpClient.put.and.returnValue(of({}));

    component.ngOnInit();
    tick();

    expect(mockHttpClient.put).toHaveBeenCalledTimes(3);
    expect(mockHttpClient.put).toHaveBeenCalledWith(
      'https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues/notifications/notification-1/read',
      {}
    );
    expect(mockHttpClient.put).toHaveBeenCalledWith(
      'https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues/notifications/notification-2/read',
      {}
    );
    expect(mockHttpClient.put).toHaveBeenCalledWith(
      'https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues/notifications/notification-3/read',
      {}
    );
  }));

  it('should handle notifications with missing properties', fakeAsync(() => {
    const incompleteNotification = {
      id: 'notification-1',
      read: false
      // Missing from, message, date
    };

    const mockResponse = {
      notifications: [incompleteNotification]
    };

    mockHttpClient.get.and.returnValue(of(mockResponse));
    mockHttpClient.put.and.returnValue(of({}));

    component.ngOnInit();
    tick();

    expect(component.notifications.length).toBe(1);
    expect(component.notifications[0].from).toBeUndefined();
    expect(component.notifications[0].message).toBeUndefined();
    expect(component.notifications[0].date).toEqual(jasmine.any(Date)); // Should still create Date from undefined
  }));

  it('should handle null date values', fakeAsync(() => {
    const notificationWithNullDate = {
      ...mockNotification,
      date: null
    };

    const mockResponse = {
      notifications: [notificationWithNullDate]
    };

    mockHttpClient.get.and.returnValue(of(mockResponse));
    mockHttpClient.put.and.returnValue(of({}));

    component.ngOnInit();
    tick();

    expect(component.notifications[0].date).toEqual(jasmine.any(Date)); // Should create new Date()
  }));

  it('should handle undefined date values', fakeAsync(() => {
    const notificationWithUndefinedDate = {
      ...mockNotification,
      date: undefined
    };

    const mockResponse = {
      notifications: [notificationWithUndefinedDate]
    };

    mockHttpClient.get.and.returnValue(of(mockResponse));
    mockHttpClient.put.and.returnValue(of({}));

    component.ngOnInit();
    tick();

    expect(component.notifications[0].date).toEqual(jasmine.any(Date)); // Should create new Date()
  }));

  it('should handle mixed read/unread notifications sorting', fakeAsync(() => {
    const mixedNotifications = [
      { ...mockNotification, id: '1', read: true },
      { ...mockNotification, id: '2', read: false },
      { ...mockNotification, id: '3', read: true },
      { ...mockNotification, id: '4', read: false }
    ];

    const mockResponse = {
      notifications: mixedNotifications
    };

    mockHttpClient.get.and.returnValue(of(mockResponse));
    mockHttpClient.put.and.returnValue(of({}));

    component.ngOnInit();
    tick();

    // First two should be unread (false), last two should be read (true)
    expect(component.notifications[0].read).toBeFalse();
    expect(component.notifications[1].read).toBeFalse();
    expect(component.notifications[2].read).toBeTrue();
    expect(component.notifications[3].read).toBeTrue();
  }));

  it('should not mark read notifications as read', fakeAsync(() => {
    const mockResponse = {
      notifications: [mockNotificationRead] // Only read notifications
    };

    mockHttpClient.get.and.returnValue(of(mockResponse));

    component.ngOnInit();
    tick();

    expect(mockHttpClient.put).not.toHaveBeenCalled(); // No unread notifications to mark
  }));

  it('should handle network errors during mark as read', fakeAsync(() => {
    const mockResponse = {
      notifications: [mockNotification]
    };

    spyOn(console, 'error');
    mockHttpClient.get.and.returnValue(of(mockResponse));
    mockHttpClient.put.and.returnValue(throwError(() => new Error('Network error')));

    component.ngOnInit();
    tick();

    expect(console.error).toHaveBeenCalledWith('Error fetching notifications from API:', jasmine.any(Error));
  }));

  it('should maintain loading state during error', fakeAsync(() => {
    spyOn(console, 'error');
    mockHttpClient.get.and.returnValue(throwError(() => new Error('API error')));

    component.ngOnInit();
    expect(component.loading).toBeTrue();
    
    tick();
    expect(component.loading).toBeFalse();
  }));
});