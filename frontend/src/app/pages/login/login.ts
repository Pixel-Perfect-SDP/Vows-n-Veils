import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { AuthService } from '../../core/auth'; // FIXED: Removed .service

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html'
})

export class Login {
  auth = inject(AuthService);
  router = inject(Router);
  private fb = inject(FormBuilder);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    name: ['']
  });

  constructor() {}

async onSignUp() {
  const { email, password, name } = this.form.value;
  await this.auth.signUp(email ?? '', password ?? '', name ?? undefined);
  this.router.navigateByUrl('/landing');
}

  async onSignIn() {
    if (this.form.invalid) return;
    const { email, password } = this.form.value;
    await this.auth.signIn(email!, password!);
    this.router.navigateByUrl('/landing');
  }

  async onSignOut() {
    await this.auth.signOut();
    this.form.reset({ email: '', password: '', name: '' });
    this.router.navigateByUrl('/login');
  }

  async onVerifyEmail() {
    await this.auth.sendVerification();
    alert('Verification email sent (if signed in).');
  }

  async onResetPassword() {
    const email = this.form.value.email?.trim() ?? '';
    if (!email) { alert('Enter your email first'); return; }
    await this.auth.resetPassword(email);
    alert('Password reset email sent (if the account exists).');
  }

  async writeTestDoc() {
    if (!this.auth.user()) return;
    const db = this.auth.firestore();
    await addDoc(collection(db, 'test-users'), {
      uid: this.auth.user()!.uid,
      name: this.form.value.name ?? '',
      email: this.auth.user()!.email ?? '',
      createdAt: serverTimestamp()
    });
    alert('Write successful!');
  }

  async onGoogle() {
  try {
    await this.auth.signInWithGoogle();         // or this.auth.signInWithGoogle(true) for redirect
    this.router.navigateByUrl('/landing');
  } catch { /* error surfaced via auth.error() */ }
}

async onLinkGoogle() {
  try {
    await this.auth.linkGoogle();
    alert('Google linked to your account.');
  } catch { /* error surfaced via auth.error() */ }
}

}