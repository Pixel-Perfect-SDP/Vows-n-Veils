import { inject } from '@angular/core';
import { AuthService } from './auth';
import { Router } from '@angular/router';

export function authGuard() {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.user() ? true : router.parseUrl('/landing');
}

