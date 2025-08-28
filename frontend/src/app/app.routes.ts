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
    path: 'homepage',
    loadComponent: () => import('./pages/homepage/homepage').then(m => m.Homepage),
  },

   {
    path: 'venue',
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
  //This must be the last route - define all other routes before this
  { path: '**', redirectTo: 'landing' },

   
];


