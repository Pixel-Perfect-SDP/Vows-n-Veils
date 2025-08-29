import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot,
  query, serverTimestamp, setDoc, where
} from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { AuthService } from '../../core/auth';

interface CompanyDoc {
  userID: string;
  companyName: string;
  email: string;
  phoneNumber: string;
  type?: string; // 'vendor' | ...
}
type ServiceDoc = {
  id: string;
  serviceName: string;
  type: string;
  price?: number;
  capacity?: number | null;
  status?: string;
  description?: string;
  bookingNotes?: string;
  companyID?: string;   // canonical new field
  companyId?: string;   // legacy variants
  ownerId?: string;
  createdBy?: string;
};

@Component({
  selector: 'app-vendors-company',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './vendors-company.html',
  styleUrls: ['./vendors-company.css']
})
export class VendorsCompany implements OnDestroy {
  router = inject(Router);
  auth = inject(AuthService);
  private fb = inject(FormBuilder);

  // page state
  hasVendorCompany: boolean | null = null;   // null = loading
  companyVendorData: CompanyDoc | null = null;
  companyId: string | null = null;
  errorMsg = '';

  // create-company form
  form = this.fb.group({
    companyName: ['', [Validators.required]],
    companyEmail: ['', [Validators.required, Validators.email]],
    companyNumber: ['', [Validators.required, Validators.pattern('^[0-9+ ]+$')]],
  });

  // add-service state
  showServiceForm = false;
  busy = false;
  busyId: string | null = null;
  successMsg = '';
  serviceTypes = ['Photography', 'Catering', 'Decor', 'Music/DJ', 'Florist', 'Venue', 'Other'];
  defaultServiceValues = { serviceName: '', type: '', price: null as number | null, capacity: null as number | null, description: '', bookingNotes: '' };
  serviceForm = this.fb.group({
    serviceName: ['', Validators.required],
    type: ['', Validators.required],
    price: [null as number | null, [Validators.required, Validators.min(0)]],
    capacity: [null as number | null, [Validators.min(0)]],
    description: [''],
    bookingNotes: [''],
  });

  // services state
  services: ServiceDoc[] = [];
  loadingServices = false;

  // unsubs
  private liveUnsub: (() => void) | null = null;
  private authUnsub: (() => void) | null = null;

  // ---------- lifecycle ----------
  async ngOnInit() {
    const appAuth = getAuth();
    this.authUnsub = onAuthStateChanged(appAuth, async (user: User | null) => {
      // resolve spinner, either way
      if (!user) {
        this.companyId = null;
        this.companyVendorData = null;
        this.hasVendorCompany = false;
        this.detachLive();
        this.services = [];
        return;
      }

      this.companyId = user.uid;
      await this.loadCompany(user.uid);

      if (this.hasVendorCompany && this.companyId) {
        // one-time legacy load (companyID, companyId, ownerId, createdBy)
        await this.loadLegacyOnce(this.companyId);
        // live updates on canonical field
        this.attachLive(this.companyId);
      }
    });
  }

  ngOnDestroy() {
    this.detachLive();
    if (this.authUnsub) this.authUnsub();
  }

  private detachLive() {
    if (this.liveUnsub) { this.liveUnsub(); this.liveUnsub = null; }
  }

  // ---------- company ----------
  private async loadCompany(uid: string) {
    this.errorMsg = '';
    try {
      const db = getFirestore(getApp());
      const ref = doc(db, 'Companies', uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) { this.companyVendorData = null; this.hasVendorCompany = false; return; }
      const data = snap.data() as CompanyDoc;
      if (data?.type === 'vendor') { this.companyVendorData = data; this.hasVendorCompany = true; }
      else { this.companyVendorData = null; this.hasVendorCompany = false; }
    } catch (e: any) {
      console.error(e);
      this.errorMsg = e?.message ?? 'Failed to load company.';
      this.hasVendorCompany = false;
    }
  }

  // ---------- services: one-time legacy load ----------
  private async loadLegacyOnce(uid: string) {
    try {
      this.loadingServices = true;
      const db = getFirestore(getApp());
      const col = collection(db, 'Vendors'); // Capital V

      // legacy owner fields + the new canonical one (so you see *everything* instantly)
      const [s1, s2, s3, s4] = await Promise.all([
        getDocs(query(col, where('companyID', '==', uid))),
        getDocs(query(col, where('companyId', '==', uid))),
        getDocs(query(col, where('ownerId', '==', uid))),
        getDocs(query(col, where('createdBy', '==', uid))),
      ]);

      // merge & de-dupe by doc id
      const byId = new Map<string, ServiceDoc>();
      for (const snap of [s1, s2, s3, s4]) {
        snap.forEach(d => byId.set(d.id, { id: d.id, ...(d.data() as any) }));
      }

      // sort by serviceName
      this.services = Array.from(byId.values()).sort((a, b) => {
        const an = (a.serviceName || '').toLowerCase();
        const bn = (b.serviceName || '').toLowerCase();
        return an < bn ? -1 : an > bn ? 1 : 0;
      });
    } catch (e: any) {
      console.error(e);
      this.errorMsg = e?.message ?? 'Failed to load services.';
    } finally {
      this.loadingServices = false;
    }
  }

