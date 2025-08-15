// src/app/core/auth.ts

import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
    GoogleAuthProvider, signInWithPopup, signInWithRedirect,
  linkWithPopup,getAdditionalUserInfo,fetchSignInMethodsForEmail,
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut as fbSignOut,
  setPersistence, browserLocalPersistence, type User,
  sendEmailVerification, sendPasswordResetEmail
} from 'firebase/auth';
import { getFirestore, type Firestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth'; // optional (sets displayName)
@Injectable({ providedIn: 'root' })
export class AuthService {
  private app: FirebaseApp | null = null;

  user = signal<User | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  private ensureApp(): FirebaseApp {
    if (!this.app) {
      const app = getApps().length ? getApp() : initializeApp(environment.firebase);
      this.app = app;
      const auth = getAuth(app);
      setPersistence(auth, browserLocalPersistence);
      onAuthStateChanged(auth, u => this.user.set(u));
    }
    return this.app!;
  }

  firestore(): Firestore { return getFirestore(this.ensureApp()); }

async signUp(email: string, password: string, name?: string) {
  this.loading.set(true); this.error.set(null);
  try {
    const auth = getAuth(this.ensureApp());
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);

    if (name) { await updateProfile(cred.user, { displayName: name }); } // optional

    const db = this.firestore();
    await setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid,
      email: cred.user.email ?? email.trim(),
      name: name ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  } finally {
    this.loading.set(false);
  }
}



  async signIn(email: string, password: string) {
    this.loading.set(true); this.error.set(null);
    try { await signInWithEmailAndPassword(getAuth(this.ensureApp()), email.trim(), password); }
    catch (e: any) { this.error.set(this.mapAuthError(e?.code)); throw e; }
    finally { this.loading.set(false); }
  }

  async signOut() { await fbSignOut(getAuth(this.ensureApp())); }

  async sendVerification() {
    const auth = getAuth(this.ensureApp());
    if (auth.currentUser) await sendEmailVerification(auth.currentUser);
    else this.error.set('You need to be signed in to verify email.');
  }

  async resetPassword(email: string) {
    this.loading.set(true); this.error.set(null);
    try { await sendPasswordResetEmail(getAuth(this.ensureApp()), email.trim()); }
    catch (e: any) { this.error.set(this.mapAuthError(e?.code)); throw e; }
    finally { this.loading.set(false); }
  }

  async signInWithGoogle(useRedirect = false) {
    this.loading.set(true); this.error.set(null);
    const auth = getAuth(this.ensureApp());
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
    // Popup by default; redirect fallback if requested
    const result = useRedirect
      ? (await signInWithRedirect(auth, provider) as never) // redirect flow returns after page load
      : await signInWithPopup(auth, provider);

    if (!useRedirect) {
      // Create/merge user profile doc
      const user = result.user;
      const isNew = !!getAdditionalUserInfo(result)?.isNewUser;
      const db = this.firestore();
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email ?? null,
        name: user.displayName ?? null,
        photoURL: user.photoURL ?? null,
        provider: 'google',
        lastLoginAt: serverTimestamp(),
        ...(isNew ? { createdAt: serverTimestamp() } : {})
      }, { merge: true });
    }
  } catch (e: any) {
    // Common Google auth errors → nicer messages
    switch (e?.code) {
      case 'auth/popup-closed-by-user':
        this.error.set('Sign-in canceled.');
        break;
      case 'auth/popup-blocked':
        this.error.set('Popup blocked. Try again or use redirect.');
        break;
      case 'auth/account-exists-with-different-credential': {
        const email = e?.customData?.email;
        if (email) {
          const methods = await fetchSignInMethodsForEmail(auth, email);
          this.error.set(`This email already exists. Sign in with: ${methods.join(', ')} and link Google from Account.`);
        } else {
          this.error.set('Account exists with different sign-in method.');
        }
        break;
      }
      default:
        this.error.set('Google sign-in failed. Please try again.');
    }
    throw e;
  } finally {
    this.loading.set(false);
  }
}

async linkGoogle() {
  this.loading.set(true); this.error.set(null);
  try {
    const auth = getAuth(this.ensureApp());
    if (!auth.currentUser) throw new Error('Sign in first.');
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const res = await linkWithPopup(auth.currentUser, provider);

    // reflect linkage in user doc
    const db = this.firestore();
    await setDoc(doc(db, 'users', res.user.uid), {
      provider: 'google',
      linkedGoogleAt: serverTimestamp(),
      name: res.user.displayName ?? null,
      photoURL: res.user.photoURL ?? null,
    }, { merge: true });

  } catch (e: any) {
    if (e?.code === 'auth/credential-already-in-use') {
      this.error.set('This Google account is already linked to another user.');
    } else {
      this.error.set('Could not link Google account.');
    }
    throw e;
  } finally {
    this.loading.set(false);
  }
}

  private mapAuthError(code?: string): string {
    switch (code) {
      case 'auth/invalid-email': return 'Please use a valid email.';
      case 'auth/user-not-found': return 'No account for this email.';
      case 'auth/wrong-password': return 'Incorrect password.';
      case 'auth/weak-password': return 'Password must be at least 6 characters.';
      case 'auth/email-already-in-use': return 'Email already in use.';
      default: return 'Authentication error. Please try again.';
    }
  }
}
