//NB: imports are case-sensitive so need to match it exactly
import {Component, inject} from '@angular/core';
import{CommonModule} from '@angular/common';
import {ReactiveFormsModule, FormBuilder, Validators} from '@angular/forms';
import {collection, getDocs, getFirestore, doc, getDoc, addDoc,serverTimestamp, query, where, orderBy
} from 'firebase/firestore';
import{getApp} from 'firebase/app';
import {AuthService} from '../../core/auth';
import {RouterModule}  from '@angular/router';
import{Router} from '@angular/router';
import{FormsModule} from '@angular/forms';
import {environment} from '../../../environments/environment';
import {HttpClient, HttpClientModule } from '@angular/common/http';
import {lastValueFrom } from 'rxjs';

type ServiceDoc={
  id:string;
  serviceName?:string;
  name?: string;
  type: string;
  price?: number;
  capacity?: number|null;
  description?:string;
  bookingNotes?: string;
  companyID?:string;
  status?: string;
  images?:string[];
  phonenumber?:string;
};

type ServiceWithCompany= ServiceDoc &{companyName?:string };

type OrderRow={
  id:string;
  vendorID:string;
  companyID: string;
  status: 'pending'|'accepted'|'declined'|'cancelled'| string;
  guestsNum:  number;
  startAt:Date;
  endAt: Date;
  serviceName?: string;
  price?: number|null;
  companyName?: string;
};

const API_BASE= `${environment.apiUrl}/vendors`;

type FirestoreOps={
  getApp: typeof getApp;
  getFirestore: typeof getFirestore;
  doc: typeof doc;
  getDoc: typeof getDoc;
  getDocs: typeof getDocs;
  addDoc: typeof addDoc;
  collection: typeof collection;
  query: typeof query;
  where: typeof where;
  orderBy: typeof orderBy;
  serverTimestamp: typeof serverTimestamp;
};

