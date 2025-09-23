import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { AuthService } from '../../core/auth';
import { formatDate } from '@angular/common';


type InviteTemplate = {
  id: string;
  name: string;
  thumb: string; // assets path for card preview
  bg: string;    // assets path for full background
};

@Component({
  selector: 'app-invitations',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './invitations.html',
  styleUrls: ['./invitations.css']
})
export class Invitations {
  // === keep the same inject pattern as Homepage ===
  router = inject(Router);
  auth   = inject(AuthService);
  private formBuild = inject(FormBuilder);

  // === UI state ===
  public hasInvite: boolean | null = null;
  public inviteData: any = null;
  public selected?: InviteTemplate;
  public photoUrl: string | null = null;

  // === three preset templates (point these to your assets) ===
  templates: InviteTemplate[] = [
    { id: 'classic', name: 'Classic', thumb: 'assets/invitation-classic.jpg', bg: 'assets/invitation-classic.jpg' },
    { id: 'floral',  name: 'Floral',  thumb: 'assets/invitation-floral.jpg',  bg: 'assets/invitation-floral.jpg'  },
    { id: 'modern',  name: 'Modern',  thumb: 'assets/invitation-modern.png',  bg: 'assets/invitation-modern.png'  },
  ];

  // === reactive form built with formBuilder.group (same style) ===
  form = this.formBuild.group({
    bride:   ['', [Validators.required]],
    groom:   ['', [Validators.required]],
    date:    ['', [Validators.required]],
    time:    ['', [Validators.required]],
    venue:   ['', [Validators.required]],
    message: ['You are warmly invited.']
  });

  private async getVenueName(db: ReturnType<typeof getFirestore>, VenueID: any): Promise<string> {
    if (!VenueID) return '';

    // If VenueID is a DocumentReference
    if (VenueID && typeof VenueID !== 'string' && 'path' in VenueID) {
      const snap = await getDoc(VenueID);
      return snap.exists() ? (snap.data() as any)?.venuename ?? '' : '';
    }

    // If VenueID is the string document ID
    const vRef = doc(db, 'Venues', String(VenueID));
    const vSnap = await getDoc(vRef);
    return vSnap.exists() ? (vSnap.data() as any)?.venuename ?? '' : '';
  }


  private async loadDefaultsFromEvent() {
    const user = await this.waitForUser();
    if (!user) return;

    const db = getFirestore(getApp());
    const ref = doc(db, 'Events', user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const data: any = snap.data();

    // Convert Firestore Timestamp -> JS Date
    const dt: Date | null =
      data?.Date_Time?.toDate ? data.Date_Time.toDate() :
      (data?.Date_Time instanceof Date ? data.Date_Time : null);

    // If your inputs are plain text boxes, keep readable. If they are <input type="date/time"> use the yyyy-MM-dd / HH:mm formats (shown below).
    // Text-friendly (readable):
    // const dateStr = dt ? formatDate(dt, 'd MMMM yyyy', 'en-ZA') : '';
    // const timeStr = dt ? formatDate(dt, 'HH:mm', 'en-ZA') : '';

    // Form-friendly for <input type="date"> and <input type="time">
    const dateStr = dt ? formatDate(dt, 'yyyy-MM-dd', 'en-ZA') : '';
    const timeStr = dt ? formatDate(dt, 'HH:mm', 'en-ZA') : '';

    let venueStr = '';
    try {
      venueStr = await this.getVenueName(db, data?.VenueID);
    } catch (e) {
      console.error('Failed to resolve venue name', e);
    }
    // Only patch if fields are empty (don’t overwrite user-edited values)
    const curr = this.form.getRawValue();
    this.form.patchValue({
      bride:   curr.bride   || data?.Name1 || '',
      groom:   curr.groom   || data?.Name2 || '',
      date:    curr.date    || dateStr,
      time:    curr.time    || timeStr,
      venue: curr.venue || venueStr
    });
}

  // Canvas target size (A5 portrait ~300DPI). Adjust if you like.
  private CANVAS_W = 1748;  // px
  private CANVAS_H = 2480;  // px

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      // blob: and assets/ are same-origin; crossorigin not needed. Add if you ever pull from a CDN:
      // img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  private drawRoundedImage(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    x: number, y: number, w: number, h: number, r: number
  ) {
    ctx.save();
    ctx.beginPath();
    const right = x + w, bottom = y + h;
    ctx.moveTo(x + r, y);
    ctx.arcTo(right, y, right, bottom, r);
    ctx.arcTo(right, bottom, x, bottom, r);
    ctx.arcTo(x, bottom, x, y, r);
    ctx.arcTo(x, y, right, y, r);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();
  }

