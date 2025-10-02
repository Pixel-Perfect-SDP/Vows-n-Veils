import { Injectable } from '@angular/core';
import { getAuth, Auth, signOut as firebaseSignOut } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthFacade {
  private auth: Auth;

  constructor() {
    this.auth = getAuth();
  }

  getAuthInstance(): Auth {
    return this.auth;
  }

  get currentUser() {
    return this.auth.currentUser;
  }

  // Add this method to match the tests
  getUser() {
    return this.auth.currentUser;
  }

  async signOut(): Promise<void> {
    try {
      await firebaseSignOut(this.auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }
}
