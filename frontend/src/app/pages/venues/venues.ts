import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebase-config';
import { onAuthStateChanged } from 'firebase/auth';


interface VenueImage {
  url: string;
  name: string;
}

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
  images?: VenueImage[];
}

@Component({
  selector: 'app-venues',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule],
  templateUrl: './venues.html',
  styleUrls: ['./venues.css']
})
export class Venues implements OnInit {
  venues: Venue[] = [];
  selectedVenue: Venue | null = null;
  loading = true;
  error: string | null = null;
  chosenVenueName: string | null = null;

  constructor(private http: HttpClient, private router: Router) { }

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
    this.loading = true;
    this.http.get<Venue[]>('https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues')
      .subscribe({
        next: (data) => {
          this.venues = data.filter((venue: any) => venue.status === 'active');
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Failed to load venues: ' + err.message;
          this.loading = false;
        }
      });
  }

  viewVenue(id: string): void {
    this.loading = true;
    this.http.get<Venue>(`https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues/${id}`)
      .subscribe({
        next: (data) => {
          this.selectedVenue = data;
          this.loading=false;
        },
        error: (err) => {
          this.error = 'Failed to load venue: ' + err.message;
          this.loading = false;
        }
      });
  }

  backToList(): void {
    this.selectedVenue = null;
  }



  selectVenue(id: string): void {
    this.loading = true;
    const user = auth.currentUser;

    if (!user) {
      console.log('No user logged in');
      this.loading = false;
      return;
    }

    const uid = user.uid;
    console.log(uid);
    const eventsRef = collection(db, 'Events');
    const q = query(eventsRef, where('EventID', '==', uid));
    getDocs(q)
      .then((querySnapshot) => {
        if (querySnapshot.empty) {
          console.log('No event found for this user');
          this.loading = false;
          return;
        }

        const eventDoc = querySnapshot.docs[0];
        const eventDocRef = doc(db, 'Events', eventDoc.id);

        updateDoc(eventDocRef, { VenueID: id })
          .then(() =>{
            console.log(`VenueID updated for event ${eventDoc.id}`);
            this.loading = false;
          }
          )
          .catch((error) => console.error('Error updating VenueID:', error))
          .finally(() => {
            this.chosenVenueName = this.selectedVenue ? this.selectedVenue.venuename : null;
             this.loading = false;
          })
      })
      .catch((error) =>{
        console.error('Error fetching events:', error);
        this.loading = false;
        });
  }

  getChosenVenue(): void {
    const user = auth.currentUser;

    if (!user) {
      this.chosenVenueName = null;
      return;
    }
    const uid = user.uid;
    const eventsRef = collection(db, 'Events');
    const q = query(eventsRef, where('EventID', '==', uid));

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

        this.http.get<Venue>(`https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues/${venueId}`)
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


  backTohome(): void {
    this.router.navigate(['/homepage']);
  }
}
