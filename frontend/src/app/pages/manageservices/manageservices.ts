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
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { auth } from '../firebase/firebase-config';

@Component({
  selector: 'app-manageservices',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, HttpClientModule,FormsModule],
  templateUrl: './manageservices.html',
  styleUrls: ['./manageservices.css']
})
export class Manageservices implements OnInit {
  router = inject(Router);
  auth = inject(AuthService);

  public hasVenueCompany: boolean | null = null;
  public companyVenueData: any = null;
  private formBuild = inject(FormBuilder);
  //VENUESS IMPLEMENTATIONS:

  selected: string | null = null;
  venues: any[] = [];
  loading: boolean = false;

  editingVenue: any = null;
  updateData: any = {};

  addingVenue: boolean = false;
  newVenueData: any = {};

  user: User | null = null;

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
          onAuthStateChanged(auth, (currentUser) => {
            this.user = currentUser;
            if (this.user) {
              console.log("Logged in user:", this.user.uid);
              this.selected = 'Venues'

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
    const companyID = this.user.uid;
    this.loading = true;
    this.http.get<any[]>(`https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues/company/${companyID}`)
      .subscribe({
        next: data => { this.venues = data; this.loading = false; },
        error: err => { console.error('Error fetching venues', err); this.venues = []; this.loading = false; }
      });
  }

  // update venue
  UpdateVenue(venue: any) {
    this.editingVenue = { ...venue };
    this.updateData = { ...venue };
  }

  SubmitUpdate() {
    if (!this.editingVenue || !this.user) return;
    this.updateData.companyID = this.user.uid;

    delete this.updateData.images;

    this.http.put(`https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues/${this.editingVenue.id}`, this.updateData)
      .subscribe({
        next: () => { alert('Venue updated successfully!'); this.editingVenue = null; this.fetchVenues(); },
        error: err => { console.error('Error updating venue', err); alert('Failed to update venue.'); }
      });
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
      price: null
    };
  }

  SubmitNewVenue() {
    if (!this.user) {
      alert("No user logged in!");
      return;
    }
    this.newVenueData.companyID = this.user.uid;

    delete this.newVenueData.images;

    this.http.post(`https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues`, this.newVenueData)
      .subscribe({
        next: () => { alert('New venue added successfully!'); this.addingVenue = false; this.fetchVenues(); },
        error: err => { console.error('Error adding venue', err); alert('Failed to add venue.'); }
      });
  }

  CancelAdd() { this.addingVenue = false; }

  // delete venue
  DeleteVenue(venue: any) {
    const confirmDelete = confirm(`Are you sure you want to delete "${venue.venuename}"? This cannot be undone!`);
    if (!confirmDelete) return;

    this.http.delete(`https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues/${venue.id}`)
      .subscribe({
        next: () => {
          alert(`Venue "${venue.venuename}" deleted successfully!`);
          this.fetchVenues();
        },
        error: (err) => {
          console.error('Error deleting venue', err);
          alert('Failed to delete venue.');
        }
      });
  }

}
