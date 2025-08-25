import { Component, inject, OnInit, OnDestroy, PLATFORM_ID, NgZone, ChangeDetectorRef } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { AuthService } from '../../core/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login implements OnInit, OnDestroy {
  auth = inject(AuthService);
  router = inject(Router);
  private fb = inject(FormBuilder);
  private platformId = inject(PLATFORM_ID);

  // NEW: make timers robust for zoneless/SSR
  private zone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);

  poolA: string[] = [
    'assets/people1.jpg',
    'assets/people2.jpeg',
    'assets/people3.jpeg',
    'assets/people4.jpg'
  ];
  poolB: string[] = [
    'assets/venue1.jpeg',
    'assets/invitation1.jpeg',
    'assets/venue2.webp',
    'assets/invitation2.jpeg'
  ];
  poolC: string[] = [
    'assets/cake1.jpg',
    'assets/catering1.jpeg',
    'assets/cake2.jpg',
    'assets/catering2.jpg'
  ];

  idxA = 0; idxB = 0; idxC = 0;
  private timer?: any;
  private activePanel = 0;          // 0=A, 1=B, 2=C
  readonly STEP_MS = 5000;

  get currentA() { return this.poolA[this.idxA % this.poolA.length]; }
  get currentB() { return this.poolB[this.idxB % this.poolB.length]; }
  get currentC() { return this.poolC[this.idxC % this.poolC.length]; }

  form = this.fb.group({
    name: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    // (optional) preload
    const preload = (arr: string[]) => arr.forEach(src => { const i = new Image(); i.src = src; });
    preload(this.poolA); preload(this.poolB); preload(this.poolC);

    // IMPORTANT: run timer inside Angular zone and mark for check
    this.timer = setInterval(() => {
      this.zone.run(() => {
        switch (this.activePanel) {
          case 0: this.idxA = (this.idxA + 1) % this.poolA.length; break;
          case 1: this.idxB = (this.idxB + 1) % this.poolB.length; break;
          case 2: this.idxC = (this.idxC + 1) % this.poolC.length; break;
        }
        this.activePanel = (this.activePanel + 1) % 3;
        this.cdr.markForCheck(); // ensure UI updates even if zoneless
      });
    }, this.STEP_MS);
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  onImageError(panel: 'A' | 'B' | 'C') {
    if (panel === 'A') this.idxA = (this.idxA + 1) % this.poolA.length;
    if (panel === 'B') this.idxB = (this.idxB + 1) % this.poolB.length;
    if (panel === 'C') this.idxC = (this.idxC + 1) % this.poolC.length;
    this.cdr.markForCheck();
  }

  // --- auth actions unchanged ---
  async onSignUp() { const { email, password, name } = this.form.value; await this.auth.signUp(email ?? '', password ?? '', name ?? undefined); this.router.navigateByUrl('/homepage'); }
  async onSignIn() { if (this.form.invalid) return; const { email, password } = this.form.value; await this.auth.signIn(email!, password!); this.router.navigateByUrl('/homepage'); }
  async onSignOut() { await this.auth.signOut(); this.form.reset({ email: '', password: '', name: '' }); this.router.navigateByUrl('/login'); }
  async onVerifyEmail() { await this.auth.sendVerification(); alert('Verification email sent (if signed in).'); }
  async onResetPassword() { const email = this.form.value.email?.trim() ?? ''; if (!email) { alert('Enter your email first'); return; } await this.auth.resetPassword(email); alert('Password reset email sent (if the account exists).'); }
  async writeTestDoc() { if (!this.auth.user()) return; const db = this.auth.firestore(); await addDoc(collection(db, 'test-users'), { uid: this.auth.user()!.uid, name: this.form.value.name ?? '', email: this.auth.user()!.email ?? '', createdAt: serverTimestamp() }); alert('Write successful!'); }
 
  //navigate to homepage if google sign in is successful
  async onGoogle() { try { await this.auth.signInWithGoogle(); console.log('Google login successful'); this.router.navigateByUrl('/homepage'); } catch {} }

  async onLinkGoogle() { try { await this.auth.linkGoogle(); alert('Google linked to your account.'); } catch {} }
}
