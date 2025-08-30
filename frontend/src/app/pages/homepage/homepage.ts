import { Component, inject, OnInit, OnDestroy, PLATFORM_ID, NgZone, ChangeDetectorRef } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Firestore, collection, addDoc, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { AuthService } from '../../core/auth';
import { getFirestore } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { FormGroup, FormControl, FormsModule } from '@angular/forms';
import { DataService, Guest } from '../../core/data.service';
import { auth } from '../firebase/firebase-config';
import { signOut } from 'firebase/auth';

@Component({
  selector: 'app-homepage',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FormsModule],
  templateUrl: './homepage.html',
  styleUrls: ['./homepage.css']
})
export class Homepage {
  router = inject(Router);
  //db = inject(Firestore);
  auth = inject(AuthService);
  private formBuild = inject(FormBuilder);
  //New: Data service
  private dataService = inject(DataService);

  public hasEvent: boolean | null = null;
  public eventData: any = null;

  // NEW: UI state
  activeTab: 'overview' | 'guests' = 'overview';
  guests: Guest[] = [];
  guestsLoading = false;
  guestsError: string | null = null;
  
  form = this.formBuild.group({
    name1: ['', [Validators.required]],
    name2: ['', [Validators.required]],
    date: ['', [Validators.required]],
    time: ['', [Validators.required]],
  });

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
      }, 5000); // timeout after 5s
    });
  }

  //check if user has an existing event
  async ngOnInit() {
    try{
      const user = await this.waitForUser();

      if (!user) {
        return;
      }

      const db = getFirestore(getApp());

      const docRef = doc(db, 'Events', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        this.hasEvent = true;
        this.eventData = docSnap.data();

        //countdown
        this.updateCountdown();
        this.countDownInerval=setInterval(()=>this.updateCountdown(),60000)

      } else
      {
        this.hasEvent = false;
        this.eventData = null;
      }
    }
    catch(error){
      console.error("Error fetching event data: ", error);
      this.hasEvent = false;
      this.eventData = null;
    }
  }

  ngOnDestroy()
  {
    if (this.countDownInerval) clearInterval(this.countDownInerval);
  }


  /*------------------------------user HAS event--------------------------*/

  /*------------fetch guests-------------*/
  // --- NEW: filter state ---
  dietaryOptions: string[] = [];
  allergyOptions: string[] = [];
  selectedDietary: string | null = null;
  selectedAllergy: string | null = null;
  selectedRsvp: 'all' | 'true' | 'false' = 'all';

  // call this when tab switches to 'guests'
  private async loadGuestFilterOptions() {
    const user = await this.waitForUser();
    if (!user) return;
    const eventId = user.uid;

    this.dataService.getGuestFilterOptions(eventId).subscribe({
      next: (res) => {
        this.dietaryOptions = res?.dietary ?? [];
        this.allergyOptions = res?.allergies ?? [];
      },
      error: (err) => console.error('Failed to load filter options', err)
    });
  }

  // update: called when filters change
  async onFiltersChange() {
    await this.loadGuests();
  }

  // modify switchToGuests to also fetch options once
  private filtersLoaded = false;

  async switchToGuests(e: Event) {
    e.preventDefault();
    this.activeTab = 'guests';

    if (!this.filtersLoaded) {
      await this.loadGuestFilterOptions();
      this.filtersLoaded = true;
    }
    await this.loadGuests();
  }

  // modify loadGuests to pass filters
  private async loadGuests() {
    this.guestsLoading = true;
    this.guestsError = null;
    this.guests = [];

    try {
      const user = await this.waitForUser();
      if (!user) {
        this.guestsLoading = false;
        this.guestsError = 'No authenticated user.';
        return;
      }
      const eventId = user.uid;

      const opts: any = {};
      if (this.selectedDietary) opts.dietary = this.selectedDietary;
      if (this.selectedAllergy) opts.allergy = this.selectedAllergy;
      if (this.selectedRsvp !== 'all') opts.rsvp = this.selectedRsvp === 'true';

      this.dataService.getGuestsByEvent(eventId, opts).subscribe({
        next: (guests) => {
          this.guests = guests ?? [];
          this.guestsLoading = false;
        },
        error: (err) => {
          console.error(err);
          this.guestsError = 'Failed to load guests';
          this.guestsLoading = false;
        }
      });
    } catch (e: any) {
      console.error(e);
      this.guestsError = e?.message ?? 'Unexpected error loading guests';
      this.guestsLoading = false;
    }
  }

  /*------------ADD guests-------------*/
  // UI toggle
  showAddGuest = false;

  // form for new guest
  addGuestForm = this.formBuild.group({
    Name: ['', [Validators.required]],
    Email: ['', [Validators.required, Validators.email]],
    Dietary: ['None'],
    Allergies: ['None'],
    RSVPstatus: ['true'],            // default to attending (string here, convert later)
    Song: ['']
  });


  // open/close form
  toggleAddGuest() {
    this.showAddGuest = !this.showAddGuest;
    if (!this.showAddGuest) this.addGuestForm.reset({ RSVPstatus: 'true' });
  }

  async submitAddGuest() {
    if (this.addGuestForm.invalid) return;

    const user = await this.waitForUser();
    if (!user) return;


  // open/close form
  toggleAddGuest() {
    this.showAddGuest = !this.showAddGuest;
    if (!this.showAddGuest) this.addGuestForm.reset({ RSVPstatus: 'true' });
  }

  async submitAddGuest() {
    if (this.addGuestForm.invalid) return;

    const user = await this.waitForUser();
    if (!user) return;

    const eventId = user.uid;
    const raw = this.addGuestForm.getRawValue();

    const dto = {
      Name: raw.Name?.trim() ?? '',
      Email: raw.Email?.trim() ?? '',
      Dietary: raw.Dietary?.trim() ?? 'None',
      Allergies: raw.Allergies?.trim() ?? 'None',
      RSVPstatus: String(raw.RSVPstatus).toLowerCase() === 'true',
      Song: raw.Song?.trim() ?? ''
    };

    // optimistic UX: disable form with a quick flag
    this.guestsLoading = true;
    this.dataService.postGuest(eventId, dto).subscribe({
      next: async () => {
        // refresh table + dynamic filter options
        await this.loadGuests();
        await this.loadGuestFilterOptions();
        this.toggleAddGuest(); // close + reset
        this.guestsLoading = false;
      },
      error: (err) => {
        console.error('Failed to create guest', err);
        this.guestsLoading = false;
        this.guestsError = 'Failed to create guest';
      }
    });
  }



  /*------------------------------user has NO event--------------------------*/
  //allow user to create one
  async createEvent() {
    if (this.form.invalid) {
      return;
    }

    const user = await this.waitForUser();
    if (!user) {
      return;
    }

    const db = getFirestore(getApp());
    const { name1, name2, date, time } = this.form.getRawValue();
    const docRef = doc(db, 'Events', user.uid);
    const dateTime = new Date(`${date}T${time}`);

    try {
        await setDoc(docRef, {
        Name1: this.form.value.name1,
        Name2: this.form.value.name2,
        Date_Time: dateTime,
        EventID: user.uid,
        RSVPcode: null,
        VendorID: null,
        VenueID: null,
      });

      this.hasEvent = true;
      const snap = await getDoc(docRef);
      this.eventData = snap.data();

      alert('Event successfully created!');
    }
    catch (error) {
      console.error('Error creating event: ', error);
      alert('Failed to create event. Please try again.');
    }


  }//createEvent

  logout(): void {
    signOut(auth)
      .then(() => {
        console.log('User signed out successfully');
        // Clear any stored user info in your component if needed
        this.hasEvent = null;
        this.eventData = null;
        this.router.navigate(['/landing']);
      })
      .catch((error) => {
        console.error('Error signing out:', error);
      });
  }


  // doing the countdown

  months:number=0;
  days:number=0;
  hours:number=0;
  minutes:number=0;

  private countDownInerval: any;

  private updateCountdown()
  {
    if (!this.eventData?.Date_Time) return;

    const eventTime= this.eventData.Date_Time.toDate() ? this.eventData.Date_Time.toDate() : this.eventData.Date_Time;
    const now = new Date();

    if (eventTime <= now)
    {
      this.months= this.days=this.hours=this.minutes=0;
      return;
    }

    let yearDiff= eventTime.getFullYear()- now.getFullYear();
    let monthsDiff = eventTime.getMonth() - now.getMonth() + yearDiff*12;
    let daysDiff = eventTime.getDate()-now.getDate();
    let hoursDiff = eventTime.getHours() - now.getHours();
    let minDiff = eventTime.getMinutes() - now.getMinutes();

    // if the any values are negative

    if (minDiff <0)
    {
      minDiff+=60;
      hoursDiff-=1;
    }

    if (hoursDiff <0)
    {
      hoursDiff+=24;
      daysDiff-=1;
    }

    if(daysDiff <0)
    {
      const lastMonth = new Date(now.getFullYear(), now.getMonth()+1,0).getDate();
      daysDiff+=lastMonth;
      monthsDiff-=1;
    }

    this.months = monthsDiff;
    this.days = daysDiff;
    this.hours = hoursDiff;
    this.minutes = minDiff;

  }
 }
