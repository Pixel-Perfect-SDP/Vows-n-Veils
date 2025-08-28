import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';

import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebase-config';
import { onAuthStateChanged } from 'firebase/auth';

interface Venue {
  id: string;
  venuename: string;
  address: string;
  capacity: number;
  companyID: string;
  description: string;
  email: string;
  phonenumber: string;
  price: number;
  image?: string;
  images?: string[];
}

@Component({
  selector: 'app-venues',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './venues.html',
  styleUrls: ['./venues.css']
})
export class Venues implements OnInit {
  venues: Venue[] = [];
  selectedVenue: Venue | null = null;
  loading = true;
  error: string | null = null;
  chosenVenueName: string | null = null;

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log('User is logged in:', user.uid);
        this.getChosenVenue();
      } else {
        console.log('No user logged in yet');
      }
    });

    this.getVenues()

  }


  getVenues(): void {
    this.http.get<Venue[]>('https://vows-n-veils-2.onrender.com/venues')
      .subscribe({
        next: (data) => {
          this.venues = data;
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Failed to load venues: ' + err.message;
          this.loading = false;
        }
      });
  }

  viewVenue(id: string): void {
    this.http.get<Venue>(`https://vows-n-veils-2.onrender.com/venues/${id}`)
      .subscribe({
        next: (data) => {
          this.selectedVenue = data;
        },
        error: (err) => {
          this.error = 'Failed to load venue: ' + err.message;
        }
      });
  }

  backToList(): void {
    this.selectedVenue = null;
  }



  selectVenue(id: string): void {
    alert('Venue will be updated');

    const user = auth.currentUser;

    if (!user) {
      console.log('No user logged in');
      return;
    }

    const uid = user.uid;
    console.log(uid);
    const eventsRef = collection(db, 'Events');
    const q = query(eventsRef, where('UserID', '==', uid));
    getDocs(q)
      .then((querySnapshot) => {
        if (querySnapshot.empty) {
          console.log('No event found for this user');
          return;
        }

        const eventDoc = querySnapshot.docs[0];
        const eventDocRef = doc(db, 'Events', eventDoc.id);

        updateDoc(eventDocRef, { VenueID: id })
          .then(() => console.log(`VenueID updated for event ${eventDoc.id}`))
          .catch((error) => console.error('Error updating VenueID:', error))
          .finally(() => {
            alert('Venue has been updated');   
            this.chosenVenueName = this.selectedVenue ? this.selectedVenue.venuename : null;
;           
          })
      })
      .catch((error) => console.error('Error fetching events:', error));
  }

  getChosenVenue(): void {
    const user = auth.currentUser;

    if (!user) {
      this.chosenVenueName = null;
      return;
    }

    const uid = user.uid;
    const eventsRef = collection(db, 'Events');
    const q = query(eventsRef, where('UserID', '==', uid));

    getDocs(q)
      .then(async (querySnapshot) => {
        if (querySnapshot.empty) {
          this.chosenVenueName = null;
          return;
        }

        const eventDoc = querySnapshot.docs[0];
        const venueId = eventDoc.data()?.['VenueID'];
        if (!venueId) {
          this.chosenVenueName = null;
          return;
        }

        if (!venueId) {
          this.chosenVenueName = null;
          return;
        }

        this.http.get<Venue>(`https://vows-n-veils-2.onrender.com/venues/${venueId}`)
          .subscribe({
            next: (data) => {
              this.chosenVenueName = data.venuename;
            },
            error: () => {
              this.chosenVenueName = null;
            }
          });
      })
      .catch(() => {
        this.chosenVenueName = null;
      });
  }
}
