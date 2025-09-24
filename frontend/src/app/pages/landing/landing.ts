import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/auth';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

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

  constructor(public auth: AuthService, private router:Router) {}

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

  //sign in with google for different user roles
    async signInAndRedirect(path: string) {
      try {
        await this.auth.signInWithGoogle();
        console.log('Google login successful');
        this.router.navigateByUrl(path);
      } catch (error) {
        console.error('Google login failed', error);
      }
    }

    onGoogleVendor() {
      this.signInAndRedirect('/vendors-company');
    }

    onGoogleVenue() {
      this.signInAndRedirect('/manageservices');
    }

    async onGoogleAdmin()
 {
      try
    {
        await this.auth.signInWithGoogle();

        const auth = getAuth();
        const user = auth.currentUser;

        if (!user?.email)
        {
          alert('No email found for logged-in user.');
          alert('You are not authoirized as an admin.');
          return;
        }

        const email = user.email.trim();
        console.log('Logged-in user email:', email);

        const db = this.auth.firestore();
        const adminDoc= await getDoc(doc(db,'admins',user.uid));

        if (adminDoc.exists())
        {
          console.log('Admin login successful');
          this.router.navigateByUrl('/admin');
        }
        else
        {
          console.log('Admin login failed: Unauthorized user');
          alert("You are not authoirized as an admin.");
          await this.auth.signOut();
        }

    }
      catch(error)
      {
      console.error('Admin login failed', error);
      }
  }

}
