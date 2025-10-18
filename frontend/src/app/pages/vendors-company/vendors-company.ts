import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { collection, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, where, getFirestore } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { AuthService } from '../../core/auth';
import { auth } from '../firebase/firebase-config';
import { signOut } from 'firebase/auth';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

type ServiceRow = {
  id: string;
  serviceName: string;
  type: string;
  price: number | null;
  capacity: number | null;
  description: string;
  bookingNotes: string;
  status: string;
  companyID: string;
  phonenumber: string;
};

interface Notification {
  id: string;
  from: string;
  to: string;
  message: string;
  timestamp: any;
  read: boolean;
}
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

type CompanyDoc = {
  userID: string;
  companyName: string;
  email: string;
  phoneNumber: string;
  type?: string;
};

const API_BASE = `${environment.apiUrl}/vendors`;

@Component({
  selector: 'app-vendors-company',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, HttpClientModule],
  templateUrl: './vendors-company.html',
  styleUrls: ['./vendors-company.css']
})
export class VendorsCompany implements OnDestroy {
  router = inject(Router);
  auth = inject(AuthService);
  private fb = inject(FormBuilder);

  constructor(private http: HttpClient) { }

  hasVendorCompany: boolean | null = null;
  companyVendorData: CompanyDoc | null = null;
  companyId: string | null = null;
  errorMsg = '';