  async downloadCanvasPNG() {
    if (!this.selected) return;

    // 1) Prepare canvas
    const canvas = document.createElement('canvas');
    canvas.width  = this.CANVAS_W;
    canvas.height = this.CANVAS_H;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';

    // 2) Draw background
    try {
      const bg = await this.loadImage(this.selected.bg);
      // cover-mode background
      const sRatio = bg.width / bg.height;
      const dRatio = this.CANVAS_W / this.CANVAS_H;
      let sx = 0, sy = 0, sw = bg.width, sh = bg.height;
      if (sRatio > dRatio) {
        // bg wider than canvas
        sh = bg.height;
        sw = sh * dRatio;
        sx = (bg.width - sw) / 2;
      } else {
        sw = bg.width;
        sh = sw / dRatio;
        sy = (bg.height - sh) / 2;
      }
      ctx.drawImage(bg, sx, sy, sw, sh, 0, 0, this.CANVAS_W, this.CANVAS_H);
    } catch {
      // fallback: plain background
      ctx.fillStyle = '#f7f5f3';
      ctx.fillRect(0, 0, this.CANVAS_W, this.CANVAS_H);
    }

    // 3) Draw photo (optional)
    if (this.photoUrl) {
      try {
        const p = await this.loadImage(this.photoUrl);
        const pw = Math.round(this.CANVAS_W * 0.40); // 40% width
        const ph = Math.round(this.CANVAS_H * 0.28); // 28% height
        const px = Math.round((this.CANVAS_W - pw) / 2);
        const py = Math.round(this.CANVAS_H * 0.5 - ph / 2);

        // soft shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.25)';
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 8;
        this.drawRoundedImage(ctx, p, px, py, pw, ph, 28);
        ctx.restore();
      } catch { /* ignore photo errors */ }
    }

    // 4) Text styles & helpers
    const center = (y: number, text: string, font: string, color = '#2a2a2a') => {
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, this.CANVAS_W / 2, y);
    };

    const v = this.form.getRawValue();
    const bride = (v.bride || '').toString();
    const groom = (v.groom || '').toString();
    const amp   = '&';
    const date  = (v.date  || '').toString();
    const time  = (v.time  || '').toString();
    const venue = (v.venue || '').toString();
    const msg   = (v.message || '').toString();

    // 5) Draw names at top
    center(Math.round(this.CANVAS_H * 0.17), bride, 'bold 88px "Times New Roman", serif');
    center(Math.round(this.CANVAS_H * 0.205), amp, '600 56px "Times New Roman", serif');
    center(Math.round(this.CANVAS_H * 0.24), groom, 'bold 88px "Times New Roman", serif');

    // 6) Date / venue / message near bottom
    const bottomBlockY = Math.round(this.CANVAS_H * 0.73);
    center(bottomBlockY,       date || '',  '500 50px "Times New Roman", serif');
    center(bottomBlockY + 70,  time || '',  '500 46px "Times New Roman", serif');
    center(bottomBlockY + 140, venue || '', '500 50px "Times New Roman", serif');

