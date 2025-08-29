// e.g. frontend/src/app/core/data.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface Guest {
  id?: string;
  Name: string;
  Email: string;
  Dietary: string;
  Allergies: string;
  RSVPstatus: string;
  Song: string;
  EventID: string;
}

@Injectable({ providedIn: 'root' })
export class DataService {
  private apiUrl = environment.apiUrl; // e.g. http://localhost:3000/api
  //private apiUrl = `https://site--vowsandveils--5dl8fyl4jyqm.code.run`

  constructor(private http: HttpClient) {}

  postUserLogin(user: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/login`, user);
  }

  getEmails(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/users/emails`);
  }

  // NEW: guests by event
  getGuestsByEvent(eventId: string): Observable<Guest[]> {
    return this.http.get<Guest[]>(`${this.apiUrl}/events/${eventId}/guests`);
  }
}
