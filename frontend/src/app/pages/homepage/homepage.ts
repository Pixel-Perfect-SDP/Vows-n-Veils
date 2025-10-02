import { Component, inject, OnInit, OnDestroy, PLATFORM_ID, NgZone, ChangeDetectorRef } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Firestore, collection, addDoc, doc, getDoc, setDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
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
export class Homepage
{
  router = inject(Router);
  auth = inject(AuthService);
  private formBuild = inject(FormBuilder);
  private dataService = inject(DataService);

  public hasEvent: boolean | null = null;
  public eventData: any = null;

  // Event Display Data
  public eventDisplayInfo: {
    weddingTitle: string | null;
    venueName: string | null;
    weddingTime: string | null;
    budget: number | null;
    totalGuests: number | null;
    confirmedRSVPs: number | null;
    selectedVendors: Array<{companyID: string, serviceName: string, orderDate?: any, status?: string}> | null;
    rsvpCode:string|null;
  } = {
    weddingTitle: null,
    venueName: null,
    weddingTime: null,
    budget: null,
    totalGuests: null,
    confirmedRSVPs: null,
    selectedVendors: null,
    rsvpCode:null
  };

  public eventInfoLoading: boolean = false;
  public eventInfoError: string | null = null;

  // Weather data
  public weather: any = null;
  public weatherLoading: boolean = false;
  public weatherError: string | null = null;

  activeTab: 'overview' | 'guests' = 'overview';
  guests: Guest[] = [];
  guestsLoading = false;
  guestsError: string | null = null;