  // ---------- services: live listener (canonical field only) ----------
  private attachLive(uid: string) {
    const db = getFirestore(getApp());
    const qy = query(collection(db, 'Vendors'), where('companyID', '==', uid)); // no orderBy → client sorts
    this.detachLive();
    this.liveUnsub = onSnapshot(
      qy,
      snap => {
        // merge into current list (which already contains legacy results)
        const byId = new Map(this.services.map(s => [s.id, s]));
        snap.forEach(d => byId.set(d.id, { id: d.id, ...(d.data() as any) }));
        this.services = Array.from(byId.values()).sort((a, b) => {
          const an = (a.serviceName || '').toLowerCase();
          const bn = (b.serviceName || '').toLowerCase();
          return an < bn ? -1 : an > bn ? 1 : 0;
        });
      },
      err => {
        console.error(err);
        this.errorMsg = err?.message ?? 'Failed to stream services.';
      }
    );
  }

  // ---------- create vendor company ----------
  async createVendorCompany() {
    if (this.form.invalid) return;
    const uid = this.companyId;
    if (!uid) { this.errorMsg = 'Please sign in again.'; return; }

    const db = getFirestore(getApp());
    const ref = doc(db, 'Companies', uid);
    try {
      await setDoc(ref, {
        userID: uid,
        companyName: this.form.value.companyName,
        email: this.form.value.companyEmail,
        phoneNumber: this.form.value.companyNumber,
        type: 'vendor',
        createdAt: serverTimestamp(),
      });

      await this.loadCompany(uid);
      if (this.hasVendorCompany) {
        await this.loadLegacyOnce(uid);
        this.attachLive(uid);
      }
      alert('Vendor Company created successfully!');
    } catch (e: any) {
      console.error(e);
      this.errorMsg = e?.message ?? 'Error creating your Vendor Company.';
      alert('Error creating your Vendor Company.');
    }
  }

  // ---------- services: create ----------
  async addService() {
    this.errorMsg = '';
    this.successMsg = '';
    if (this.serviceForm.invalid || !this.companyId) return;

    const db = getFirestore(getApp());
    const v = this.serviceForm.getRawValue() as {
      serviceName: string;
      type: string;
      price: number | null;
      capacity: number | null;
      description?: string;
      bookingNotes?: string;
    };

    this.busy = true;
    try {
      await addDoc(collection(db, 'Vendors'), {
        serviceName: v.serviceName,
        type: v.type,
        price: v.price != null ? Number(v.price) : 0,
        capacity: v.capacity != null ? Number(v.capacity) : null,
        description: v.description ?? '',
        bookingNotes: v.bookingNotes ?? '',
        status: 'active',
        companyID: this.companyId,     // canonical going forward
        createdBy: this.companyId,     // helpful for auditing
        createdAt: serverTimestamp(),
      });

      this.successMsg = 'Service saved!';
      this.serviceForm.reset(this.defaultServiceValues);
      this.showServiceForm = false;
      // live listener will merge it in
    } catch (e: any) {
      console.error(e);
      this.errorMsg = e?.message ?? 'Failed to save service.';
    } finally {
      this.busy = false;
    }
  }

  // ---------- services: delete ----------
  async deleteService(s: ServiceDoc) {
    if (!s?.id) return;
    if (!confirm(`Delete service "${s.serviceName}"?`)) return;
    const db = getFirestore(getApp());
    this.busyId = s.id;
    try {
      await deleteDoc(doc(db, 'Vendors', s.id));
      // if a legacy-only doc lacked companyID, remove it locally too
      this.services = this.services.filter(x => x.id !== s.id);
    } catch (e: any) {
      console.error(e);
      this.errorMsg = e?.message ?? 'Failed to delete service.';
    } finally {
      this.busyId = null;
    }
  }

  // ---------- UI helpers ----------
  toggleServiceForm() {
    this.showServiceForm = !this.showServiceForm;
    if (this.showServiceForm) {
      this.errorMsg = '';
      this.successMsg = '';
      this.serviceForm.reset(this.defaultServiceValues);
    }
  }
  refreshServices() {
    if (!this.companyId) return;
    this.loadLegacyOnce(this.companyId); // re-pull legacy; live still attached
  }
  trackById(_: number, item: ServiceDoc) { return item.id; }
}
