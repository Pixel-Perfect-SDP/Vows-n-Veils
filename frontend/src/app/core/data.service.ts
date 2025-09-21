import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface Guest {
  id?: string;
  Name: string;
  Email: string;
  Dietary: string;
  Allergies: string;
  RSVPstatus: boolean;
  Song: string;
  EventID: string;
}

export interface GuestFiltersResponse {
  dietary: string[];
  allergies: string[];
}

export interface CreateGuestDto {
  Name: string;
  Email: string;
  Dietary?: string;
  Allergies?: string;
  RSVPstatus?: boolean;
  Song?: string;
}

@Injectable({ providedIn: 'root' })
export class DataService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}


  getVenueById(venueId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/venues/${venueId}`);
  }

  
  postUserLogin(user: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/login`, user);
  }

  getEmails(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/users/emails`);
  }

  //GET /events/:eventId/guests/{optional params}
  getGuestsByEvent(eventId: string, opts?: { dietary?: string; allergy?: string; rsvp?: boolean }): Observable<Guest[]> {
    let params = new HttpParams();
    if (opts?.dietary) params = params.set('dietary', opts.dietary);
    if (opts?.allergy) params = params.set('allergy', opts.allergy);
    if (typeof opts?.rsvp === 'boolean') params = params.set('rsvp', String(opts.rsvp));

    return this.http.get<Guest[]>(`${this.apiUrl}/events/${eventId}/guests`, { params });
  }

  //GET /events/:eventID/guest-filters
  getGuestFilterOptions(eventId: string): Observable<GuestFiltersResponse> {
    return this.http.get<GuestFiltersResponse>(`${this.apiUrl}/events/${eventId}/guest-filters`);
  }

  //POST //events/:eventID/guests
  postGuest(eventId: string, guest: CreateGuestDto): Observable<Guest> {
    return this.http.post<Guest>(`${this.apiUrl}/events/${eventId}/guests`, guest);
  }
  
  // Get weather data for a location and date
  getWeatherCrossing(location: string, date: string): Observable<any> {
    const params = new HttpParams().set('location', location).set('date', date);
    return this.http.get<any>(`${this.apiUrl}/weather-crossing`, { params });  
  }

  // delete guest
  deleteGuest(eventId: string, guestId: string) {
    return this.http.delete<{ message: string; id: string }>(`${this.apiUrl}/events/${eventId}/guests/${guestId}`);
  }

}
