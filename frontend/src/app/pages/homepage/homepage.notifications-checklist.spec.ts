import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { Homepage } from './homepage';
import { AuthService } from '../../core/auth';
import { DataService } from '../../core/data.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import * as fbApp from 'firebase/app';
import * as fbFs from 'firebase/firestore';

const appSpies = (fbApp as any).__spies;
const fsSpies = (fbFs as any).__spies;

describe('Homepage – notifications & checklist', () => {
  let fixture: ComponentFixture<Homepage>;
  let comp: Homepage;
  let httpMock: HttpTestingController;

  let getDocsSpy: jasmine.Spy;
  let addDocSpy: jasmine.Spy;
  let updateDocSpy: jasmine.Spy;
  let deleteDocSpy: jasmine.Spy;

  const authStub = { user: () => ({ uid: 'U1' }) } as AuthService;
  const dataServiceStub = {
    getVenueById: () => of({ address: '123 Street' }),
    getWeatherCrossing: () => of({}),
    getGuestsByEvent: () => of([]),
    getGuestFilterOptions: () => of({ dietary: [], allergies: [] }),
    postGuest: () => of({}),
    deleteGuest: () => of({}),
    downloadGuestsCsv: () => of(new Blob()),
    downloadGuestsPdf: () => of(new Blob()),
    sendGuestInvite: () => of({ success: true }),
  } as unknown as DataService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Homepage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authStub },
        { provide: DataService, useValue: dataServiceStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Homepage);
    comp = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    spyOn(appSpies, 'getApps').and.returnValue([{}]);
    spyOn(appSpies, 'getApp').and.returnValue({});
    spyOn(appSpies, 'initializeApp').and.returnValue({});
    spyOn(fsSpies, 'getFirestore').and.returnValue({} as any);
    spyOn(fsSpies, 'collection').and.callFake((_db: any, path: string) => ({ path }));
    spyOn(fsSpies, 'doc').and.callFake((_db: any, coll: string, id?: string) => ({ coll, id }));
    getDocsSpy = spyOn(fsSpies, 'getDocs').and.resolveTo({ forEach: () => {} } as any);
    addDocSpy = spyOn(fsSpies, 'addDoc').and.resolveTo({});
    updateDocSpy = spyOn(fsSpies, 'updateDoc').and.resolveTo({});
    deleteDocSpy = spyOn(fsSpies, 'deleteDoc').and.resolveTo({});
    spyOn(fsSpies, 'serverTimestamp').and.returnValue('ts');
  });

  afterEach(() => {
    httpMock.verify();
    getDocsSpy.calls.reset();
    addDocSpy.calls.reset();
    updateDocSpy.calls.reset();
    deleteDocSpy.calls.reset();
    getDocsSpy.and.resolveTo({ forEach: () => {} } as any);
    addDocSpy.and.resolveTo({});
    updateDocSpy.and.resolveTo({});
    deleteDocSpy.and.resolveTo({});
  });

  it('fetchNotifications maps response and counts unread', async () => {
    const promise = comp.fetchNotifications();

    const req = httpMock.expectOne('https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues/notifications/U1');
    expect(req.request.method).toBe('GET');
    req.flush({
      notifications: [
        { id: 'n1', from: 'A', to: 'B', message: 'Hi', date: '2024-01-01', read: false },
        { id: 'n2', from: 'C', to: 'D', message: 'Hello', date: '2024-01-02', read: true },
      ],
    });

    await promise;
    expect(comp.notifications.length).toBe(2);
    expect(comp.notifications[0]).toEqual(jasmine.objectContaining({ uid: 'n1', read: false }));
    expect(comp.unreadCount).toBe(1);
  });

  it('fetchNotifications handles HTTP failure', async () => {
    spyOn(console, 'error');

    const promise = comp.fetchNotifications();
    const req = httpMock.expectOne('https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues/notifications/U1');
    req.flush('fail', { status: 500, statusText: 'Server Error' });

    await promise;
    expect(console.error).toHaveBeenCalled();
    expect(comp.notifications).toEqual([]);
    expect(comp.unreadCount).toBe(0);
  });

  it('loadChecklist sorts tasks by due date and marks loading flags', async () => {
    spyOn(comp as any, 'waitForUser').and.resolveTo({ uid: 'U1' });

    const snap = {
      forEach: (fn: (d: any) => void) => {
        fn({ id: 'b', data: () => ({ title: 'Later', dueDate: '2025-05-10', done: false }) });
        fn({ id: 'a', data: () => ({ title: 'Soon', dueDate: '2024-12-01', done: true }) });
      },
    };
    getDocsSpy.and.resolveTo(snap as any);

    const promise = comp.loadChecklist();
    expect(comp.checklistLoading).toBeTrue();
    await promise;

    expect(comp.checklistLoading).toBeFalse();
    expect(comp.checklist.length).toBe(2);
    expect(comp.checklist[0].title).toBe('Soon');
    expect(comp.checklist[1].title).toBe('Later');
  });

  it('loadChecklist handles errors gracefully', async () => {
    spyOn(comp as any, 'waitForUser').and.resolveTo({ uid: 'U1' });
    getDocsSpy.and.rejectWith(new Error('nope'));
    spyOn(console, 'error');

    await comp.loadChecklist();

    expect(console.error).toHaveBeenCalled();
    expect(comp.checklistLoading).toBeFalse();
  });

  it('toggleAddTask toggles form visibility and resets when closing', () => {
    comp.toggleAddTask();
    expect(comp.showAddTask).toBeTrue();

    comp.addTaskForm.patchValue({ title: 'Task' });
    comp.toggleAddTask();
    expect(comp.showAddTask).toBeFalse();
    expect(comp.addTaskForm.value.title).toBe('');
  });

  it('submitAddTask creates task and refreshes checklist', async () => {
    spyOn(comp as any, 'waitForUser').and.resolveTo({ uid: 'U1' });
    addDocSpy.and.resolveTo({});
    const loadChecklistSpy = spyOn(comp, 'loadChecklist').and.resolveTo();
    const toggleSpy = spyOn(comp, 'toggleAddTask').and.callThrough();

    comp.addTaskForm.patchValue({ title: 'Plan', dueDate: '2025-01-01', assignee: 'Alex', priority: 'high' });

    await comp.submitAddTask();

    expect(addDocSpy).toHaveBeenCalled();
    expect(loadChecklistSpy).toHaveBeenCalled();
    expect(toggleSpy).toHaveBeenCalled();
    expect(comp.checklistLoading).toBeFalse();
  });

  it('submitAddTask handles addDoc failure', async () => {
    spyOn(comp as any, 'waitForUser').and.resolveTo({ uid: 'U1' });
    addDocSpy.and.rejectWith(new Error('fail'));
    spyOn(window, 'alert');
    comp.addTaskForm.patchValue({ title: 'Fail task' });

    await comp.submitAddTask();

    expect(window.alert).toHaveBeenCalledWith('Failed to add task. Please try again.');
    expect(comp.checklistLoading).toBeFalse();
  });

  it('toggleTaskDone toggles status and reloads checklist', async () => {
    spyOn(comp as any, 'waitForUser').and.resolveTo({ uid: 'U1' });
    updateDocSpy.and.resolveTo({});
    const loadChecklistSpy = spyOn(comp, 'loadChecklist').and.resolveTo();

    await comp.toggleTaskDone({ id: 't1', title: 'Task', done: false } as any);

    expect(updateDocSpy).toHaveBeenCalled();
    expect(loadChecklistSpy).toHaveBeenCalled();
    expect(comp.checklistLoading).toBeFalse();
  });

  it('toggleTaskDone alerts on failure', async () => {
    spyOn(comp as any, 'waitForUser').and.resolveTo({ uid: 'U1' });
    updateDocSpy.and.rejectWith(new Error('fail'));
    spyOn(window, 'alert');

    await comp.toggleTaskDone({ id: 't1', title: 'Task', done: false } as any);

    expect(window.alert).toHaveBeenCalledWith('Failed to update task.');
    expect(comp.checklistLoading).toBeFalse();
  });

  it('deleteTask removes the task and refreshes', async () => {
    spyOn(comp as any, 'waitForUser').and.resolveTo({ uid: 'U1' });
    spyOn(window, 'confirm').and.returnValue(true);
    deleteDocSpy.and.resolveTo({});
    const loadChecklistSpy = spyOn(comp, 'loadChecklist').and.resolveTo();

    await comp.deleteTask({ id: 't2', title: 'Task', done: false } as any);

    expect(deleteDocSpy).toHaveBeenCalled();
    expect(loadChecklistSpy).toHaveBeenCalled();
    expect(comp.checklistLoading).toBeFalse();
  });

  it('deleteTask aborts when confirm is cancelled', async () => {
    spyOn(window, 'confirm').and.returnValue(false);

    await comp.deleteTask({ id: 't3', title: 'Task', done: false } as any);

    expect(deleteDocSpy).not.toHaveBeenCalled();
  });

  it('deleteTask alerts on failure', async () => {
    spyOn(comp as any, 'waitForUser').and.resolveTo({ uid: 'U1' });
    spyOn(window, 'confirm').and.returnValue(true);
    deleteDocSpy.and.rejectWith(new Error('fail'));
    spyOn(window, 'alert');

    await comp.deleteTask({ id: 't4', title: 'Task', done: false } as any);

    expect(window.alert).toHaveBeenCalledWith('Failed to delete task.');
    expect(comp.checklistLoading).toBeFalse();
  });
});
