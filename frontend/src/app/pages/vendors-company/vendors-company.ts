import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query,
  serverTimestamp, setDoc, where
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
  type?: string; 
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
  companyID?: string;  
  companyId?: string;  
  ownerId?: string;     
  createdBy?: string;  
};

type OrderStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

type OrderRow = {
  id: string;
  customerID: string;
  eventID: string;
  companyID: string;
  vendorID: string;
  guestsNum: number;
  startAt: any;
  endAt: any;
  note?: string;
  status: OrderStatus;
  createdAt?: any;

  createdAtDate: Date | null;
  startAtDate: Date | null;
  endAtDate: Date | null;
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

  
  hasVendorCompany: boolean | null = null; // null = loading
  companyVendorData: CompanyDoc | null = null;
  companyId: string | null = null;
  errorMsg = '';

  
  form = this.fb.group({
    companyName: ['', [Validators.required]],
    companyEmail: ['', [Validators.required, Validators.email]],
    companyNumber: ['', [Validators.required, Validators.pattern('^[0-9+ ]+$')]],
  });


  showServiceForm = false;
  busy = false;
  busyId: string | null = null;
  successMsg = '';
  serviceTypes = ['Photography', 'Catering', 'Decor', 'Music/DJ', 'Florist', 'Venue', 'Other'];

  defaultServiceValues = {
    serviceName: '',
    type: '',
    price: null as number | null,
    capacity: null as number | null,
    description: '',
    bookingNotes: ''
  };

  serviceForm = this.fb.group({
    serviceName: ['', Validators.required],
    type: ['', Validators.required],
    price: [null as number | null, [Validators.required, Validators.min(0)]],
    capacity: [null as number | null, [Validators.min(0)]],
    description: [''],
    bookingNotes: [''],
  });

  services: ServiceDoc[] = [];
  loadingServices = false;

  private serviceNameMap = new Map<string, string>();
  private rebuildServiceNameMap() {
    this.serviceNameMap.clear();
    this.services.forEach(s => { if (s.id) this.serviceNameMap.set(s.id, s.serviceName || ''); });
  }
  getServiceName(id: string) { return this.serviceNameMap.get(id) || '—'; }

  
  orders: OrderRow[] = [];
  loadingOrders = false;
  orderBusyId: string | null = null;
  orderBusyAction: 'accept' | 'decline' | null = null;

 
  private liveUnsub: (() => void) | null = null;
  private ordersUnsub: (() => void) | null = null;
  private authUnsub: (() => void) | null = null;

  
  async ngOnInit() {
    const appAuth = getAuth();
    this.authUnsub = onAuthStateChanged(appAuth, async (user: User | null) => {
      if (!user) {
        this.companyId = null;
        this.companyVendorData = null;
        this.hasVendorCompany = false;
        this.detachLive();
        this.detachOrders();
        this.services = [];
        this.orders = [];
        return;
      }

      this.companyId = user.uid;
      await this.loadCompany(user.uid);

      if (this.hasVendorCompany && this.companyId) {
        await this.loadLegacyOnce(this.companyId);
        this.rebuildServiceNameMap();
        this.attachLive(this.companyId);
        this.attachOrders(this.companyId);
      }
    });
  }

  ngOnDestroy() {
    this.detachLive();
    this.detachOrders();
    if (this.authUnsub) this.authUnsub();
  }

  private detachLive() { if (this.liveUnsub) { this.liveUnsub(); this.liveUnsub = null; } }
  private detachOrders() { if (this.ordersUnsub) { this.ordersUnsub(); this.ordersUnsub = null; } }

  private async loadCompany(uid: string) {
    this.errorMsg = '';
    try {
      const db = getFirestore(getApp());
      const ref = doc(db, 'Companies', uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        this.companyVendorData = null;
        this.hasVendorCompany = false;
        return;
      }
      const data = snap.data() as CompanyDoc;
      if (data?.type === 'vendor') {
        this.companyVendorData = data;
        this.hasVendorCompany = true;
      } else {
        this.companyVendorData = null;
        this.hasVendorCompany = false;
      }
    } catch (e: any) {
      console.error(e);
      this.errorMsg = e?.message ?? 'Failed to load company.';
      this.hasVendorCompany = false;
    }
  }

  private async loadLegacyOnce(uid: string) {
    try {
      this.loadingServices = true;
      const db = getFirestore(getApp());
      const col = collection(db, 'Vendors');

      const [s1, s2, s3, s4] = await Promise.all([
        getDocs(query(col, where('companyID', '==', uid))),
        getDocs(query(col, where('companyId', '==', uid))),
        getDocs(query(col, where('ownerId', '==', uid))),
        getDocs(query(col, where('createdBy', '==', uid))),
      ]);

      const byId = new Map<string, ServiceDoc>();
      for (const snap of [s1, s2, s3, s4]) {
        snap.forEach(d => byId.set(d.id, { id: d.id, ...(d.data() as any) }));
      }

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

  private attachLive(uid: string) {
    const db = getFirestore(getApp());
    const qy = query(collection(db, 'Vendors'), where('companyID', '==', uid));
    this.detachLive();
    this.liveUnsub = onSnapshot(
      qy,
      snap => {
        const byId = new Map(this.services.map(s => [s.id, s]));
        snap.forEach(d => byId.set(d.id, { id: d.id, ...(d.data() as any) }));
        this.services = Array.from(byId.values()).sort((a, b) => {
          const an = (a.serviceName || '').toLowerCase();
          const bn = (b.serviceName || '').toLowerCase();
          return an < bn ? -1 : an > bn ? 1 : 0;
        });
        this.rebuildServiceNameMap();
      },
      err => {
        console.error(err);
        this.errorMsg = err?.message ?? 'Failed to stream services.';
      }
    );
  }

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
        companyID: this.companyId,
        createdBy: this.companyId,
        createdAt: serverTimestamp(),
      });
      this.successMsg = 'Service saved!';
      this.serviceForm.reset(this.defaultServiceValues);
      this.showServiceForm = false;
    } catch (e: any) {
      console.error(e);
      this.errorMsg = e?.message ?? 'Failed to save service.';
    } finally {
      this.busy = false;
    }
  }

  async deleteService(s: ServiceDoc) {
    if (!s?.id) return;
    if (!confirm(`Delete service "${s.serviceName}"?`)) return;

    const db = getFirestore(getApp());
    this.busyId = s.id;
    try {
      await deleteDoc(doc(db, 'Vendors', s.id));
      this.services = this.services.filter(x => x.id !== s.id);
      this.rebuildServiceNameMap();
    } catch (e: any) {
      console.error(e);
      this.errorMsg = e?.message ?? 'Failed to delete service.';
    } finally {
      this.busyId = null;
    }
  }


  private attachOrders(uid: string) {
    const db = getFirestore(getApp());
    const qy = query(collection(db, 'Orders'), where('companyID', '==', uid));
    this.detachOrders();
    this.loadingOrders = true;

    this.ordersUnsub = onSnapshot(
      qy,
      snap => {
        const rows: OrderRow[] = [];
        const toDate = (x: any) => (x?.toDate ? x.toDate() : (x ? new Date(x) : null));
        snap.forEach(d => {
          const data = d.data() as any;
          rows.push({
            id: d.id,
            customerID: data.customerID,
            eventID: data.eventID,
            companyID: data.companyID,
            vendorID: data.vendorID,
            guestsNum: data.guestsNum,
            startAt: data.startAt,
            endAt: data.endAt,
            note: data.note ?? '',
            status: data.status ?? 'pending',
            createdAt: data.createdAt ?? null,
            createdAtDate: toDate(data.createdAt),
            startAtDate: toDate(data.startAt),
            endAtDate: toDate(data.endAt),
          });
        });

        rows.sort((a, b) => {
          const aTs = (a.createdAtDate?.getTime?.() ?? a.startAtDate?.getTime?.() ?? 0);
          const bTs = (b.createdAtDate?.getTime?.() ?? b.startAtDate?.getTime?.() ?? 0);
          return bTs - aTs;
        });

        this.orders = rows;
        this.loadingOrders = false;
      },
      err => {
        console.error(err);
        this.loadingOrders = false;
        this.errorMsg = err?.message ?? 'Failed to stream orders.';
      }
    );
  }

  canAct(o: OrderRow) { return o.status === 'pending'; }

  async acceptOrder(o: OrderRow) { await this.updateOrderStatus(o, 'accepted'); }
  async declineOrder(o: OrderRow) { await this.updateOrderStatus(o, 'declined'); }

  private async updateOrderStatus(o: OrderRow, newStatus: 'accepted' | 'declined') {
    if (!o?.id) return;
    this.orderBusyId = o.id;
    this.orderBusyAction = newStatus === 'accepted' ? 'accept' : 'decline';
    try {
      const db = getFirestore(getApp());
      const ref = doc(db, 'Orders', o.id);
      const snap = await getDoc(ref);
      if (!snap.exists()) throw new Error('Order not found.');
      const data = snap.data() as any;

     
      const payload = {
        customerID: data.customerID,
        eventID: data.eventID,
        companyID: data.companyID,
        vendorID: data.vendorID,
        guestsNum: data.guestsNum,
        startAt: data.startAt,
        endAt: data.endAt,
        note: data.note ?? '',
        status: newStatus,
        createdAt: data.createdAt ?? null,
      };
      await setDoc(ref, payload, { merge: false });
    } catch (e: any) {
      console.error(e);
      this.errorMsg = e?.message ?? 'Failed to update order.';
    } finally {
      this.orderBusyId = null;
      this.orderBusyAction = null;
    }
  }

  
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
    this.loadLegacyOnce(this.companyId);
  }

  trackById(_: number, item: ServiceDoc | OrderRow) { return item.id; }


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
        this.rebuildServiceNameMap();
        this.attachLive(uid);
        this.attachOrders(uid);
      }
      alert('Vendor Company created successfully!');
    } catch (e: any) {
      console.error(e);
      this.errorMsg = e?.message ?? 'Error creating your Vendor Company.';
      alert('Error creating your Vendor Company.');
    }
  }
}
