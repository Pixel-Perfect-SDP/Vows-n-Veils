import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot,
  query, serverTimestamp, setDoc, where
} from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { AuthService } from '../../core/auth';

@Component({
  selector: 'app-manageservices',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './manageservices.html',
  styleUrls: ['./manageservices.css']
})
export class Manageservices {
  router = inject(Router);
  auth = inject(AuthService);
  
  public hasVenueCompany: boolean | null = null; 
  public companyVenueData: any = null; 
  private formBuild = inject(FormBuilder);

  form = this.formBuild.group({ 
    companyName: ['', [Validators.required]], 
    companyEmail: ['', [Validators.required, Validators.email]], 
    companyNumber: ['', [Validators.required, Validators.pattern('^[0-9+ ]+$')]], 
  });

  private waitForUser(): Promise<any> {
    return new Promise((resolve) => {
      const user = this.auth.user();
      if (user) resolve(user);

      const check = setInterval(() => {
        const u = this.auth.user();
        if (u) {
          clearInterval(check);
          resolve(u);
        }
      }, 50);

      setTimeout(() => {
        clearInterval(check);
        resolve(null);
      }, 5000); // timeout after 5s
    });
  }

  //check if user has an existing company with type venue 
  async ngOnInit() {
    try {
      const user = await this.waitForUser();
      if (!user) return;

      const db = getFirestore(getApp());
      const docRef = doc(db, 'CompaniesVenues', user.uid);
      const docSnap = await getDoc(docRef);

      //if the company exists, check if type venue
      if (docSnap.exists()) {
        this.companyVenueData = docSnap.data();
        if (this.companyVenueData.type === 'venue') {
          this.hasVenueCompany = true;
        } else {
          this.hasVenueCompany = false;
          this.companyVenueData = null;
        }
      } else {
        this.hasVenueCompany = false;
        this.companyVenueData = null;
      }
    } catch (error) {
      console.error('Error fetching company data: ', error);
      this.hasVenueCompany = false;
      this.companyVenueData = null;
    }
  }//ngonInit

//if no venue company, allow user to create one
  async createVenueCompany() {
    if (this.form.invalid) {
      return;
    }

    const user = await this.waitForUser();
    if (!user) {
      return;
    }

    const db = getFirestore(getApp());
    const { companyName, companyEmail, companyNumber } = this.form.getRawValue();

    const docRef = doc(db, 'CompaniesVenues', user.uid);

    try {
      await setDoc(docRef, {
        userID: user.uid, 
        companyName: this.form.value.companyName, 
        email: this.form.value.companyEmail, 
        phoneNumber: this.form.value.companyNumber, 
        type: 'venue',
      });

      this.hasVenueCompany = true;
      const snap = await getDoc(docRef);
      this.companyVenueData = snap.data();

      alert('Venue Company created successfully!');
    } catch (e) {
      console.error('Error adding document: ', e);
      alert('Error creating your Venue Company.');
    }
  }
}
