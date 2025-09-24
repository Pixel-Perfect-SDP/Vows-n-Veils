import { TestBed } from '@angular/core/testing';
import { signal, type WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from './auth';

describe('authGuard', () => {
  let router: jasmine.SpyObj<Router>;
  let mockAuth: { user: WritableSignal<any> };
  const landingTree = {} as any; // fake UrlTree

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['parseUrl']);
    router.parseUrl.and.returnValue(landingTree);

    mockAuth = { user: signal<any>(null) };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: mockAuth },
      ],
    });
  });

  it('redirects to /landing when not logged in', () => {
    mockAuth.user.set(null);

    const result = TestBed.runInInjectionContext(() => authGuard());

    expect(router.parseUrl).toHaveBeenCalledWith('/landing');
    expect(result).toBe(landingTree);
  });

  it('allows navigation when logged in', () => {
    mockAuth.user.set({ uid: '123', email: 'a@b.c' });

    const result = TestBed.runInInjectionContext(() => authGuard());

    expect(result).toBeTrue();
    expect(router.parseUrl).not.toHaveBeenCalled();
  });
});
