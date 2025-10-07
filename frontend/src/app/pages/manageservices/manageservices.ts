import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot,
  query, serverTimestamp, setDoc, where
} from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { AuthService } from '../../core/auth';
import { DataService } from '../../core/data.service';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { auth } from '../firebase/firebase-config';
import { signOut } from 'firebase/auth';
import * as L from 'leaflet';

interface VenueImage {
  url: string;
  name: string; // this is the Firebase Storage path/filename
}
interface Notification {
  id: string;
  from: string;
  message: string;
  timestamp: any;
  read: boolean;
}

interface Venue {
  id: string;
  venuename: string;
  description: string;
  address: string;
  email: string;
  phonenumber: string;
  capacity: number;
  price: number;
  status: string;
  companyID: string;
  images: VenueImage[];
}

@Component({
  selector: 'app-manageservices',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, HttpClientModule, FormsModule],
  templateUrl: './manageservices.html',
  styleUrls: ['./manageservices.css']
})
export class Manageservices implements OnInit, OnDestroy {
  router = inject(Router);
  auth = inject(AuthService);
  private dataService = inject(DataService);

  public hasVenueCompany: boolean | null = null;
  public companyVenueData: any = null;
  private formBuild = inject(FormBuilder);
  //VENUESS IMPLEMENTATIONS:

  selected: string | null = null;
  venues: any[] = [];
  loading: boolean = false;
  selectedFiles: FileList | null = null;
  editingVenue: any = null;
  updateData: any = {};
  newUpdateFiles: FileList | null = null;
  addingVenue: boolean = false;
  newVenueData: any = {};
  public notifications: Notification[] = [];
  public unreadCount: number = 0;
  private db = getFirestore(getApp());

  user: User | null = null;

  // Map-related properties
  public mapVisible: boolean = false;
  public mapData: any = null;
  public mapLoading: boolean = false;
  public mapError: string | null = null;
  public mapPin: { lat: number; lon: number; address?: string } | null = null;
  public nearbyPlaces: any[] = [];
  public searchAddress: string = '';

  // Leaflet-specific properties
  private map: L.Map | null = null;
  private currentMarker: L.Marker | null = null;

