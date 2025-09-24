// FRONTEND UNIT TESTS FOR AuthService
// File: src/app/core/auth.spec.ts

import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth';

// Import Firebase modules as namespaces so we can spy on their named exports
import * as fbApp from 'firebase/app';
import * as fbAuth from 'firebase/auth';
import * as fbFs from 'firebase/firestore';

const appSpies = (fbApp as any).__spies;
const authSpies = (fbAuth as any).__spies;
const fsSpies = (fbFs as any).__spies;

describe('AuthService', () => {
    let service: AuthService;

    // ----- Shared mocks & spies -----
    // "App" and "Auth" stand-ins
    const mockApp = {} as unknown as fbApp.FirebaseApp;
    const mockAuth: Partial<fbAuth.Auth> = { currentUser: null };


    let onAuthCbRef: (u: unknown) => void = () => {};

    // Firestore stand-ins
    const mockDb = {} as unknown as fbFs.Firestore;
    const serverStamp = { __stamp: true } as any;

    // Utility: create a fake user object
    const fakeUser = (over: Partial<fbAuth.User> = {}): fbAuth.User =>
        ({ uid: 'u1', email: 'u1@mail.test', displayName: 'U One', photoURL: 'p.jpg', ...over } as any);

    beforeEach(async () => {
        onAuthCbRef = () => {};
        spyOn(authSpies, 'onAuthStateChanged')
            .and.callFake(
                (_a: unknown, cb: (u: unknown) => void): (() => void) => {
                    onAuthCbRef = cb;
                    (authSpies as any).__onAuthCb = cb;
                    return () => {};
                }
            );

        // firebase/app
        spyOn(appSpies, 'getApps').and.returnValue([]);
        spyOn(appSpies, 'initializeApp').and.callThrough();
        spyOn(appSpies, 'getApp').and.callThrough();

        // firebase/auth
        spyOn(authSpies, 'getAuth').and.callThrough();
        spyOn(authSpies, 'setPersistence').and.callThrough();
        spyOn(authSpies, 'createUserWithEmailAndPassword').and.callThrough();
        spyOn(authSpies, 'signInWithEmailAndPassword').and.callThrough();
        spyOn(authSpies, 'signOut').and.callThrough();
        spyOn(authSpies, 'sendEmailVerification').and.callThrough();
        spyOn(authSpies, 'sendPasswordResetEmail').and.callThrough();
        spyOn(authSpies, 'updateProfile').and.callThrough();
        spyOn(authSpies, 'signInWithPopup').and.callThrough();
        spyOn(authSpies, 'signInWithRedirect').and.callThrough();
        spyOn(authSpies, 'getAdditionalUserInfo').and.callThrough();
        spyOn(authSpies, 'fetchSignInMethodsForEmail').and.callThrough();
        spyOn(authSpies, 'linkWithPopup').and.callThrough();

        // firestore
        spyOn(fsSpies, 'getFirestore').and.callThrough();
        spyOn(fsSpies, 'doc').and.callThrough();
        spyOn(fsSpies, 'serverTimestamp').and.callThrough();
        spyOn(fsSpies, 'setDoc').and.callThrough();

        await TestBed.configureTestingModule({ providers: [AuthService] }).compileComponents();
        service = TestBed.inject(AuthService);
    });

  // Small helper to wait for pending microtasks between async calls
  const flushAsync = () => new Promise((r) => setTimeout(r, 0));

  // ---------------- Tests ----------------

  it('initializes Firebase app once and wires auth state listener', async () => {
    // First auth call triggers ensureApp()
    await service.signOut();

    expect(appSpies.getApps).toHaveBeenCalled();
    expect(authSpies.setPersistence).toHaveBeenCalledTimes(1);      
    expect(authSpies.onAuthStateChanged).toHaveBeenCalledTimes(1);

    // Simulate a login event from Firebase and ensure the signal updates
    const u = fakeUser({ uid: 'abc' });
    onAuthCbRef(u);
    await flushAsync();
    expect(service.user()).toEqual(u);

    // Subsequent calls don’t re-init
    await service.signOut();
    expect(appSpies.initializeApp).toHaveBeenCalledTimes(1);
  });

  it('signIn sets loading, calls Firebase signInWithEmailAndPassword, and clears loading', async () => {
    expect(service.loading()).toBeFalse();
    const p = service.signIn('me@mail.test', 'pw');
    expect(service.loading()).toBeTrue();
    await p;
    expect(authSpies.signInWithEmailAndPassword).toHaveBeenCalled();
    expect(service.error()).toBeNull();
    expect(service.loading()).toBeFalse();
  });

  it('signIn maps auth errors into friendly messages', async () => {
    (authSpies.signInWithEmailAndPassword as jasmine.Spy).and.callFake(async () => {
      const e = { code: 'auth/wrong-password' };
      throw e;
    });

    await expectAsync(service.signIn('me@mail.test', 'bad')).toBeRejected();
    expect(service.error()).toBe('Incorrect password.');
    expect(service.loading()).toBeFalse();
  });

  it('signUp creates user and stores profile doc; updates displayName when provided', async () => {
    await service.signUp('new@mail.test', 'pw', 'New Name');

    expect(authSpies.createUserWithEmailAndPassword).toHaveBeenCalled();
    expect(authSpies.updateProfile).toHaveBeenCalled(); // because name was provided
    expect(fsSpies.getFirestore).toHaveBeenCalled();
    expect(fsSpies.setDoc).toHaveBeenCalled();

    // Check some fields were sent (merge true is internal to setDoc; we just assert it's called)
    const [[docRef, payload, opts]] = (fsSpies.setDoc as jasmine.Spy).calls.allArgs();
    expect(docRef.id).toBeDefined();
    expect(payload.uid).toBeDefined();
    expect(payload.createdAt).toEqual(serverStamp);
    expect(opts.merge).toBeTrue();

    expect(service.loading()).toBeFalse();
    expect(service.error()).toBeNull();
  });

  it('sendVerification sets a friendly error if no current user is present', async () => {
    // Ensure currentUser is null
    ((fbAuth as any).__state.auth).currentUser = null;

    await service.sendVerification();
    expect(authSpies.sendEmailVerification).not.toHaveBeenCalled();
    expect(service.error()).toBe('You need to be signed in to verify email.');
  });

  it('resetPassword calls Firebase and clears loading; maps errors on failure', async () => {
    // happy path
    await service.resetPassword('x@y.com');
    expect(authSpies.sendPasswordResetEmail).toHaveBeenCalled();

    // error path
    (authSpies.sendPasswordResetEmail as jasmine.Spy).and.callFake(async () => {
      throw { code: 'auth/invalid-email' };
    });

    await expectAsync(service.resetPassword('bademail')).toBeRejected();
    expect(service.error()).toBe('Please use a valid email.');
    expect(service.loading()).toBeFalse();
  });

  it('signInWithGoogle (popup) writes/merges a user doc and sets createdAt for new users', async () => {
    await service.signInWithGoogle(false);

    expect(authSpies.signInWithPopup).toHaveBeenCalled();
    expect(fsSpies.setDoc).toHaveBeenCalled();

    const [[docRef, payload, opts]] = (fsSpies.setDoc as jasmine.Spy).calls.allArgs();
    expect(docRef.id).toBe('u1');                 // wrote to users/u1
    expect(payload.provider).toBe('google');      // metadata
    expect(payload.createdAt).toEqual(serverStamp); // isNewUser true -> createdAt present
    expect(opts.merge).toBeTrue();

    expect(service.error()).toBeNull();
    expect(service.loading()).toBeFalse();
  });

  it('signInWithGoogle maps specific errors (popup closed, blocked, and account-exists...)', async () => {
    // popup closed
    (authSpies.signInWithPopup as jasmine.Spy).and.callFake(async () => {
      throw { code: 'auth/popup-closed-by-user' };
    });
    await expectAsync(service.signInWithGoogle(false)).toBeRejected();
    expect(service.error()).toBe('Sign-in canceled.');

    // popup blocked
    (authSpies.signInWithPopup as jasmine.Spy).and.callFake(async () => {
      throw { code: 'auth/popup-blocked' };
    });
    await expectAsync(service.signInWithGoogle(false)).toBeRejected();
    expect(service.error()).toBe('Popup blocked. Try again or use redirect.');

    // account exists with different credential
    (authSpies.signInWithPopup as jasmine.Spy).and.callFake(async () => {
      throw { code: 'auth/account-exists-with-different-credential', customData: { email: 'x@y.com' } };
    });
    (authSpies.fetchSignInMethodsForEmail as jasmine.Spy).and.callFake(async () => ['password', 'google']);
    await expectAsync(service.signInWithGoogle(false)).toBeRejected();
    expect(service.error()).toContain('This email already exists. Sign in with: password, google');
  });

  it('linkGoogle updates user doc on success and maps errors on failure', async () => {
    // Make the test "logged in"
    const u = fakeUser({ uid: 'u2' }) as any;
    ((fbAuth as any).__state.auth).currentUser = u;

    // Success case: return the same user from linkWithPopup
    (authSpies.linkWithPopup as jasmine.Spy)
        .and.callFake(async (_user: unknown, _prov: unknown) => ({ user: u }));

    await service.linkGoogle();

    expect(authSpies.linkWithPopup).toHaveBeenCalled();
    expect(fsSpies.setDoc).toHaveBeenCalled();
    expect(service.error()).toBeNull();

    // Error mapping: credential already in use
    (authSpies.linkWithPopup as jasmine.Spy).and.callFake(async () => { throw { code: 'auth/credential-already-in-use' }; });
    await expectAsync(service.linkGoogle()).toBeRejected();
    expect(service.error()).toBe('This Google account is already linked to another user.');

    // Generic error mapping
    (authSpies.linkWithPopup as jasmine.Spy).and.callFake(async () => { throw { code: 'x/unknown' }; });
    await expectAsync(service.linkGoogle()).toBeRejected();
    expect(service.error()).toBe('Could not link Google account.');
  });

  it('mapAuthError returns friendly messages for common codes', () => {
    const map = (c?: string) => (service as any)['mapAuthError'](c);

    expect(map('auth/invalid-email')).toBe('Please use a valid email.');
    expect(map('auth/user-not-found')).toBe('No account for this email.');
    expect(map('auth/wrong-password')).toBe('Incorrect password.');
    expect(map('auth/weak-password')).toBe('Password must be at least 6 characters.');
    expect(map('auth/email-already-in-use')).toBe('Email already in use.');
    expect(map('something-else')).toBe('Authentication error. Please try again.');
  });
});