    // multiline message (wrap simple)
    const wrap = (text: string, maxWidth: number, lineHeight: number, startY: number) => {
      if (!text) return;
      ctx.font = '500 44px "Times New Roman", serif';
      ctx.fillStyle = '#2a2a2a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';

      const words = text.split(/\s+/);
      let line = '';
      let y = startY;
      for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        if (ctx.measureText(test).width > maxWidth) {
          ctx.fillText(line, this.CANVAS_W / 2, y);
          line = w;
          y += lineHeight;
        } else {
          line = test;
        }
      }
      if (line) ctx.fillText(line, this.CANVAS_W / 2, y);
    };

    wrap(msg, Math.round(this.CANVAS_W * 0.8), 58, Math.round(this.CANVAS_H * 0.90));

  // 7) URL at very bottom
  const urlText = 'RSVP on: https://mango-mushroom-00c4ce01e.2.azurestaticapps.net/';
  const urlFont = '500 40px Arial, sans-serif';
  const urlY = this.CANVAS_H - 40; // Move closer to the bottom edge
  center(urlY, urlText, urlFont, '#2a2a2a');

    // 8) Download
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invitation-${this.selected?.id || 'template'}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }


  // ---- helpers -------------------------------------------------
  private waitForUser(): Promise<any> {
    return new Promise((resolve) => {
      const user = this.auth.user();
      if (user) resolve(user);

      const check = setInterval(() => {
        const u = this.auth.user();
        if (u) {
          clearInterval(check);
          resolve(u);
        }
      }, 50);

      setTimeout(() => {
        clearInterval(check);
        resolve(null);
      }, 5000);
    });
  }

  choose(t: InviteTemplate) { this.selected = t; }

  onPhotoChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const f = input.files && input.files[0];
    if (!f) return;
    if (this.photoUrl) URL.revokeObjectURL(this.photoUrl);
    this.photoUrl = URL.createObjectURL(f);
  }

  // ---- lifecycle: load existing invitation for the user --------
  async ngOnInit() {
    try {
      const user = await this.waitForUser();
      if (!user) return;

      const db = getFirestore(getApp());
      const ref = doc(db, 'Invitations', user.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        this.hasInvite = true;
        this.inviteData = snap.data();

        // hydrate from existing invitation
        const t = this.templates.find(x => x.id === this.inviteData?.TemplateId);
        if (t) this.selected = t;

        this.form.patchValue({
          bride:   this.inviteData?.Bride ?? '',
          groom:   this.inviteData?.Groom ?? '',
          date:    this.inviteData?.Date ?? '',
          time:    this.inviteData?.Time ?? '',
          venue:   this.inviteData?.Venue ?? '',
          message: this.inviteData?.Message ?? ''
        });

        // If any of the key fields are empty, fill from Events
        const v = this.form.getRawValue();
        if (!v.bride || !v.groom || !v.date || !v.time) {
          await this.loadDefaultsFromEvent();
        }
      } else {
        this.hasInvite = false;
        this.inviteData = null;

        // No invitation yet — prefill entirely from Events
        await this.loadDefaultsFromEvent();
      }
    } catch (err) {
      console.error('Error fetching invitation:', err);
      this.hasInvite = false;
      this.inviteData = null;

      // Still try to prefill from Events so the user gets defaults
      await this.loadDefaultsFromEvent();
    }
  }


  // ---- create/update invitation document -----------------------
  async saveInvitation() {
    if (!this.selected || this.form.invalid) return;

    const user = await this.waitForUser();
    if (!user) return;

    const db = getFirestore(getApp());
    const ref = doc(db, 'Invitations', user.uid);

    const { bride, groom, date, time, venue, message } = this.form.getRawValue();

    try {
      await setDoc(ref, {
        UserID: user.uid,
        TemplateId: this.selected.id,
        Bride: bride,
        Groom: groom,
        Date: date,
        Time: time,
        Venue: venue,
        Message: message,
        // store a file URL/path if you later upload the photo to Storage
        PhotoUrl: null,
        UpdatedAt: serverTimestamp()
      }, { merge: true });

      this.hasInvite = true;
      const snap = await getDoc(ref);
      this.inviteData = snap.data();
      alert('Invitation saved!');
    } catch (err) {
      console.error('Error saving invitation:', err);
      alert('Failed to save invitation. Please try again.');
    }
  }

  backTohome(): void {
    this.router.navigate(['/homepage']);
  }
}
