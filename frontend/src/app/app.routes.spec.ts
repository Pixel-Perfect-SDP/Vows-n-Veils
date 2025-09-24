import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Routes, Router } from '@angular/router';
import { Location } from '@angular/common';
import { RouterTestingModule } from '@angular/router/testing';
import { routes as appRoutes } from './app.routes';

/** ---- Tiny standalone stubs for each route ---- */
import { Component } from '@angular/core';

@Component({ standalone: true, template: 'landing' }) class LandingStub {}
@Component({ standalone: true, template: 'login' }) class LoginStub {}
@Component({ standalone: true, template: 'rsvp' }) class RsvpStub {}
@Component({ standalone: true, template: 'homepage' }) class HomepageStub {}
@Component({ standalone: true, template: 'venues' }) class VenuesStub {}
@Component({ standalone: true, template: 'invitations' }) class InvitationsStub {}
@Component({ standalone: true, template: 'guest-list' }) class GuestListStub {}
@Component({ standalone: true, template: 'vendors-couples' }) class VendorCouplesStub {}
@Component({ standalone: true, template: 'venues-couples' }) class VenuesCouplesStub {}
@Component({ standalone: true, template: 'vendors-company' }) class VendorsCompanyStub {}
@Component({ standalone: true, template: 'manageservices' }) class ManageServicesStub {}
@Component({ standalone: true, template: 'support-page' }) class SupportPageStub {}
@Component({ standalone: true, template: 'admin' }) class AdminStub {}

/** We don’t import the real pages; we test navigation with stubs */
const stubRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'landing' },
  { path: 'landing', component: LandingStub },
  { path: 'login', component: LoginStub },
  { path: 'RSVP', component: RsvpStub },
  { path: 'homepage', component: HomepageStub },
  { path: 'venues', component: VenuesStub },
  { path: 'invitations', component: InvitationsStub },
  { path: 'guest-list', component: GuestListStub },
  { path: 'vendors-couples', component: VendorCouplesStub },
  { path: 'venues-couples', component: VenuesCouplesStub },
  { path: 'vendors-company', component: VendorsCompanyStub },
  { path: 'manageservices', component: ManageServicesStub },
  { path: 'support-page', component: SupportPageStub },
  { path: 'admin', component: AdminStub },
  { path: '**', redirectTo: 'landing' },
];

/** ---------- Route-table shape tests (no navigation) ---------- */
describe('App routes (shape)', () => {
  it('has default redirect "" -> landing and wildcard -> landing', () => {
    const root = appRoutes.find(r => r.path === '');
    expect(root?.redirectTo).toBe('landing');
    const wildcard = appRoutes.find(r => r.path === '**');
    expect(wildcard?.redirectTo).toBe('landing');
  });

  it('declares lazy routes for all pages', () => {
    const expected = [
      'landing','login','RSVP','homepage','venues','invitations',
      'guest-list','vendors-couples','venues-couples','vendors-company',
      'manageservices','support-page','admin'
    ];
    const lazyPaths = appRoutes
      .filter((r: any) => typeof r.loadComponent === 'function')
      .map(r => r.path);

    expected.forEach(p => expect(lazyPaths).toContain(p));
  });
});

/** ---------- Navigation tests (with stubs) ---------- */
describe('App routing (navigation)', () => {
  let router: Router;
  let location: Location;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes(stubRoutes)],
    }).compileComponents();

    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
  });

  it('redirects "" to /landing', fakeAsync(() => {
    router.navigateByUrl('');
    tick();
    expect(location.path()).toBe('/landing');
  }));

  it('navigates to /login', fakeAsync(() => {
    router.navigateByUrl('/login');
    tick();
    expect(location.path()).toBe('/login');
  }));

  it('navigates to /admin', fakeAsync(() => {
    router.navigateByUrl('/admin');
    tick();
    expect(location.path()).toBe('/admin');
  }));

  it('wildcard redirects to /landing', fakeAsync(() => {
    router.navigateByUrl('/does-not-exist');
    tick();
    expect(location.path()).toBe('/landing');
  }));
});
