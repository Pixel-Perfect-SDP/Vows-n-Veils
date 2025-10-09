import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe, NgClass } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { getAuth, User } from 'firebase/auth';
import { getApp } from 'firebase/app';
import { Router } from '@angular/router';

interface Notification {
  id: string;
  from?: string;
  message?: string;
  date?: any;
  read: boolean;
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, NgClass, DatePipe, HttpClientModule],
  templateUrl: './notifications.html',
  styleUrls: ['./notifications.css']
})
export class Notifications implements OnInit {
  notifications: Notification[] = [];
  user: User | null = getAuth(getApp()).currentUser;

  constructor(private router: Router, private http: HttpClient) { }


async ngOnInit() {
  console.log('Notifications component initialized');

  if (!this.user) {
    console.warn('No user logged in, cannot fetch notifications');
    return;
  }
  console.log('Logged in user:', this.user.uid);

  try {
    const apiUrl = `https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues/notifications/${this.user.uid}`;
    const response: any = await this.http.get(apiUrl).toPromise();

    this.notifications = response.notifications || [];
    console.log(`Fetched ${this.notifications.length} notifications`);

    this.notifications.sort((a, b) => Number(a.read) - Number(b.read));

    const unread = this.notifications.filter(n => !n.read);
    if (unread.length > 0) {
      await Promise.all(
        unread.map(n =>
          this.http.put(
            `https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues/notifications/${n.id}/read`,
            {}
          ).toPromise()
        )
      );
     // this.notifications.forEach(n => (n.read = true));
    }

    this.notifications = this.notifications.map((n: any) => ({
      ...n,
      date: n.date && n.date.toDate ? n.date.toDate() : new Date(n.date)
    }));

    console.log('Notifications fetched and updated:', this.notifications);
  } catch (err) {
    console.error('Error fetching notifications from API:', err);
  }
}

  backhome(): void {
  const from = history.state.from;
  if (from) {
    this.router.navigateByUrl(from);
  } else {
    this.router.navigate(['/landing']);
  } 
 }
}
