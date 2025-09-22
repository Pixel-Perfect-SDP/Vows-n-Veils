import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Landing } from './landing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth';

describe('Landing', () => {
  let component: Landing;
  let fixture: ComponentFixture<Landing>;
  let mockRouter: any;
  let mockAuth: any;

  beforeEach(async () => {
    //make a mock of router and the auth service so we can test
    mockRouter = { navigateByUrl: jasmine.createSpy('navigateByUrl') };
    mockAuth = {
      signInWithGoogle: jasmine.createSpy('signInWithGoogle').and.returnValue(Promise.resolve()),
      firestore: jasmine.createSpy('firestore')
    };


    await TestBed.configureTestingModule({
      imports: [Landing],
      providers: [
        { provide: ActivatedRoute, useValue: { params: of({}) } },
        { provide: AuthService, useValue: mockAuth },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Landing);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });


  //test the pop up for companies
  it('should toggle companies popup', () => {
    expect(component.companiesPopup).toBeFalse();
    component.toggleCompaniesPopup();
    expect(component.companiesPopup).toBeTrue();
    component.toggleCompaniesPopup();
    expect(component.companiesPopup).toBeFalse();
  });


  //test vendor sign in
  it('should call signInAndRedirect for vendor', async () => {
    await component.onGoogleVendor();
    expect(mockAuth.signInWithGoogle).toHaveBeenCalled();
    expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/vendors-company');
  });

  //test venue sign in
  it('should call signInAndRedirect for venue', async () => {
    await component.onGoogleVenue();
    expect(mockAuth.signInWithGoogle).toHaveBeenCalled();
    expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/manageservices');
  });


  // test admin sign in
  it('should call signInAndRedirect for admin', async () => {
    await component.onGoogleAdmin();
    expect(mockAuth.signInWithGoogle).toHaveBeenCalled();
    expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/landing');
  });

  //test signin and redirect function
  it('should handle errors in signInAndRedirect', async () => {
    spyOn(console, 'error'); // spy before calling
    mockAuth.signInWithGoogle.and.returnValue(Promise.reject('fail'));
    await component.signInAndRedirect('/test');
    expect(console.error).toHaveBeenCalledWith('Google login failed', 'fail');
  });


  //test year property
  it('should have current year', () => {
    expect(component.year).toBe(new Date().getFullYear());
  });


  //test loadRecent
  






});
