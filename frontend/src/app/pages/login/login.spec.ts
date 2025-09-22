import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Login } from './login';
import { provideRouter } from '@angular/router';

import { AuthService } from '../../core/auth';
import { PLATFORM_ID } from '@angular/core';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { fakeAsync, tick } from '@angular/core/testing';


describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let mockAuth: any;
  let mockRouter: any;

  beforeEach(async () => {

    mockAuth = {
      signUp: jasmine.createSpy('signUp').and.returnValue(Promise.resolve()),
      signIn: jasmine.createSpy('signIn').and.returnValue(Promise.resolve()),
      signOut: jasmine.createSpy('signOut').and.returnValue(Promise.resolve()),
      sendVerification: jasmine.createSpy('sendVerification').and.returnValue(Promise.resolve()),
      resetPassword: jasmine.createSpy('resetPassword').and.returnValue(Promise.resolve()),
      signInWithGoogle: jasmine.createSpy('signInWithGoogle').and.returnValue(Promise.resolve()),
      linkGoogle: jasmine.createSpy('linkGoogle').and.returnValue(Promise.resolve()),
      user: jasmine.createSpy('user').and.returnValue({ uid: '123', email: 'test@example.com' }),
      firestore: jasmine.createSpy('firestore'),
      loading: jasmine.createSpy('loading').and.returnValue(false),
      error: jasmine.createSpy('error').and.returnValue(null) 

    };

     mockRouter = { navigateByUrl: jasmine.createSpy('navigateByUrl') };



    
    
    await TestBed.configureTestingModule({
      imports: [Login, ReactiveFormsModule],
      providers: [
        { provide: AuthService, useValue: mockAuth },
        { provide: PLATFORM_ID, useValue: 'browser' },
        FormBuilder, 
        provideRouter([])
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });


  //test the image cycling
  it('should cycle images on timer', fakeAsync(() => {
    component.ngOnInit();
    const initialA = component.idxA;
    const initialB = component.idxB;
    const initialC = component.idxC;

    tick(component.STEP_MS); 
    expect(component.idxA).toBe((initialA + 1) % component.poolA.length);

    tick(component.STEP_MS); 
    expect(component.idxB).toBe((initialB + 1) % component.poolB.length);

    tick(component.STEP_MS); 
    expect(component.idxC).toBe((initialC + 1) % component.poolC.length);
  }));


  //test if component moves to next image on error (fail to load)
  it('should handle image error correctly', () => {
    const initialA = component.idxA;
    component.onImageError('A');
    expect(component.idxA).toBe((initialA + 1) % component.poolA.length);

    const initialB = component.idxB;
    component.onImageError('B');
    expect(component.idxB).toBe((initialB + 1) % component.poolB.length);

    const initialC = component.idxC;
    component.onImageError('C');
    expect(component.idxC).toBe((initialC + 1) % component.poolC.length);
  });
  

  //fake user fills in sign up form ONSIGNUP METHOD
  it('should call auth.signUp and navigate onSignUp', async () => {
    component.form.setValue({ email: 'a@b.com', password: '123456', name: 'Test' });
    await component.onSignUp();
    expect(mockAuth.signUp).toHaveBeenCalledWith('a@b.com', '123456', 'Test');
  });

  //tests login process
  it('should call auth.signIn and navigate onSignIn', async () => {
    component.form.setValue({ email: 'a@b.com', password: '123456', name: '' });
    await component.onSignIn();
    expect(mockAuth.signIn).toHaveBeenCalledWith('a@b.com', '123456');
  });


  //fake user signout out
  it('should reset form and call auth.signOut onSignOut', async () => {
    component.form.setValue({ email: 'a@b.com', password: '123456', name: 'Test' });
    await component.onSignOut();
    expect(component.form.value).toEqual({ email: '', password: '', name: '' });
    expect(mockAuth.signOut).toHaveBeenCalled();
  });


  //fake user verifies email button
  it('should call sendVerification onVerifyEmail', async () => {
    spyOn(window, 'alert');
    await component.onVerifyEmail();
    expect(mockAuth.sendVerification).toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith('Verification email sent (if signed in).');
  });


  //fake user password reset when email is filled in
  it('should call resetPassword onResetPassword with email', async () => {
    spyOn(window, 'alert');
    component.form.setValue({ email: 'a@b.com', password: '', name: '' });
    await component.onResetPassword();
    expect(mockAuth.resetPassword).toHaveBeenCalledWith('a@b.com');
    expect(window.alert).toHaveBeenCalledWith('Password reset email sent (if the account exists).');
  });


  //password reset when no email filled in
   it('should not call resetPassword onResetPassword without email', async () => {
    spyOn(window, 'alert');
    component.form.setValue({ email: '', password: '', name: '' });
    await component.onResetPassword();
    expect(mockAuth.resetPassword).not.toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith('Enter your email first');
  });

  //tests google login
  it('should call Google sign-in and navigate onGoogle', async () => {
    await component.onGoogle();
    expect(mockAuth.signInWithGoogle).toHaveBeenCalled();
  });


  //test linking google to existing account
  it('should call linkGoogle onLinkGoogle', async () => {
    spyOn(window, 'alert');
    await component.onLinkGoogle();
    expect(mockAuth.linkGoogle).toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith('Google linked to your account.');
  });


});
