import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/auth';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './landing.html',
  styleUrls: ['./landing.css']
})
export class Landing {
  loading = false;
  docs: any[] = [];
  year = new Date().getFullYear();

  companiesPopup=false;

  constructor(public auth: AuthService) {}

  async loadRecent() {
    this.loading = true;
    try {
      const db = this.auth.firestore();
      const q = query(collection(db, 'test-users'), orderBy('createdAt', 'desc'), limit(5));
      const snap = await getDocs(q);
      this.docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } finally {
      this.loading = false;
    }
  }

    toggleCompaniesPopup() {
    this.companiesPopup = !this.companiesPopup;
  }
}
