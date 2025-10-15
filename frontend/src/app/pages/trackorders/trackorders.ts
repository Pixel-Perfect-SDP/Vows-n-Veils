import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebase/firebase-config';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { lastValueFrom } from 'rxjs';

interface VenueOrder {
  id: string;
  companyID: string;
  customerID: string;
  venueID: string;
  eventID: string;
  startAt: string;
  endAt: string;
  note: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

@Component({
  selector: 'app-trackorders',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './trackorders.html',
  styleUrls: ['./trackorders.css']
})
export class Trackorders implements OnInit {
  orders: VenueOrder[] = [];
  loading: boolean = false;
  notificationid: string = "";

  constructor(private router: Router, private http: HttpClient) { }

  ngOnInit(): void {
    onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        const companyID = user.uid;
        this.loadOrders(companyID);
      } else {
        console.error('User not logged in');
        this.router.navigate(['/login']);
      }
    });
  }

  backhome(): void {
    this.router.navigate(['/manageservices']);
  }

  loadOrders(companyID: string): void {
    this.loading = true;

    this.http.get<VenueOrder[]>(`https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues/orders/company/${companyID}`)
      .subscribe({
        next: async (res) => {
          const updatedOrders = await Promise.all(res.map(async (order) => {
            let venueName = 'No venue selected';
            let eventNames = order.eventID;
            let eventDateTime = '';

            if (order.venueID) {
              try {
                const venue: any = await lastValueFrom(
                  this.http.get(`https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues/${order.venueID}`)
                );
                venueName = venue.venuename || 'No venue name';
              } catch (err) {
                console.error('Failed to fetch venue info:', err);
              }
            }

            try {
              const eventDocRef = doc(getFirestore(), 'Events', order.eventID);
              const eventSnap = await getDoc(eventDocRef);
              if (eventSnap.exists()) {
                const eventData = eventSnap.data();
                const dateTime: any = eventData['Date_Time'];

                if (dateTime?.seconds) {
                  eventDateTime = new Date(dateTime.seconds * 1000).toLocaleString();
                } else {
                  eventDateTime = order.startAt;
                }

                eventNames = `${eventData['Name1']} & ${eventData['Name2']}`;
              }
            } catch (err) {
              console.error('Failed to fetch event info:', err);
            }

            return {
              ...order,
              venueID: venueName,
              eventID: eventNames,
              startAt: eventDateTime
            };
          }));

          this.orders = updatedOrders.sort((a, b) => {
            const orderStatus = { pending: 0, accepted: 1, rejected: 2 };
            return orderStatus[a.status] - orderStatus[b.status];
          });

          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load orders:', err);
          this.loading = false;
        }
      });
  }


  updateStatus(orderID: string, status: 'accepted' | 'rejected'): void {
    this.http.put(`https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues/orders/${orderID}/status`, { status })
      .subscribe({
        next: () => {
          const user = auth.currentUser;
          if (user) this.loadOrders(user.uid);
        },
        error: (err) => console.error('Failed to update status:', err)
      });
  }


}