  constructor(private http: HttpClient) { }
  ///////
  form = this.formBuild.group({
    companyName: ['', [Validators.required]],
    companyEmail: ['', [Validators.required, Validators.email]],
    companyNumber: ['', [Validators.required, Validators.pattern('^[0-9+ ]+$')]],
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

  //check if user has an existing company with type venue 
  async ngOnInit() {
    try {
      const user = await this.waitForUser();
      if (!user) return;
      const db = getFirestore(getApp());
      const docRef = doc(db, 'CompaniesVenues', user.uid);
      const docSnap = await getDoc(docRef);

      //if the company exists, check if type venue
      if (docSnap.exists()) {
        this.companyVenueData = docSnap.data();
        if (this.companyVenueData.type === 'venue') {
          this.hasVenueCompany = true;
          onAuthStateChanged(auth, async(currentUser) => {
            this.user = currentUser;
            if (this.user) {
              console.log("Logged in user:", this.user.uid);
              this.selected = 'Venues'
              await this.fetchNotifications();

            } else {
              console.warn("No user logged in!");
            }
          });
        } else {
          this.hasVenueCompany = false;
          this.companyVenueData = null;
        }
      } else {
        this.hasVenueCompany = false;
        this.companyVenueData = null;
      }
    } catch (error) {
      console.error('Error fetching company data: ', error);
      this.hasVenueCompany = false;
      this.companyVenueData = null;
    }
  }//ngonInit

  //if no venue company, allow user to create one
  async createVenueCompany() {
    if (this.form.invalid) {
      return;
    }

    const user = await this.waitForUser();
    if (!user) {
      return;
    }

    const db = getFirestore(getApp());
    const { companyName, companyEmail, companyNumber } = this.form.getRawValue();

    const docRef = doc(db, 'CompaniesVenues', user.uid);

    try {
      await setDoc(docRef, {
        userID: user.uid,
        companyName: this.form.value.companyName,
        email: this.form.value.companyEmail,
        phoneNumber: this.form.value.companyNumber,
        type: 'venue',
      });

      this.hasVenueCompany = true;
      const snap = await getDoc(docRef);
      this.companyVenueData = snap.data();

      alert('Venue Company created successfully!');
    } catch (e) {
      console.error('Error adding document: ', e);
      alert('Error creating your Venue Company.');
    }
  }


  //Venue IMplementation (MICHELLE)

  select(option: string) {
    this.selected = option;
    if (option === 'Venues') this.fetchVenues();
    else {
      this.venues = [];
      this.editingVenue = null;
      this.addingVenue = false;
    }
  }


  
  fetchVenues() {
    if (!this.user) {
      alert("No user logged in!");
      return;
    }
    this.loading = true;
    const companyID = this.user.uid;
    this.http.get<any[]>(`https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues/company/${companyID}`)
      .subscribe({
        next: data => { this.venues = data; this.loading = false; },
        error: err => { console.error('Error fetching venues', err); this.venues = []; this.loading = false; }
      });
  }

  // update venue
  onNewFilesSelected(event: any) {
    this.newUpdateFiles = event.target.files;
  }
  UpdateVenue(venue: any) {
    this.editingVenue = { ...venue };
    this.updateData = { ...venue };

    this.updateData.imagesToDelete = this.editingVenue.images?.map(() => false) || [];
  }

  async SubmitUpdate() {
    if (!this.editingVenue || !this.user) return;
    this.loading = true;

    try {
      const venueId = this.editingVenue.id;

      const imagesToDelete = this.updateData.imagesToDelete
        ?.map((checked: boolean, idx: number) =>
          checked ? this.editingVenue!.images[idx].name : null
        )
        .filter((v: string | null) => v) || [];

      const formData = new FormData();
      formData.append('deleteImages', JSON.stringify(imagesToDelete));

      // Append new files
      if (this.newUpdateFiles) {
        for (let i = 0; i < this.newUpdateFiles.length; i++) {
          formData.append('images', this.newUpdateFiles[i]);
        }
      }

      const venueData = { ...this.updateData };
      delete venueData.images;
      delete venueData.imagesToDelete;
      formData.append('venueData', JSON.stringify(venueData));

      const apiUrl = `https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues/${venueId}/images`;
      const result: any = await this.http.put(apiUrl, formData).toPromise();

      this.editingVenue.images = result.images || [];

      alert('Venue updated successfully!');
      this.editingVenue = null;
      this.fetchVenues();

    } catch (err) {
      console.error('Error updating venue', err);
      alert('Failed to update venue.');
    } finally {
      this.loading = false;
      this.newUpdateFiles = null;
    }
  }
  CancelUpdate() { this.editingVenue = null; }

  AddVenue() {
    this.addingVenue = true;
    this.newVenueData = {
      venuename: '',
      description: '',
      address: '',
      email: '',
      phonenumber: '',
      capacity: null,
      price: null,
      status: "pending"
    };
  }

  onFileSelected(event: any): void {
    this.selectedFiles = event.target.files;
  }

  SubmitNewVenue() {
    if (!this.user) {
      alert("No user logged in!");
      return;
    }
    this.newVenueData.companyID = this.user.uid;
    this.loading = true;
    delete this.newVenueData.images;

    const formData = new FormData();
    formData.append('venue', JSON.stringify(this.newVenueData));
    if (this.selectedFiles) {
      for (let i = 0; i < this.selectedFiles.length; i++) {
        formData.append('images', this.selectedFiles[i]);
      }
    }
    this.http.post(`https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues`, formData)
      .subscribe({
        next: () => { alert('New venue added successfully!'); this.addingVenue = false; this.fetchVenues(); this.loading = false; },
        error: err => { console.error('Error adding venue', err); alert('Failed to add venue.'); this.loading = false; }
      });
  }

  CancelAdd() { this.addingVenue = false; }

  // delete venue
  DeleteVenue(venue: any) {
    const confirmDelete = confirm(`Are you sure you want to delete "${venue.venuename}"? This cannot be undone!`);
    if (!confirmDelete) return;
    this.loading = true;
    this.http.delete(`https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues/${venue.id}`)
      .subscribe({
        next: () => {
          alert(`Venue "${venue.venuename}" deleted successfully!`);
          this.fetchVenues();
          this.loading = false;

        },
        error: (err) => {
          console.error('Error deleting venue', err);
          alert('Failed to delete venue.');
          this.loading = false;

        }
      });
  }

  logout(): void {
    signOut(auth)
      .then(() => {
        console.log('User signed out successfully');
        this.router.navigate(['/landing']);
      })
      .catch((error) => {
        console.error('Error signing out:', error);
      });
  }


  // ===== MAP FUNCTIONALITY =====

  // Toggle map visibility
  toggleMap(): void {
    this.mapVisible = !this.mapVisible;
    if (this.mapVisible) {
      // Use multiple attempts with increasing delays
      this.attemptMapInitialization(0);
    } else if (this.map) {
      this.map.remove();
      this.map = null;
      this.currentMarker = null;
    }
  }

  // Attempt map initialization with retries
  private attemptMapInitialization(attempt: number): void {
    const maxAttempts = 5;
    const delay = 100 + (attempt * 100); // 100ms, 200ms, 300ms, etc.

    setTimeout(() => {
      const container = document.getElementById('leaflet-map');
      if (container && container.offsetWidth > 0 && container.offsetHeight > 0) {
        this.initializeLeafletMap();
      } else if (attempt < maxAttempts) {
        console.log(`Map container not ready, attempt ${attempt + 1}/${maxAttempts}`);
        this.attemptMapInitialization(attempt + 1);
      } else {
        console.error('Map container never became available');
        this.mapError = 'Map container failed to load. Please try refreshing the page.';
        this.mapLoading = false;
      }
    }, delay);
  }

  // Initialize Leaflet map
  private initializeLeafletMap(): void {
    this.mapLoading = true;
    this.mapError = null;

    try {
      // Check if container exists
      const container = document.getElementById('leaflet-map');
      if (!container) {
        console.error('Map container element not found');
        this.mapError = 'Map container not found. Please try again.';
        this.mapLoading = false;
        return;
      }

      // Check if map is already initialized
      if (this.map) {
        this.map.remove();
      }

      // Fix for default markers in production
      this.fixLeafletIcons();

      // Initialize map with default location (Johannesburg based on your screenshot)
      const defaultLat = -26.2041;
      const defaultLon = 28.0473;

      // Create map
      this.map = L.map('leaflet-map', {
        center: [defaultLat, defaultLon],
        zoom: 10,
        zoomControl: true,
        attributionControl: true
      });

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(this.map);

      // Add click handler
      this.map.on('click', (e: L.LeafletMouseEvent) => {
        this.onLeafletMapClick(e.latlng.lat, e.latlng.lng);
      });

      // Set initial pin
      this.setMapPin(defaultLat, defaultLon, 'Johannesburg, South Africa');
      this.mapLoading = false;

    } catch (error) {
      console.error('Error initializing map:', error);
      this.mapError = 'Failed to initialize map. Please try refreshing the page.';
      this.mapLoading = false;
    }
  }

  // Fix Leaflet default icon paths for production
  private fixLeafletIcons(): void {
    // This fixes marker icons in production builds
    const iconDefault = L.icon({
      iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCAyNSA0MSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyLjUgMEMxOS40MDM2IDAgMjUgNS41OTY0NCAyNSAxMi41QzI1IDE5LjQwMzYgMTkuNDAzNiAyNSAxMi41IDI1QzUuNTk2NDQgMjUgMCAxOS40MDM2IDAgMTIuNUMwIDUuNTk2NDQgNS41OTY0NCAwIDEyLjUgMFoiIGZpbGw9IiNGRjQ0NDQiLz4KPHBhdGggZD0iTTEyLjUgMzVMMjEuNjUwNiAyMkgzLjM0OTM2TDEyLjUgMzVaIiBmaWxsPSIjRkY0NDQ0Ii8+CjxjaXJjbGUgY3g9IjEyLjUiIGN5PSIxMi41IiByPSI3LjUiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDEiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCA0MSA0MSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGVsbGlwc2UgY3g9IjIwLjUiIGN5PSIzNy41IiByeD0iMTcuNSIgcnk9IjMuNSIgZmlsbD0iYmxhY2siIGZpbGwtb3BhY2l0eT0iMC4zIi8+Cjwvc3ZnPgo=',
      shadowSize: [41, 41]
    });

    L.Marker.prototype.options.icon = iconDefault;
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  // Search for an address
  searchLocation(): void {
    if (!this.searchAddress.trim()) return;

    this.mapLoading = true;
    this.mapError = null;

    this.dataService.getMapData(this.searchAddress).subscribe({
      next: (data: any) => {
        this.mapData = data;
        this.setMapPin(data.lat, data.lon, data.display_name);

        // Pan map to new location
        if (this.map) {
          this.map.setView([data.lat, data.lon], 13);
        }

        this.mapLoading = false;
      },
      error: (err) => {
        console.error('Map search error:', err);

        // Check if it's a connection error (backend unavailable)
        if (err.status === 0 || err.error?.message?.includes('Connection refused')) {
          this.mapError = 'Map service temporarily unavailable. You can still click on the map to select locations.';
        } else {
          this.mapError = 'Address not found. Please try a different search term.';
        }

        this.mapLoading = false;
      }
    });
  }

  // Handle Leaflet map clicks
  private onLeafletMapClick(lat: number, lng: number): void {
    if (this.mapError && this.mapError.includes('temporarily unavailable')) {
      this.setMapPin(lat, lng, `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      return;
    }

    this.mapLoading = true;
    this.dataService.getMapData(undefined, lat, lng).subscribe({
      next: (data: any) => {
        this.setMapPin(lat, lng, data.display_name);
        this.mapLoading = false;
      },
      error: (err) => {
        console.warn('Reverse geocoding failed, using coordinates:', err);
        this.setMapPin(lat, lng, `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        this.mapLoading = false;
      }
    });
  }

  // Set a pin on the map
  setMapPin(lat: number, lon: number, address?: string): void {
    this.mapPin = { lat, lon, address };

    if (this.map) {
      // Remove existing marker
      if (this.currentMarker) {
        this.map.removeLayer(this.currentMarker);
      }

      // Add new marker
      this.currentMarker = L.marker([lat, lon])
        .addTo(this.map)
        .bindPopup(address || `${lat.toFixed(4)}, ${lon.toFixed(4)}`)
        .openPopup();
    }

    // Only try to load nearby places if we're not already in an error state
    if (!this.mapError) {
      this.loadNearbyPlaces(lat, lon);
    }
  }

  // Load nearby places
  private loadNearbyPlaces(lat: number, lon: number): void {
    // Don't show loading for nearby places - this is a nice-to-have feature
    this.dataService.getNearbyPlaces(lat, lon).subscribe({
      next: (places: any[]) => {
        this.nearbyPlaces = places.slice(0, 10); // Limit to 10 places
      },
      error: (err) => {
        console.warn('Could not load nearby places (backend may be unavailable):', err);
        this.nearbyPlaces = []; // Clear any previous data
        // Don't set mapError here - nearby places are optional
      }
    });
  }

  // Use current location for venue address
  useLocationForVenue(): void {
    if (this.mapPin && this.addingVenue) {
      this.newVenueData.address = this.mapPin.address || `${this.mapPin.lat}, ${this.mapPin.lon}`;
    } else if (this.mapPin && this.editingVenue) {
      this.updateData.address = this.mapPin.address || `${this.mapPin.lat}, ${this.mapPin.lon}`;
    }
  }

  // Get user-friendly venue type label
  getVenueTypeLabel(venueType: string): string {
    const labels: { [key: string]: string } = {
      'hotel': 'Hotel & Resort',
      'event_space': 'Event Space',
      'religious': 'Religious Venue',
      'outdoor': 'Outdoor Venue',
      'community': 'Community Center',
      'venue': 'Event Venue'
    };
    return labels[venueType] || 'Venue';
  }



  trackorders(): void {
    this.router.navigate(['/trackorders']);

  }
async fetchNotifications() {
  if (!this.user) return;

  try {
    const apiUrl = `https://site--vowsandveils--5dl8fyl4jyqm.code.run/notifications/${this.user.uid}`;
    const response: any = await this.http.get(apiUrl).toPromise();

    // Map the notifications from API to local structure
    this.notifications = (response.notifications || []).map((n: any) => ({
      uid: n.id,
      from: n.from || '',
      message: n.message || '',
      timestamp: n.timestamp || null,
      read: n.read || false,
    }));

    // Count unread notifications
    this.unreadCount = this.notifications.filter(n => !n.read).length;

    // Sort unread on top
    this.notifications.sort((a, b) => Number(a.read) - Number(b.read));
    
  } catch (err) {
    console.error('Error fetching notifications from API:', err);
    this.notifications = [];
    this.unreadCount = 0;
  }
}



goToNotifications() {
  this.router.navigate(['/notifications']);
}

}
