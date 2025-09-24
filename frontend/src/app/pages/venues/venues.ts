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
  chosenVenueID: string | null = null;
  chosenVenuecompanyID: string | null = null;
  weddingDate: Date = new Date();
  constructor(private http: HttpClient, private router: Router) { }

  ngOnInit(): void {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log('User is logged in:', user.uid);
        this.getChosenVenue();
        this.checkVenueOrder();
        this.getRecommendations();
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
          this.loading = false;
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
          .then(() => {
            console.log(`VenueID updated for event ${eventDoc.id}`);
            this.loading = false;
          }
          )
          .catch((error) => console.error('Error updating VenueID:', error))
          .finally(() => {
            this.chosenVenueName = this.selectedVenue ? this.selectedVenue.venuename : null;
            this.chosenVenueID = this.selectedVenue ? this.selectedVenue.id : null;
            this.chosenVenuecompanyID = this.selectedVenue ? this.selectedVenue.companyID : null;

            this.loading = false;
          })
      })
      .catch((error) => {
        console.error('Error fetching events:', error);
        this.loading = false;
      });
  }

  getChosenVenue(): void {
    const user = auth.currentUser;

    if (!user) {
      this.chosenVenueName = null;
      this.chosenVenueID = null;
      this.chosenVenuecompanyID = null;
      return;
    }
    const uid = user.uid;
    const eventsRef = collection(db, 'Events');
    const q = query(eventsRef, where('EventID', '==', uid));

    getDocs(q)
      .then(async (querySnapshot) => {
        if (querySnapshot.empty) {
          this.chosenVenueName = null;
          this.chosenVenueID = null;
          this.chosenVenuecompanyID = null;
          return;
        }

        const eventDoc = querySnapshot.docs[0];
        const venueId = eventDoc.data()?.['VenueID'];
        if (!venueId) {
          this.chosenVenueName = null;
          this.chosenVenueID = null;
          this.chosenVenuecompanyID = null;
          return;
        }

        if (!venueId) {
          this.chosenVenueName = null;
          this.chosenVenueID = null;
          this.chosenVenuecompanyID = null;
          return;
        }

        this.http.get<Venue>(`https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues/${venueId}`)
          .subscribe({
            next: (data) => {
              this.chosenVenueName = data.venuename;
              this.chosenVenueID = data.id;
              this.chosenVenuecompanyID = data.companyID;
            },
            error: () => {
              this.chosenVenueName = null;
              this.chosenVenueID = null;
              this.chosenVenuecompanyID = null;
            }
          });
      })
      .catch(() => {
        this.chosenVenueName = null;
        this.chosenVenueID = null;
        this.chosenVenuecompanyID = null;
      });
  }


  backTohome(): void {
    this.router.navigate(['/homepage']);
  }


  confirmVenue(): void {
    const user = auth.currentUser;
    if (!user || !this.chosenVenueID || !this.chosenVenuecompanyID) return;

    const uid = user.uid;

    const eventsRef = collection(db, 'Events');
    const q = query(eventsRef, where('EventID', '==', uid));

    getDocs(q).then(querySnapshot => {
      if (querySnapshot.empty) {
        alert('No event found.');
        return;
      }

      const eventDoc = querySnapshot.docs[0];
      const eventData: any = eventDoc.data();


      if (!confirm('Once confirmed, you won’t be able to change this venue. Are you sure?')) return;
      if (!eventData.Date_Time) {
        alert('Event does not have a wedding date set.');
        return;
      }
      this.weddingDate = eventData.Date_Time.toDate();

      this.loading = true;
      const payload = {
        customerID: uid,
        venueID: this.chosenVenueID,
        companyID: this.chosenVenuecompanyID,
        note: "",
        startAt: this.weddingDate.toISOString(),
        endAt: new Date(this.weddingDate.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        eventID: uid,
        guestsNum: eventData.guestsNum || 150
      };

      this.http.post<{ ok: boolean, orderID: string }>(
        'https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues/confirm-order', payload
      ).subscribe({
        next: res => {
          if (res.ok) {
            alert('Venue order created! Waiting for confirmation.');
            const btn = document.querySelector('.btn-confirm') as HTMLElement;
            if (btn) btn.style.opacity = '0.3';
            this.loading = false;

          }
        },
        error: err => {
          alert(err.error?.error || 'Failed to confirm venue.');
          this.loading = false;
        }
      });

    }).catch(err => console.error(err));
  }
hasExistingOrder = false;

checkVenueOrder(): void {
  const user = auth.currentUser;
  if (!user) return;

  const ordersRef = collection(db, 'VenuesOrders');
  getDocs(query(ordersRef, where('customerID', '==', user.uid)))
    .then(snapshot => {
      this.hasExistingOrder = !snapshot.empty;
    })
    .catch(err => console.error(err));
}

//getting recommened venues

  userBudget: number | null = null;

  recommendedVenues: Venue[] = [];

  getRecommendations(): void {
    this.loading = true;

    const user = auth.currentUser;
    if (!user) {
      this.recommendedVenues = [];
      this.loading = false;
      return;
    }

    const uid = user.uid;
    const eventsRef = collection(db, 'Events');
    const q = query(eventsRef, where('EventID', '==', uid));

    getDocs(q)
      .then(snapshot =>
        {
        if (snapshot.empty) {
          this.recommendedVenues = [];
          this.loading = false;
          return;
        }

        const eventDoc = snapshot.docs[0];
        const budget = eventDoc.data()?.['budget'] ?? null;
        this.userBudget=budget

        // Now fetch venues AFTER we have budget
        this.http.get<Venue[]>('https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues')
          .subscribe({
            next: (data) => {
              const activeVenues = data.filter((venue:any) => venue.status === 'active');
              this.recommendedVenues = budget
                ? activeVenues.filter(venue => venue.price <= budget)
                : [];
              this.loading = false;
            },
            error: (err) => {
              this.error = 'Failed to load recommended venues: ' + err.message;
              this.loading = false;
            }
          });
      })
      .catch(err => {
        console.error(err);
        this.recommendedVenues = [];
        this.loading = false;
      });
  }






}
