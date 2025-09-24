import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';

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
  imports: [],
  templateUrl: './trackorders.html',
  styleUrls: ['./trackorders.css']
})
export class Trackorders implements OnInit {
  orders: VenueOrder[] = [];
  private apiUrl = ''; // replace with backend

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit(): void {
    const auth = getAuth();
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
    this.http.get<VenueOrder[]>(`${this.apiUrl}/company/${companyID}/orders`)
      .subscribe({
        next: (res) => {
          this.orders = res.sort((a, b) => {
            const orderStatus = { pending: 0, accepted: 1, rejected: 2 };
            return orderStatus[a.status] - orderStatus[b.status];
          });
        },
        error: (err) => console.error('Failed to load orders:', err)
      });
  }

  // Accept or reject order
  updateStatus(orderID: string, status: 'accepted' | 'rejected'): void {
    this.http.put(`${this.apiUrl}/orders/${orderID}/status`, { status })
      .subscribe({
        next: () => {
          // Reload using currently logged-in user's companyID
          const auth = getAuth();
          const user = auth.currentUser;
          if (user) this.loadOrders(user.uid);
        },
        error: (err) => console.error('Failed to update status:', err)
      });
  }
}




