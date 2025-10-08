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

  // Get map data (geocoding or reverse geocoding)
  getMapData(address?: string, lat?: number, lon?: number): Observable<any> {
    let params = new HttpParams();
    if (address) params = params.set('address', address);
    if (lat !== undefined) params = params.set('lat', lat.toString());
    if (lon !== undefined) params = params.set('lon', lon.toString());
    return this.http.get<any>(`${this.apiUrl}/map`, { params });
  }

  // Get nearby places for a location
  getNearbyPlaces(lat: number, lon: number, radius: number = 1000): Observable<any> {
    const params = new HttpParams()
      .set('lat', lat.toString())
      .set('lon', lon.toString())
      .set('radius', radius.toString());
    return this.http.get<any>(`${this.apiUrl}/map/nearby`, { params });
  }

  // delete guest
  deleteGuest(eventId: string, guestId: string) {
    return this.http.delete<{ message: string; id: string }>(`${this.apiUrl}/events/${eventId}/guests/${guestId}`);
  }

  // download CSV
downloadGuestsCsv(eventId: string, opts?: { dietary?: string; allergy?: string; rsvp?: boolean }) {
  let params = new HttpParams();
  if (opts?.dietary) params = params.set('dietary', opts.dietary);
  if (opts?.allergy) params = params.set('allergy', opts.allergy);
  if (typeof opts?.rsvp === 'boolean') params = params.set('rsvp', String(opts.rsvp));
  return this.http.get(`${this.apiUrl}/events/${eventId}/guests/export.csv`, {
    params,
    responseType: 'blob'
  });
}

  // download PDF
downloadGuestsPdf(eventId: string, opts?: { dietary?: string; allergy?: string; rsvp?: boolean }) {
  let params = new HttpParams();
  if (opts?.dietary) params = params.set('dietary', opts.dietary);
  if (opts?.allergy) params = params.set('allergy', opts.allergy);
  if (typeof opts?.rsvp === 'boolean') params = params.set('rsvp', String(opts.rsvp));
  return this.http.get(`${this.apiUrl}/events/${eventId}/guests/export.pdf`, {
    params,
    responseType: 'blob'
  });
}

  // download story PDF
  downloadStoryPdf(userId: string) {
    return this.http.get(`${this.apiUrl}/story/${userId}/export.pdf`, {
      responseType: 'blob'
    });
  }


  // Send guest invitation via external API
  sendGuestInvite(inviteData: {
    guestEmail: string;
    guestName: string;
    phone: string;
    extra: {};
  }): Observable<any> {
    return this.http.post(`${environment.externalApiUrl}/manager/send-guest-invite`, inviteData);
  }

  // Get guest invite page (might establish session)
  getGuestInvitePage(): Observable<any> {
    return this.http.get(`${environment.externalApiUrl}/manager/guest-invite`);
  }

  // Test different API formats
  testAPIFormats(guest: any): Observable<any>[] {
    const baseUrl = `${environment.externalApiUrl}/manager/send-guest-invite`;
    
    // Format 1: Original from Swagger
    const format1 = {
      guestEmail: guest.Email,
      guestName: guest.Name,
      Name: "Test Event",
      extra: guest.id
    };

    // Format 2: Minimal structure
    const format2 = {
      id: guest.id,
      email: guest.Email,
      name: guest.Name
    };

    // Format 3: Nested structure
    const format3 = {
      guest: {
        id: guest.id,
        email: guest.Email,
        name: guest.Name
      },
      event: "Test Event"
    };

    // Format 4: Array format
    const format4 = {
      guests: [{
        id: guest.id,
        guestEmail: guest.Email,
        guestName: guest.Name
      }],
      Name: "Test Event"
    };

    return [
      this.http.post(baseUrl, format1),
      this.http.post(baseUrl, format2),
      this.http.post(baseUrl, format3),
      this.http.post(baseUrl, format4)
    ];
  }

}
