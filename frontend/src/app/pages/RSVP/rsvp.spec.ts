import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Rsvp } from './rsvp';
import { Firestore, collection, query, where, getDocs, updateDoc, doc } from '@angular/fire/firestore';
import { AuthService } from '../../core/auth';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { of } from 'rxjs';

const mockFirestore = { app: {} };
const mockAuthService = { user$: of({ uid: 'test-uid', email: 'test@test.com' }) };
const mockRouter = { navigate: jasmine.createSpy('navigate') };

describe('RsvpComponent', () => {
  let component: Rsvp;
  let fixture: ComponentFixture<Rsvp>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule, CommonModule],
      providers: [
        { provide: Firestore, useValue: mockFirestore },
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Rsvp);
    component = fixture.componentInstance;
    fixture.detectChanges();

    spyOn(console, 'error');
  });

  // ✅ MAIN: Firestore mocks created per test
  let collectionSpy: jasmine.Spy;
  let querySpy: jasmine.Spy;
  let whereSpy: jasmine.Spy;
  let getDocsSpy: jasmine.Spy;
  let updateDocSpy: jasmine.Spy;
  let docSpy: jasmine.Spy;

    beforeEach(() => {
      collectionSpy = spyOn<any>(collection, 'collection').and.callFake(() => ({}));
      querySpy = spyOn<any>(query, 'query').and.callFake(() => ({}));
      whereSpy = spyOn<any>(where, 'where').and.callFake(() => ({}));
      getDocsSpy = spyOn<any>(getDocs, 'getDocs');
      updateDocSpy = spyOn<any>(updateDoc, 'updateDoc').and.returnValue(Promise.resolve());
      docSpy = spyOn<any>(doc, 'doc').and.callFake((db, path, id) => ({ db, path, id }));
    });

  // ✅ Cover guest found path
  it('should handle guest found and update Firestore document', fakeAsync(async () => {
    spyOn(window, 'alert');
    component.eventId = 'event1';
    component.formData = {
      guestID: '',
      Name: 'John',
      Surname: 'Doe',
      Email: 'john@example.com',
      Attending: 'Yes',
      Diet: 'Vegan',
      otherDiet: '',
      Allergy: 'None',
      Song: 'Test Song'
    };

    getDocsSpy.and.returnValue(Promise.resolve({
      empty: false,
      docs: [{ id: 'guest1' }]
    }));

    await component.onSubmit();
    tick();

    expect(collectionSpy).toHaveBeenCalled();
    expect(querySpy).toHaveBeenCalled();
    expect(whereSpy).toHaveBeenCalledTimes(2);
    expect(docSpy).toHaveBeenCalledWith(mockFirestore, 'Guests', 'guest1');
    expect(updateDocSpy).toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith('You are successfully RSVPed ✅');
    expect(component.message).toBe('RSVP updated successfully ✅');
  }));

  // ✅ Cover guest not found path
  it('should handle guest not found path correctly', fakeAsync(async () => {
    spyOn(window, 'alert');
    component.eventId = 'event2';
    component.formData.Name = 'Ghost';
    component.formData.Surname = 'User';
    component.formData.Attending = 'No';
    getDocsSpy.and.returnValue(Promise.resolve({ empty: true, docs: [] }));

    await component.onSubmit();
    tick();

    expect(window.alert).toHaveBeenCalledWith('The name you entered is not apart of the wedding party❌');
    expect(component.message).toBe('Guest not apart of wedding party ❌');
  }));

  // ✅ Cover Firestore error path
  it('should handle Firestore errors gracefully', fakeAsync(async () => {
    getDocsSpy.and.throwError('Firestore failed');

    await component.onSubmit();
    tick();

    expect(component.message).toBe('Something went wrong ❌');
  }));

  // ✅ Cover Event Code found + Story found path
  it('should handle Event Code found and story exists', fakeAsync(async () => {
    spyOn(window, 'alert');
    component.eventCode = 'CODE123';

    // Simulate 2 different getDocs calls (one for Events, one for Story)
    let callCount = 0;
    getDocsSpy.and.callFake(() => {
      callCount++;
      if (callCount === 1) {
        // Event query result
        return Promise.resolve({
          empty: false,
          docs: [{ data: () => ({ EventID: 'E123', RSVPcode: 'CODE123' }) }]
        });
      } else {
        // Story query result
        return Promise.resolve({
          empty: false,
          docs: [{ data: () => ({ story: 'Our Love Story' }) }]
        });
      }
    });

    await component.submitEventCode();
    tick();

    expect(component.eventIdEntered).toBeTrue();
    expect(component.storyData).toEqual({ story: 'Our Love Story' });
  }));

  // ✅ Cover Event Code not found path
  it('should handle Event Code not found', fakeAsync(async () => {
    spyOn(window, 'alert');
    component.eventCode = 'BADCODE';
    getDocsSpy.and.returnValue(Promise.resolve({ empty: true, docs: [] }));

    await component.submitEventCode();
    tick();

    expect(window.alert).toHaveBeenCalledWith('Event Code not found. Please try again');
    expect(component.eventIdEntered).toBeFalse();
    expect(component.message).toBe('Event Code not found ❌');
  }));

  // ✅ Cover Event Code Firestore error
  it('should handle Firestore error during event code lookup', fakeAsync(async () => {
    getDocsSpy.and.throwError('Firestore error');
    await component.submitEventCode();
    tick();

    expect(component.message).toBe('Error checking Event Code ❌');
  }));
});