  form = this.fb.group({
    companyName: ['', [Validators.required]],
    companyEmail: ['', [Validators.required, Validators.email]],
    companyNumber: ['', [Validators.required, Validators.pattern('^[0-9+ ()\\-]{7,20}$')]],
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
    bookingNotes: '',
    phonenumber: ''
  };

  serviceForm = this.fb.group({
    serviceName: ['', Validators.required],
    type: ['', Validators.required],
    price: [null as number | null, [Validators.required, Validators.min(0)]],
    capacity: [null as number | null, [Validators.min(0)]],
    description: [''],
    bookingNotes: [''],
    phonenumber: ['', [Validators.required, Validators.pattern('^[0-9+ ()\\-]{7,20}$')]],
  });

  services: ServiceRow[] = [];
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

  editPhoneId: string | null = null;
  phoneInput = '';
  phoneBusyId: string | null = null;
  phoneErrorId: string | null = null;
  phoneInlineError = '';

  editPriceId: string | null = null;
  priceInput: number | null = null;
  priceBusyId: string | null = null;
  priceErrorId: string | null = null;
  priceInlineError = '';

  editCapacityId: string | null = null;
  capacityInput: number | null = null;
  capacityBusyId: string | null = null;
  capacityErrorId: string | null = null;
  capacityInlineError = '';


  public notifications: Notification[] = [];
  public unreadCount: number = 0;
  
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
        await this.loadServicesFromApi(this.companyId);
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
      this.errorMsg = e?.message ?? 'Failed to load company.';
      this.hasVendorCompany = false;
    }
  }

  private async loadServicesFromApi(uid: string) {
    this.loadingServices = true;
    this.errorMsg = '';
    try {
      const data = await firstValueFrom(this.http.get<any[]>(`${API_BASE}/company/${uid}`));
      const mapped: ServiceRow[] = (data || []).map(v => ({
        id: v.id,
        serviceName: v.serviceName ?? v.name ?? '',
        type: v.type ?? '',
        price: typeof v.price === 'number' ? v.price : null,
        capacity: v.capacity ?? null,
        description: v.description ?? '',
        bookingNotes: v.bookingNotes ?? '',
        status: v.status ?? 'pending',
        companyID: v.companyID ?? uid,
        phonenumber: v.phonenumber ?? ''
      }));
      this.services = mapped.sort((a, b) => {
        const an = (a.serviceName || '').toLowerCase();
        const bn = (b.serviceName || '').toLowerCase();
        return an < bn ? -1 : an > bn ? 1 : 0;
      });
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'Failed to load services from API.';
      this.services = [];
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
        snap.forEach(d => {
          const raw = d.data() as any;
          byId.set(d.id, {
            id: d.id,
            serviceName: raw.serviceName ?? raw.name ?? '',
            type: raw.type ?? '',
            price: typeof raw.price === 'number' ? raw.price : null,
            capacity: raw.capacity ?? null,
            description: raw.description ?? '',
            bookingNotes: raw.bookingNotes ?? '',
            status: raw.status ?? 'pending',
            companyID: raw.companyID ?? uid,
            phonenumber: raw.phonenumber ?? ''
          });
        });
        this.services = Array.from(byId.values()).sort((a, b) => {
          const an = (a.serviceName || '').toLowerCase();
          const bn = (b.serviceName || '').toLowerCase();
          return an < bn ? -1 : an > bn ? 1 : 0;
        });
        this.rebuildServiceNameMap();
      },
      err => {
        this.errorMsg = err?.message ?? 'Failed to stream services.';
      }
    );
  }

  async addService() {
    this.errorMsg = '';
    this.successMsg = '';
    if (this.serviceForm.invalid || !this.companyId) return;

    const v = this.serviceForm.getRawValue() as {
      serviceName: string;
      type: string;
      price: number | null;
      capacity: number | null;
      description?: string;
      bookingNotes?: string;
      phonenumber: string;
    };

    const email = this.companyVendorData?.email ?? '';
    this.busy = true;
    try {
      const body = {
        name: v.serviceName,
        type: v.type,
        price: v.price != null ? Number(v.price) : 0,
        capacity: v.capacity != null ? Number(v.capacity) : null,
        description: v.description ?? '',
        bookingNotes: v.bookingNotes ?? '',
        status: 'pending',
        companyID: this.companyId,
        email,
        phonenumber: v.phonenumber?.trim() || ''
      };
      await firstValueFrom(this.http.post<{ id: string }>(`${API_BASE}`, body));
      this.successMsg = 'Service saved!';
      this.serviceForm.reset({
        serviceName: '',
        type: '',
        price: null,
        capacity: null,
        description: '',
        bookingNotes: '',
        phonenumber: ''
      });
      this.showServiceForm = false;
      await this.loadServicesFromApi(this.companyId);
      this.rebuildServiceNameMap();
    } catch (e: any) {
      this.errorMsg = e?.error?.error || e?.message || 'Failed to save service.';
    } finally {
      this.busy = false;
    }
  }

  beginEditPhone(s: ServiceRow) {
    this.editPhoneId = s.id;
    this.phoneInput = s.phonenumber || '';
    this.phoneErrorId = null;
    this.phoneInlineError = '';
  }
  cancelEditPhone() {
    this.editPhoneId = null;
    this.phoneInput = '';
    this.phoneErrorId = null;
    this.phoneInlineError = '';
  }
  private validPhone(p: string) { return /^[0-9+ ()\-]{7,20}$/.test((p || '').trim()); }
  async saveEditPhone(s: ServiceRow) {
    const phone = (this.phoneInput || '').trim();
    if (!this.validPhone(phone)) {
      this.phoneErrorId = s.id; this.phoneInlineError = 'Enter a valid phone number'; return;
    }
    this.phoneBusyId = s.id;
    try {
      await firstValueFrom(this.http.put(`${API_BASE}/${s.id}`, { phonenumber: phone }));
      const idx = this.services.findIndex(x => x.id === s.id);
      if (idx >= 0) this.services[idx] = { ...this.services[idx], phonenumber: phone };
      this.cancelEditPhone();
    } catch (e: any) {
      this.phoneErrorId = s.id; this.phoneInlineError = e?.error?.error || e?.message || 'Failed to update phone';
    } finally {
      this.phoneBusyId = null;
    }
  }

  beginEditPrice(s: ServiceRow) {
    this.editPriceId = s.id;
    this.priceInput = s.price ?? 0;
    this.priceErrorId = null;
    this.priceInlineError = '';
  }
  cancelEditPrice() {
    this.editPriceId = null;
    this.priceInput = null;
    this.priceErrorId = null;
    this.priceInlineError = '';
  }
  async saveEditPrice(s: ServiceRow) {
    const val = Number(this.priceInput);
    if (!(val >= 0)) { this.priceErrorId = s.id; this.priceInlineError = 'Enter a valid price'; return; }
    this.priceBusyId = s.id;
    try {
      await firstValueFrom(this.http.put(`${API_BASE}/${s.id}`, { price: val }));
      const idx = this.services.findIndex(x => x.id === s.id);
      if (idx >= 0) this.services[idx] = { ...this.services[idx], price: val };
      this.cancelEditPrice();
    } catch (e: any) {
      this.priceErrorId = s.id; this.priceInlineError = e?.error?.error || e?.message || 'Failed to update price';
    } finally {
      this.priceBusyId = null;
    }
  }

  beginEditCapacity(s: ServiceRow) {
    this.editCapacityId = s.id;
    this.capacityInput = s.capacity ?? 0;
    this.capacityErrorId = null;
    this.capacityInlineError = '';
  }
  cancelEditCapacity() {
    this.editCapacityId = null;
    this.capacityInput = null;
    this.capacityErrorId = null;
    this.capacityInlineError = '';
  }
  async saveEditCapacity(s: ServiceRow) {
    const val = Number(this.capacityInput);
    if (!(val >= 0)) { this.capacityErrorId = s.id; this.capacityInlineError = 'Enter a valid capacity'; return; }
    this.capacityBusyId = s.id;
    try {
      await firstValueFrom(this.http.put(`${API_BASE}/${s.id}`, { capacity: val }));
      const idx = this.services.findIndex(x => x.id === s.id);
      if (idx >= 0) this.services[idx] = { ...this.services[idx], capacity: val };
      this.cancelEditCapacity();
    } catch (e: any) {
      this.capacityErrorId = s.id; this.capacityInlineError = e?.error?.error || e?.message || 'Failed to update capacity';
    } finally {
      this.capacityBusyId = null;
    }
  }

  async deleteService(s: ServiceRow) {
    if (!s?.id) return;
    if (!confirm(`Delete service "${s.serviceName}"?`)) return;
    this.busyId = s.id;
    try {
      await firstValueFrom(this.http.delete(`${API_BASE}/${s.id}`));
      this.services = this.services.filter(x => x.id !== s.id);
      this.rebuildServiceNameMap();
    } catch (e: any) {
      this.errorMsg = e?.error?.error || e?.message || 'Failed to delete service.';
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
      this.serviceForm.reset({
        serviceName: '',
        type: '',
        price: null,
        capacity: null,
        description: '',
        bookingNotes: '',
        phonenumber: ''
      });
    }
  }

  refreshServices() {
    if (!this.companyId) return;
    this.loadServicesFromApi(this.companyId);
  }

  trackById(_: number, item: ServiceRow | OrderRow) { return item.id; }

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
        await this.loadServicesFromApi(uid);
        this.rebuildServiceNameMap();
        this.attachLive(uid);
        this.attachOrders(uid);
      }
      alert('Vendor Company created successfully!');
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'Error creating your Vendor Company.';
      alert('Error creating your Vendor Company.');
    }
  }

  logout(): void {
    signOut(auth)
      .then(() => { this.router.navigate(['/landing']); })
      .catch(() => { });
  }

  async fetchNotifications() {
    const user = this.auth.user();
    if (!user) return;

    try {
      const apiUrl = `https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues/notifications/${user.uid}`;
      const response: any = await this.http.get(apiUrl).toPromise();

      this.notifications = (response.notifications || []).map((n: any) => ({
        uid: n.id,
        from: n.from || '',
        to: n.to || '',
        message: n.message || '',
        date: n.date || null,
        read: n.read || false,
      }));

      this.unreadCount = this.notifications.filter(n => !n.read).length;

      this.notifications.sort((a, b) => Number(a.read) - Number(b.read));

    } catch (err) {
      console.error('Error fetching notifications from API:', err);
      this.notifications = [];
      this.unreadCount = 0;
    }
  }



  goToNotifications() {
    this.router.navigate(['/notifications'], { state: { from: this.router.url } });
  }

}
