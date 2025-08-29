import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { auth } from '../firebase/firebase-config';
import { onAuthStateChanged, User } from 'firebase/auth';

@Component({
  selector: 'app-manageservices',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './manageservices.html',
  styleUrls: ['./manageservices.css']
})
export class Manageservices implements OnInit {

  selected: string | null = null;
  venues: any[] = [];
  loading: boolean = false;

  editingVenue: any = null;
  updateData: any = {};

  addingVenue: boolean = false;
  newVenueData: any = {};

  user: User | null = null; 

  constructor(private http: HttpClient) {}

  ngOnInit() {
    onAuthStateChanged(auth, (currentUser) => {
      this.user = currentUser;
      if (this.user) {
        console.log("Logged in user:", this.user.uid);
      } else {
        console.warn("No user logged in!");
      }
    });
  }

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
    this.http.put(`https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues/${this.editingVenue.id}`, this.updateData)
      .subscribe({
        next: () => { alert('Venue updated successfully!'); this.editingVenue = null; this.fetchVenues(); },
        error: err => { console.error('Error updating venue', err); alert('Failed to update venue.'); }
      });
  }

  CancelUpdate() { this.editingVenue = null; }

  // add new venue
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
      images: ['placeholder-image.jpg']
    };
  }

  SubmitNewVenue() {
    if (!this.user) {
      alert("No user logged in!");
      return;
    }
    this.newVenueData.companyID = this.user.uid;
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

