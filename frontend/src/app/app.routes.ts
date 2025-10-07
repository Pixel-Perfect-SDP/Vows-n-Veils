import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'landing' },
  {
    path: 'landing',
    //canActivate: [authGuard],
    loadComponent: () => import('./pages/landing/landing').then(m => m.Landing),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.Login),
  },
  {
    path: 'RSVP',
    loadComponent: () => import('./pages/RSVP/rsvp').then(m => m.Rsvp)
  },

  {
    path: 'homepage',
    loadComponent: () => import('./pages/homepage/homepage').then(m => m.Homepage),
  },

   {
    path: 'venues',
    loadComponent: () => import('./pages/venues/venues').then(m => m.Venues),
  },

    {
    path: 'invitations',
    loadComponent: () => import('./pages/invitations/invitations').then(m => m.Invitations),
  },
    {
    path: 'guest-list',
    loadComponent: () => import('./pages/guest-list/guest-list').then(m => m.GuestList),
  },
    {
    path: 'vendors-couples',
    loadComponent: () => import('./pages/vendor-couples/vendor-couples').then(m => m.VendorCouples),
  },
   {
    path: 'venues-couples',
    loadComponent: () => import('./pages/venues-couples/venues-couples').then(m => m.VenuesCouples),
  },
  {
    path: 'vendors-company',
    loadComponent: () => import('./pages/vendors-company/vendors-company').then(m => m.VendorsCompany),
  },
   {
    path: 'manageservices',
    loadComponent: () => import('./pages/manageservices/manageservices').then(m => m.Manageservices),
  },
  {
    path: 'support-page',
    loadComponent: () => import('./pages/support-page/support-page').then(m => m.SupportPage),
  },

  {
    path: 'admin',
    loadComponent: () => import('./pages/admin/admin').then(m => m.Admin),
  },
    {
    path: 'notifications',
    loadComponent: () => import('./pages/notifications/notifications').then(m => m.Notifications),
  },
  {
    path: 'trackorders',
    loadComponent: () => import('./pages/trackorders/trackorders').then(m => m.Trackorders),
  },

  //This must be the last route - define all other routes before this
  { path: '**', redirectTo: 'landing' },


];
