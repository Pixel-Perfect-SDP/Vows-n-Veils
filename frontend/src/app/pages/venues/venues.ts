import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';

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

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.getVenues();
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
          console.log('Selected venue:', data);
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
}