@Component({
  selector:'app-vendor-couples',
  standalone:true,
  imports:[CommonModule, ReactiveFormsModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl:'./vendor-couples.html',
  styleUrls:['./vendor-couples.css'],
})
export class VendorCouples {
  private fb= inject(FormBuilder);
  private auth= inject(AuthService);

  public fs: FirestoreOps={
    getApp,
    getFirestore,
    doc,
    getDoc,
    getDocs,
    addDoc,
    collection,
    query,
    where,
    orderBy,
    serverTimestamp,
  };

  constructor(private router: Router, private http: HttpClient) {
    this.serviceTypes.forEach(t => this.expanded[t]= true);
  }

  loading= false;
  loaded= false;
  errorMsg= '';
  totalCount= 0;

  serviceTypes: string[]= ['Venue','Catering', 'Photography', 'Decor', 'Music/DJ', 'Florist', 'Other'];
  groups:Record<string, ServiceWithCompany[]> = {};
  expanded: Record<string, boolean> = {};

  showOrders= false;
  loadingOrders= false;
  ordersError= '';
  orders: OrderRow[] =[];

  showOrder= false;
  ordering= false;
  orderError= '';
  orderSuccess= '';
  selectedService: ServiceWithCompany | null = null;

  myEventId: string|null = null;
  myEventTitle= 'Your Event';

  orderForm= this.fb.group({
    eventID: ['', Validators.required],
    date: ['', Validators.required],
    startTime: ['', Validators.required],
    endTime:['',  Validators.required],
    guestsNum: [null as number | null, [Validators.required, Validators.min(1)]],
    note: ['']
  });

  private  async waitForUser(): Promise<any>{
    const u= this.auth.user?.() ?? null;
    if  (u) return u;
    return new Promise(resolve  =>{
      const iv= setInterval(() => {
        const user= this.auth.user?.() ?? null;
        if (user) {clearInterval(iv); resolve(user); }
      }, 50);
      setTimeout(()=> { clearInterval(iv); resolve(null); }, 5000);
    });
  }

  private normalizeType(raw?: string|null): string {
    const t= (raw || '').toLowerCase();
    if  (t.includes('venue')) return 'Venue';
    if(t.includes('cater') || t.includes('food')||t.includes('kitchen')) return 'Catering';
    if (t.includes('photo')) return 'Photography';
    if (t.includes('decor')||t.includes('deco')) return 'Decor';
    if (t.includes('dj')||t.includes('music') || t.includes('band'))  return 'Music/DJ';
    if (t.includes('flor')) return 'Florist';
    return 'Other';
  }

  private typeLabels: Record<string, string>= {
    Venue:'Venues',
    Catering:'Food & Catering',
    Photography:'Photography',
    Decor:'Decor',
    'Music/DJ':'Music & DJ',
    Florist:'Florists',
    Other: 'Other'
  };
  typeLabel(t: string){ return this.typeLabels[t]?? t; }
  trackById(_: number, item: { id:string }) {return item.id; }
  toggle(type: string){ this.expanded[type]= !this.expanded[type]; }

  priceRanges= [
    { label: 'Any', min: null, max: null },
    { label: 'Under R1,000', min: null, max: 1000 },
    { label: 'R1,000 - R5,000', min: 1000, max: 5000 },
    { label: 'R5,000 - R10,000', min: 5000, max: 10000 },
    { label: 'Over R10,000', min: 10000, max: null }
  ];

  capacityRanges= [
    { label: 'Any', min: null, max: null },
    { label: 'Under 50 guests', min: null, max: 50 },
    { label: '50 - 100 guests', min: 50, max: 100 },
    { label: '100 - 200 guests', min: 100, max: 200 },
    { label: '200+ guests', min: 200, max: null }
  ];

  selectedPriceRange= this.priceRanges[0];
  selectedCapacityRange= this.capacityRanges[0];

  clearFilters() {
    this.selectedPriceRange= { label: 'Any', min: null, max: null };
    this.selectedCapacityRange= { label: 'Any', min: null, max: null };
    this.loadAllVendors();
  }

  async loadAllVendors(){
    this.loading= true;
    this.loaded= false;
    this.errorMsg= '';
    this.groups= {};
    this.totalCount= 0;

    try{
      const apiVendors= await lastValueFrom(this.http.get<ServiceWithCompany[]>(API_BASE));

      const services: ServiceWithCompany[]= (apiVendors||[]).map(v => ({
        ...v,
        serviceName: v.serviceName ?? v.name ?? '',
        phonenumber: (v as any).phonenumber ?? ''
      }));



      const onlyActive= services.filter(s => (s.status||'').toLowerCase()==='active');

      const db= this.fs.getFirestore(this.fs.getApp());
      const ids= Array.from(new Set(onlyActive.map(s =>s.companyID).filter(Boolean) as string[]));
      const nameById= new Map<string, string>();
      await Promise.all(ids.map(async uid => {
        const cSnap= await this.fs.getDoc(this.fs.doc(db, 'Companies', uid));
        if (cSnap.exists()) nameById.set(uid, (cSnap.data() as any)?.companyName || 'Unknown company');
      }));

      const filtered= onlyActive.filter(s => {
        let ok= true;
        if (this.selectedPriceRange.min != null) ok=ok && (s.price ?? 0) >= this.selectedPriceRange.min;
        if (this.selectedPriceRange.max != null) ok= ok && (s.price ?? 0) <= this.selectedPriceRange.max;
        if (this.selectedCapacityRange.min != null) ok= ok && (s.capacity ?? 0) >= this.selectedCapacityRange.min;
        if (this.selectedCapacityRange.max != null) ok= ok && (s.capacity ?? 0) <= this.selectedCapacityRange.max;
        return ok;
      });

      const tmp: Record<string,  ServiceWithCompany[]>= {};
      for (const s of  filtered){
        const key= this.normalizeType(s.type);
        const withCompany= { ...s, companyName: s.companyID ? nameById.get(s.companyID):undefined };
        (tmp[key] ||= []).push(withCompany);
      }

      for(const k of Object.keys(tmp)) {
        tmp[k].sort((a, b) =>
          (a.serviceName||'').localeCompare(b.serviceName||'', undefined, { sensitivity: 'base'})
        );
      }

      const ordered:  Record<string, ServiceWithCompany[]>= {};
      this.serviceTypes.forEach(k =>{ if(tmp[k]?.length) ordered[k]= tmp[k]; });
      for (const k of Object.keys(tmp)) if (!ordered[k]) ordered[k]= tmp[k];

      this.groups= ordered;
      this.totalCount= filtered.length;
      this.loaded= true;
    } catch  (e: any) {
      this.errorMsg= e?.message ?? 'Failed to load vendors.';
    } finally {
      this.loading = false;
    }
  }

  async  toggleOrders() {
    this.showOrders= !this.showOrders;
    if (this.showOrders  &&!this.orders.length) {
      await this.loadMyOrders();
    }
  }

  private async loadMyOrders(){
    this.loadingOrders= true;
    this.ordersError= '';
    this.orders= [];
    try {
      const user= await this.waitForUser();
      if (!user) { this.ordersError=  'Please sign in to view your orders.'; return; }

      const db= this.fs.getFirestore(this.fs.getApp());
      const qy= this.fs.query(
        this.fs.collection(db,'Orders'),
        this.fs.where('customerID',  '==', user.uid),
        this.fs.orderBy('createdAt','desc')
      );
      const os= await this.fs.getDocs(qy);
      const rows: OrderRow[]= os.docs.map(d =>{
        const x= d.data() as any;
        const startAt = x.startAt?.toDate ? x.startAt.toDate() : new Date(x.startAt);
        const endAt= x.endAt?.toDate ?  x.endAt.toDate():new Date(x.endAt);
        return {
          id: d.id,
          vendorID:x.vendorID||x.vendorId || '',
          companyID: x.companyID||x.companyId || '',
          status: x.status||'pending',
          guestsNum:Number(x.guestsNum || 0),
          startAt,endAt,
          serviceName:undefined,
          price:undefined,
          companyName:undefined
        };
      });

      const vendorIds= Array.from(new Set(rows.map(r => r.vendorID).filter(Boolean)));
      const companyIds= Array.from(new Set(rows.map(r => r.companyID).filter(Boolean)));
      const vendorMap= new Map<string, any>();
      const companyMap= new Map<string, any>();

      await Promise.all([
        ...vendorIds.map(async  id => {
          const s= await this.fs.getDoc(this.fs.doc(this.fs.getFirestore(this.fs.getApp()), 'Vendors', id));
          if  (s.exists()) vendorMap.set(id, s.data());
        }),
        ...companyIds.map(async id =>{
          const c= await this.fs.getDoc(this.fs.doc(this.fs.getFirestore(this.fs.getApp()), 'Companies', id));
          if (c.exists()) companyMap.set(id, c.data());
        })
      ]);

      for (const r of rows) {
        const v= vendorMap.get(r.vendorID);
        if (v) {
          r.serviceName= v.serviceName||v.name||r.serviceName;
          r.price= (typeof v.price === 'number')?v.price:(r.price ?? null);
        }
        const c=companyMap.get(r.companyID);
        if (c) r.companyName= c.companyName||r.companyName;
      }

      this.orders= rows;
    } catch (e: any) {
      this.ordersError=e?.message ?? 'Failed to load your orders.';
    } finally {
      this.loadingOrders= false;
    }
  }

  async openOrder(s:ServiceWithCompany) {
    this.selectedService= s;
    this.orderError= '';
    this.orderSuccess= '';
    this.myEventId= null;this.myEventTitle= 'Your Event';
    this.orderForm.reset({ eventID:'', date: '', startTime: '', endTime: '', guestsNum: null, note: '' });
    this.showOrder= true;

    const user= await this.waitForUser();
    if (!user){this.orderError= 'Please sign in.'; return; }

    this.myEventId= user.uid;
    this.orderForm.patchValue({eventID: user.uid });

    try{
      const db= this.fs.getFirestore(this.fs.getApp());

      let evData:any= null;
      let evId: string|null = null;

      const direct= await this.fs.getDoc(this.fs.doc(db,'Events', user.uid));
      if (direct.exists()){
        evData= direct.data();
        evId= (direct as any).id ?? user.uid;
      } else{
        const qy= this.fs.query(this.fs.collection(db, 'Events'),this.fs.where('EventID', '==', user.uid));
        const evs= await this.fs.getDocs(qy);
        if (evs.docs.length) {
          evData= evs.docs[0].data();
          evId =evs.docs[0].id;
        }
      }

      if (evData){
        this.myEventId= evId;
        this.orderForm.patchValue({eventID: evId as string });

        this.myEventTitle= (evData?.Name1 && evData?.Name2)
          ? `${evData.Name1} & ${evData.Name2}`
          : (evData?.title||'Your Event');

        const rawDT= evData?.Date_Time ??evData?.dateTime?? evData?.DateTime ?? null;
        const dt= rawDT?.toDate ? rawDT.toDate():(rawDT?new Date(rawDT) : null);
        if (dt && !isNaN(dt.getTime())) {
          const yyyy = String(dt.getFullYear());
          const mm= String(dt.getMonth() + 1).padStart(2, '0');
          const dd= String(dt.getDate()).padStart(2, '0');
          const HH= String(dt.getHours()).padStart(2, '0');
          const MM= String(dt.getMinutes()).padStart(2, '0');
          this.orderForm.patchValue({
            date: `${yyyy}-${mm}-${dd}`,
            startTime: `${HH}:${MM}`
          });
        }

      }
    } catch {}

  }

  closeOrder() {
    this.showOrder= false;
    this.selectedService= null;
    this.orderError= '';
    this.orderSuccess = '';
  }

  private combineToDate(date: string, time: string):Date{
    return new Date(`${date}T${time}:00`);
  }

  async submitOrder() {
    if(!this.selectedService) return;

    if (!this.myEventId){
      this.orderError= 'Could not link your event. Please sign in again.';
      return;
    }
    if (this.orderForm.invalid){
      this.orderError= 'Please complete all required fields.';
      return;
    }

    const {eventID, date, startTime, endTime, guestsNum, note } = this.orderForm.getRawValue();
    const startAt= this.combineToDate(String(date), String(startTime));
    const endAt= this.combineToDate(String(date), String(endTime));
    if (endAt <=startAt) {
      this.orderError= 'End time must be after start time.';
      return;
    }

    const user= await this.waitForUser();
    if (!user){ this.orderError = 'Please sign in.'; return; }

    this.ordering= true;
    this.orderError = '';
    this.orderSuccess= '';

    try{

      const db= this.fs.getFirestore(this.fs.getApp());

      await this.fs.addDoc(this.fs.collection(db, 'Orders'), {
        customerID:user.uid,
        eventID: String(eventID),
        companyID: this.selectedService.companyID ?? '',
        vendorID: this.selectedService.id,
        venueID: '',
        guestsNum: Number(guestsNum),
        startAt,
        endAt,
        note: note ?? '',
        status: 'pending',
        createdAt:this.fs.serverTimestamp(),
      });


      this.orderSuccess= 'Order sent! The vendor will review and respond.';
      setTimeout(()=> this.closeOrder(), 900);
    } catch (e: any){
      this.orderError= e?.message ?? 'Failed to create order.';
    } finally {
      this.ordering= false;
    }
  }

  backTohome(): void {
    this.router.navigate(['/homepage']);
  }
}
