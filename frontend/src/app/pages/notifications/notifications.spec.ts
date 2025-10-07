import { TestBed } from '@angular/core/testing';
import { Notifications } from './notifications';
import * as firestore from 'firebase/firestore';
import * as auth from 'firebase/auth';
import * as firebaseApp from 'firebase/app';

const mockUser = { uid: 'user123' };
const mockData = [
  { id: 'n1', data: () => ({ message: 'hi', read: false, to: 'user123' }) },
  { id: 'n2', data: () => ({ message: 'yo', read: true, to: 'user123' }) },
];

const mockGetDocs = jasmine.createSpy('getDocs').and.callFake(async () => ({
  docs: mockData,
  size: mockData.length,
}));
const mockUpdateDoc = jasmine.createSpy('updateDoc').and.resolveTo(true);
const mockDoc = jasmine.createSpy('doc').and.callFake((db: any, col: string, id: string) => ({ id }));

describe('Notifications Component', () => {
  let component: Notifications;

  beforeEach(() => {
    spyOn(console, 'log');
    spyOn(console, 'warn');
    spyOn(console, 'error');

    spyOnProperty(firestore, 'getFirestore', 'get').and.returnValue({} as firestore.Firestore);
    spyOn(firestore, 'collection').and.returnValue('mockCollection' as any);
    spyOn(firestore, 'query').and.returnValue('mockQuery' as any);
    spyOn(firestore, 'where').and.returnValue('mockWhere' as any);
    spyOn(firestore, 'getDocs').and.callFake(mockGetDocs);
    spyOn(firestore, 'updateDoc').and.callFake(mockUpdateDoc);
    spyOn(firestore, 'doc').and.callFake(mockDoc);

    spyOn(auth, 'getAuth').and.returnValue({ currentUser: mockUser } as any);
    spyOn(firebaseApp, 'getApp').and.returnValue({} as firebaseApp.FirebaseApp);

    TestBed.configureTestingModule({
      declarations: [Notifications],
    });

    component = TestBed.createComponent(Notifications).componentInstance;
  });

  afterEach(() => {
    mockGetDocs.calls.reset();
    mockUpdateDoc.calls.reset();
    mockDoc.calls.reset();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should warn and exit if no user', async () => {
    spyOn(auth, 'getAuth').and.returnValue({ currentUser: null } as any);
    component.user = null;

    await component.ngOnInit();

    expect(console.warn).toHaveBeenCalledWith('No user logged in, cannot fetch notifications');
    expect(mockGetDocs).not.toHaveBeenCalled();
  });

  it('should fetch and update notifications for logged in user', async () => {
    await component.ngOnInit();

    expect(console.log).toHaveBeenCalledWith('Notifications component initialized');
    expect(console.log).toHaveBeenCalledWith('Logged in user:', 'user123');
    expect(console.log).toHaveBeenCalledWith('Fetching notifications from Firestore...');
    expect(console.log).toHaveBeenCalledWith(`Fetched ${mockData.length} notifications`);
    expect(console.log).toHaveBeenCalledWith('Notification data:', jasmine.any(Object));
    expect(console.log).toHaveBeenCalledWith(`Marking 1 notifications as read`);
    expect(console.log).toHaveBeenCalledWith('Notifications fetched and updated:', component.notifications);
    expect(mockGetDocs).toHaveBeenCalled();
    expect(component.notifications.length).toBe(2);
    expect(component.notifications[0].read).toBeFalse(); // Verify sorting (unread first)
    expect(component.notifications[1].read).toBeTrue();
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1); // Only unread
  });

  it('should handle empty notifications', async () => {
    mockGetDocs.and.callFake(async () => ({ docs: [], size: 0 }));

    await component.ngOnInit();

    expect(console.log).toHaveBeenCalledWith('Fetching notifications from Firestore...');
    expect(console.log).toHaveBeenCalledWith('Fetched 0 notifications');
    expect(console.log).toHaveBeenCalledWith('Marking 0 notifications as read');
    expect(component.notifications.length).toBe(0);
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    mockGetDocs.and.callFake(async () => { throw new Error('Firestore error'); });

    await component.ngOnInit();

    expect(console.error).toHaveBeenCalledWith('Error fetching notifications:', jasmine.any(Error));
    expect(component.notifications.length).toBe(0);
  });

  it('should handle malformed notification data', async () => {
    const malformedData = [
      { id: 'n1', data: () => ({ message: 'hi', to: 'user123' }) }, // Missing read field
      { id: 'n2', data: () => ({ message: 'yo', read: true, to: 'user123' }) },
    ];
    mockGetDocs.and.callFake(async () => ({ docs: malformedData, size: malformedData.length }));

    await component.ngOnInit();

    expect(component.notifications.length).toBe(2);
    expect(component.notifications[0].read).toBeUndefined(); // Malformed notification
    expect(component.notifications[1].read).toBeTrue();
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1); // Only one notification updated
  });
});