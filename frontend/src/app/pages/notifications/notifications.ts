import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe, NgClass } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { getAuth, User } from 'firebase/auth';
import { getApp } from 'firebase/app';

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
  private http = inject(HttpClient);

  async ngOnInit() {
    console.log('Notifications component initialized');

    if (!this.user) {
      console.warn('No user logged in, cannot fetch notifications');
      return;
    }
    console.log('Logged in user:', this.user.uid);

    try {
      const apiUrl = `https://https://site--vowsandveils--5dl8fyl4jyqm.code.run/notifications/${this.user.uid}`;
      const response: any = await this.http.get(apiUrl).toPromise();

      this.notifications = response.notifications || [];
      console.log(`Fetched ${this.notifications.length} notifications`);

      this.notifications.sort((a, b) => Number(a.read) - Number(b.read));

      const unread = this.notifications.filter(n => !n.read);
      if (unread.length > 0) {
        await Promise.all(
          unread.map(n =>
            this.http.put(`https://https://site--vowsandveils--5dl8fyl4jyqm.code.run/venues/notifications/${n.id}/read`, {}).toPromise()
          )
        );
        this.notifications.forEach(n => n.read = true);
      }

      console.log('Notifications fetched and updated:', this.notifications);

    } catch (err) {
      console.error('Error fetching notifications from API:', err);
    }
  }
}