  form = this.formBuild.group({
    name1: ['', [Validators.required]],
    name2: ['', [Validators.required]],
    date: ['', [Validators.required]],
    time: ['', [Validators.required]],
    budget: ['', [Validators.required, Validators.min(0)]]
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

  /*------------------------------Event Data API--------------------------*/

  /**
   * Comprehensive Event Data API that retrieves all event information for display
   * Fetches: Wedding title, venue, time, budget, total guests, and confirmed RSVPs
   */
  async getEventDataForDisplay(): Promise<void> {
    this.eventInfoLoading = true;
    this.eventInfoError = null;

    try {
      const user = await this.waitForUser();
      if (!user) {
        this.eventInfoError = 'No authenticated user found';
        this.eventInfoLoading = false;
        return;
      }

      const db = getFirestore(getApp());
      const eventId = user.uid;

      // Get Event Data
      const eventDocRef = doc(db, 'Events', eventId);
      const eventDocSnap = await getDoc(eventDocRef);

      if (!eventDocSnap.exists()) {
        this.hasEvent = false;
        this.eventInfoLoading = false;
        return;
      }

      const eventData = eventDocSnap.data();
      this.eventData = eventData; // Keep existing eventData for other parts of the app
      this.hasEvent = true;

      // Debug: Log the event data to see what we're working with
      console.log('Event Data:', eventData);

      // 1. Create Wedding Title: "The wedding of Name_1 and Name_2"
      if (eventData?.['Name1'] && eventData?.['Name2']) {
        this.eventDisplayInfo.weddingTitle = `The wedding of ${eventData['Name1']} and ${eventData['Name2']}`;
      }

      // 2. Get Venue Name
      if (eventData?.['VenueID']) {
        console.log('VenueID found:', eventData['VenueID']);
        try {
          const venueDocRef = doc(db, 'Venues', eventData['VenueID']);
          const venueDocSnap = await getDoc(venueDocRef);
          if (venueDocSnap.exists()) {
            const venueData = venueDocSnap.data();
            console.log('Venue Data:', venueData);
            this.eventDisplayInfo.venueName = venueData?.['name'] || venueData?.['venuename'] || 'Venue name not available';
          } else {
            console.log('Venue document not found for ID:', eventData['VenueID']);
            this.eventDisplayInfo.venueName = 'Venue not found';
          }
        } catch (venueError) {
          console.error('Error fetching venue:', venueError);
          this.eventDisplayInfo.venueName = 'Unable to load venue';
        }
      } else {
        console.log('No VenueID found in event data');
      }

      // 3. Format Wedding Time
      if (eventData?.['Date_Time']) {
        const eventDateTime = eventData['Date_Time'].toDate ? eventData['Date_Time'].toDate() : new Date(eventData['Date_Time']);
        this.eventDisplayInfo.weddingTime = eventDateTime.toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }

      // 4. Get Budget
      if (eventData?.['budget']) {
        console.log('Budget found:', eventData['budget']);
        this.eventDisplayInfo.budget = Number(eventData['budget']);
      } else {
        console.log('No Budget found in event data, Budget field value:', eventData?.['budget']);
      }

      //getting wedding code
      try
      {
        const codeDoc=await getDoc(doc(db,'Events',eventId));

        if (codeDoc.exists())
        {
          this.eventDisplayInfo.rsvpCode = codeDoc.data()?.['RSVPcode']||null;
          console.log("RSVP Code found:", this.eventDisplayInfo.rsvpCode);
        }
        else{
          console.log("No RSVP Code found for EventID:", eventId);
        }
      }
      catch(error)
      {
        console.error("Error fetching RSVP Code:", error);
      }



      // 5. Get Guest Statistics
      try {
        console.log('Looking for guests with EventID:', eventId);
        const guestsQuery = query(collection(db, 'Guests'), where('EventID', '==', eventId));
        const guestsSnapshot = await getDocs(guestsQuery);

        console.log('Guests query result - number of docs:', guestsSnapshot.size);

        let totalGuests = 0;
        let confirmedRSVPs = 0;

        guestsSnapshot.forEach((doc) => {
          totalGuests++;
          const guestData = doc.data();
          console.log('Guest data:', guestData);
          if (guestData?.['RSVPstatus'] === true) {
            confirmedRSVPs++;
          }
        });

        console.log('Final counts - Total:', totalGuests, 'Confirmed:', confirmedRSVPs);
        this.eventDisplayInfo.totalGuests = totalGuests;
        this.eventDisplayInfo.confirmedRSVPs = confirmedRSVPs;

      } catch (guestsError) {
        console.error('Error fetching guests data:', guestsError);
        this.eventDisplayInfo.totalGuests = 0;
        this.eventDisplayInfo.confirmedRSVPs = 0;
      }

      // 6. Get Selected Vendors from Orders and Companies
      try {
        console.log('Looking for orders with eventID:', eventId);

        // Check if user has permission to access orders collection
        const ordersQuery = query(collection(db, 'Orders'), where('eventID', '==', eventId));
        const ordersSnapshot = await getDocs(ordersQuery);

        console.log('Orders query result - number of docs:', ordersSnapshot.size);

        const selectedVendors: Array<{companyID: string, serviceName: string, orderDate?: any, status?: string}> = [];

        // Get all company IDs from orders, excluding declined orders
        const companyIds: Set<string> = new Set();
        const orderDetails: {[key: string]: any} = {};

        ordersSnapshot.forEach((doc) => {
          const orderData = doc.data();
          console.log('Order data:', orderData);

          const companyID = orderData?.['companyID'];
          const status = orderData?.['status'];

          // Skip declined orders completely
          if (status === 'declined') {
            console.log(`Skipping declined order for company: ${companyID}`);
            return;
          }

          if (companyID) {
            companyIds.add(companyID);
            orderDetails[companyID] = {
              orderDate: orderData?.['orderDate'] || orderData?.['date'] || null,
              orderId: doc.id,
              status: status || 'unknown'
            };
          }
        });

        console.log('Found company IDs:', Array.from(companyIds));

        // Fetch service names for each company ID from vendors collection
        for (const companyID of companyIds) {
          try {
            // Query vendors collection by companyID field, not document ID
            const vendorsQuery = query(collection(db, 'Vendors'), where('companyID', '==', companyID));
            const vendorsSnapshot = await getDocs(vendorsQuery);

            if (!vendorsSnapshot.empty) {
              // Get the first matching vendor document
              const vendorDoc = vendorsSnapshot.docs[0];
              const vendorData = vendorDoc.data();
              console.log(`Vendor data for companyID ${companyID}:`, vendorData);

              let serviceName = vendorData?.['serviceName'] ||
                               vendorData?.['service_name'] ||
                               vendorData?.['name'] ||
                               `Service ${companyID}`;

              const orderStatus = orderDetails[companyID]?.status;

              // Format service name based on status
              if (orderStatus === 'pending') {
                serviceName = `${serviceName} (pending)`;
              }
              // If status is 'accepted' or other, show without brackets

              selectedVendors.push({
                companyID: companyID,
                serviceName: serviceName,
                orderDate: orderDetails[companyID]?.orderDate,
                status: orderStatus
              });
            } else {
              console.log(`No vendor found with companyID: ${companyID}`);
              const orderStatus = orderDetails[companyID]?.status;

              let serviceName = `Unknown Service (${companyID})`;
              if (orderStatus === 'pending') {
                serviceName = `Unknown Service (${companyID}) (pending)`;
              }

              selectedVendors.push({
                companyID: companyID,
                serviceName: serviceName,
                orderDate: orderDetails[companyID]?.orderDate,
                status: orderStatus
              });
            }
          } catch (vendorError) {
            console.error(`Error fetching vendor with companyID ${companyID}:`, vendorError);
            const orderStatus = orderDetails[companyID]?.status;

            let serviceName = `Error loading service (${companyID})`;
            if (orderStatus === 'pending') {
              serviceName = `Error loading service (${companyID}) (pending)`;
            }

            selectedVendors.push({
              companyID: companyID,
              serviceName: serviceName,
              orderDate: orderDetails[companyID]?.orderDate,
              status: orderStatus
            });
          }
        }

        console.log('Final selected vendors:', selectedVendors);
        this.eventDisplayInfo.selectedVendors = selectedVendors.length > 0 ? selectedVendors : null;

      } catch (vendorsError: any) {
        // Handle Firebase permission errors gracefully
        if (vendorsError?.code === 'permission-denied') {
          console.warn('Permission denied accessing orders collection. User may not have proper Firebase rules configured.');
          this.eventDisplayInfo.selectedVendors = null;
        } else {
          console.error('Error fetching vendors data:', vendorsError);
          this.eventDisplayInfo.selectedVendors = null;
        }
      }

      this.eventInfoLoading = false;

      // Continue with existing functionality (countdown, weather)
      this.updateCountdown();
      this.countDownInerval = setInterval(() => this.updateCountdown(), 60000);

      if (eventData?.['VenueID']) {
        this.fetchVenueAndWeather(eventData['VenueID'], eventData['Date_Time']);
      }

    } catch (error) {
      console.error('Error in getEventDataForDisplay:', error);
      this.eventInfoError = 'Failed to load event information';
      this.eventInfoLoading = false;
    }
  }

  /*------------------------------End Event Data API--------------------------*/

  //copy RSVP code to clipboard
  copyToClipboard(code: string): void
  {
    navigator.clipboard.writeText(code).then(() =>
    {
      console.log('RSVP Code copied:', code);
      // optional: show a toast or alert to user
    }).catch(err =>
      {
      console.error('Failed to copy RSVP Code:', err);
    });
  }

  //check if user has an existing event
  async ngOnInit() {
    try {
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

        // Get comprehensive event display data
        await this.getEventDataForDisplay();

        //countdown
        this.updateCountdown();
        this.countDownInerval = setInterval(() => this.updateCountdown(), 60000);

        // Fetch venue address
        if (this.eventData?.VenueID) {
          // Get venue details from backend
          this.fetchVenueAndWeather(this.eventData.VenueID, this.eventData.Date_Time);
        }
      } else {
        this.hasEvent = false;
        this.eventData = null;
      }
    } catch (error) {
      console.error("Error fetching event data: ", error);
      this.hasEvent = false;
      this.eventData = null;
    }
  }

  /*----------fetch weather helpers-------- */
  private fetchVenueAndWeather(venueId: string, eventDate: any) {
    this.weatherLoading = true;
    this.weatherError = null;
    // Fetch venue details
    this.dataService.getVenueById(venueId).subscribe({
      next: (venue: any) => {
        // Get address and format date
        const address = venue?.address || '';
        let dateStr = '';
        if (eventDate) {
          if (eventDate.toDate) {
            dateStr = this.formatDate(eventDate.toDate());
          } else {
            dateStr = this.formatDate(new Date(eventDate));
          }
        }
        // Fetch weather
        this.dataService.getWeatherCrossing(address, dateStr).subscribe({
          next: (weather: any) => {
            this.weather = weather;
            this.weatherLoading = false;
          },
          error: (err) => {
            this.weatherError = 'Failed to fetch weather';
            this.weatherLoading = false;
          }
        });
      },
      error: (err) => {
        this.weatherError = 'Failed to fetch venue';
        this.weatherLoading = false;
      }
    });
  }

  private formatDate(date: Date): string {
    // Format as YYYY-MM-DD
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  /** Safely return precip probability (0–100) or null if missing */
  getPrecipPercent(day: any): number | null {
    // API may give precipprob as %, while precip can be amount (mm/in) — we only use precipprob.
    const p = day?.precipprob;
    if (p === undefined || p === null) return null;
    const n = Number(p);
    return Number.isFinite(n) ? Math.round(n) : null;
  }

  /** Human-friendly fallback label if description is empty */
  getConditionLabel(day: any): string {
    const cond = (day?.conditions || '').trim();
    if (!cond) return '—';
    return cond;
  }

  /** Decide which icon class to use based on conditions + rain probability */
  getWeatherIconClass(day: any): 'icon-rain' | 'icon-snow' | 'icon-overcast' | 'icon-clear' {
    const cond = (day?.conditions || '').toLowerCase();
    const precipProb = Number(day?.precipprob ?? 0);

    if (Number.isFinite(precipProb) && precipProb > 50) return 'icon-rain';
    if (cond.includes('snow')) return 'icon-snow';
    if (cond.includes('overcast') || cond.includes('cloud')) return 'icon-overcast';
    if (cond.includes('clear')) return 'icon-clear';
    // default: if we can’t tell, prefer clear (fits the romantic theme)
    return 'icon-clear';
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
    Email:['', [Validators.pattern(/^$|.+@.+\..+/)]],
    Dietary: ['None'],
    Allergies: ['None'],
    RSVPstatus: ['false'],            // default to attending (string here, convert later)
    Song: ['']
  });


  // open/close form
  toggleAddGuest() {
    this.showAddGuest = !this.showAddGuest;
    if (!this.showAddGuest) this.addGuestForm.reset({ Name: '' }); //was RSVPstatus,'true'
  }

  async submitAddGuest()
  {
    if (this.addGuestForm.invalid) return;

    const user = await this.waitForUser();
    if (!user) return;

    const eventId = user.uid;
    const raw = this.addGuestForm.getRawValue();

    const dto :any= {
      Name: raw.Name?.trim() ?? '',
      Email: raw.Email?.trim() ? raw.Email?.trim() : '',
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

  /*---------Delete guest----------*/
  async onDeleteGuest(g: Guest) {
    if (!g?.id) {
      alert('Missing guest id.');
      return;
    }

    const sure = window.confirm(`Are you sure you want to delete "${g.Name}"?`);
    if (!sure) return;

    try {
      this.guestsLoading = true;

      const user = await this.waitForUser();
      if (!user) {
        this.guestsLoading = false;
        this.guestsError = 'No authenticated user.';
        return;
      }

      const eventId = user.uid;
      this.dataService.deleteGuest(eventId, g.id).subscribe({
        next: async () => {
          // refresh table + dynamic filters (in case values disappear)
          await this.loadGuests();
          await this.loadGuestFilterOptions();

          this.guestsLoading = false;
          alert('Guest deleted successfully.');
        },
        error: (err) => {
          console.error('Failed to delete guest', err);
          this.guestsLoading = false;
          alert('Failed to delete guest. Please try again.');
        }
      });
    } catch (e) {
      console.error(e);
      this.guestsLoading = false;
      alert('Unexpected error. Please try again.');
    }
  }

  /*---------Download files----------*/
  //Export UI toggle
  showExport = false;
  toggleExport() {
    this.showExport = !this.showExport;
  }

  //helpers
  private makeExportOpts() {
    const opts: any = {};
    if (this.selectedDietary) opts.dietary = this.selectedDietary;
    if (this.selectedAllergy) opts.allergy = this.selectedAllergy;
    if (this.selectedRsvp !== 'all') opts.rsvp = this.selectedRsvp === 'true';
    return opts;
  }

  private saveBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  private buildFilename(ext: 'csv' | 'pdf') {
    const parts = ['guest-list'];
    if (this.selectedDietary) parts.push(`diet_${this.selectedDietary}`);
    if (this.selectedAllergy) parts.push(`allergy_${this.selectedAllergy}`);
    if (this.selectedRsvp !== 'all') parts.push(`rsvp_${this.selectedRsvp}`);
    return `${parts.join('-')}.${ext}`;
  }

  //csv
  async exportCsv() {
    const user = await this.waitForUser();
    if (!user) return;
    const eventId = user.uid;
    const opts = this.makeExportOpts();

    this.dataService.downloadGuestsCsv(eventId, opts).subscribe({
      next: (blob) => this.saveBlob(blob, this.buildFilename('csv')),
      error: (err) => {
        console.error('CSV export failed', err);
        alert('Failed to export CSV.');
      }
    });
  }

  //pdf
  async exportPdf() {
    const user = await this.waitForUser();
    if (!user) return;
    const eventId = user.uid;
    const opts = this.makeExportOpts();

    this.dataService.downloadGuestsPdf(eventId, opts).subscribe({
      next: (blob) => this.saveBlob(blob, this.buildFilename('pdf')),
      error: (err) => {
        console.error('PDF export failed', err);
        alert('Failed to export PDF.');
      }
    });
  }

  // Send invitation to guest using external API
  async sendInvitation(guest: Guest) {
    if (!guest.Email) {
      alert('Cannot send invitation: Guest has no email address.');
      return;
    }

    console.log('📤 Sending invitation directly to API...');
    
    // Send invitation with exact format and order as required
    const inviteData = {
      guestEmail: guest.Email,
      guestName: guest.Name,
      phone: "+2771XXXXXXX",
      extra: {}
    };

    console.log('Sending exact API format:', inviteData);

    this.dataService.sendGuestInvite(inviteData).subscribe({
      next: (response) => {
        console.log('✅ Invitation sent successfully:', response);
        alert(`Invitation sent successfully to ${guest.Name}!`);
      },
      error: (error) => {
        console.error('❌ Error sending invitation:', error);
        alert(`Failed to send invitation to ${guest.Name}. Please try again.`);
      }
    });
  }



  /*------------------------------user has NO event--------------------------*/
  //allow user to create one
  async createEvent()
  {
    if (this.form.invalid) {
      return;
    }

    const user = await this.waitForUser();
    if (!user) {
      return;
    }

    const db = getFirestore(getApp());
    const { name1, name2, date, time, budget } = this.form.getRawValue();
    const docRef = doc(db, 'Events', user.uid);
    const dateTime = new Date(`${date}T${time}`);

    //generating a code for RSVP
    let num=0;
    let strNum;
    let temp='';
    for (let i =0;i<3;i++)
    {
      num=Math.floor(Math.random() * 9) + 1;
      strNum=String(num);
      temp+=strNum;
    }
    const RSVPCode = (name1 && name2) ? name1.substring(0, 3).toUpperCase() + name2.substring(0, 3).toUpperCase()+temp: '';

    try {
        await setDoc(docRef, {
        Name1: this.form.value.name1,
        Name2: this.form.value.name2,
        Date_Time: dateTime,
        EventID: user.uid,
        RSVPcode: RSVPCode,
        VendorID: null,
        VenueID: null,
        budget: this.form.value.budget,
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

  logout(): void
  {
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
  months: number = 0;
  days: number = 0;
  hours: number = 0;
  minutes: number = 0;

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
