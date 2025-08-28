import { Component, inject, OnInit, OnDestroy, PLATFORM_ID, NgZone, ChangeDetectorRef } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Firestore, collection, addDoc, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { AuthService } from '../../core/auth';
import { getFirestore } from 'firebase/firestore';
import { getApp } from 'firebase/app';

@Component({
  selector: 'app-vendors-company',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './vendors-company.html',
  styleUrls: ['./vendors-company.css']
})
export class VendorsCompany {
   router = inject(Router);
   auth = inject(AuthService);

  public hasVendorCompany: boolean | null = null;
  public companyVendorData: any = null;
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

  //check if user has an existing company with type vendor
  async ngOnInit() {
    try{
      const user = await this.waitForUser();

      if (!user) {
        return;
      }

      const db = getFirestore(getApp());

      const docRef = doc(db, 'Companies', user.uid);
      const docSnap = await getDoc(docRef);

      //if the company exists check if it is vendor
      if (docSnap.exists()) {
        this.companyVendorData = docSnap.data();

        if(this.companyVendorData.type === 'vendor'){
          this.hasVendorCompany = true;
        } else {
          this.hasVendorCompany = false;
          this.companyVendorData = null;
        }
      } 
      else {
        this.hasVendorCompany = false;
        this.companyVendorData = null;
      }
    }
    catch(error){
      console.error("Error fetching event data: ", error);
      this.hasVendorCompany = false;
      this.companyVendorData = null;
    }
  }//ngOnInit


  //if no vendor company, allow user to create one
  async createVendorCompany() {
    if (this.form.invalid) {
      return;
    }

    const user = await this.waitForUser();
    if (!user) {
      return;
    }

    const db = getFirestore(getApp());
    const { companyName, companyEmail, companyNumber} = this.form.getRawValue();
    const docRef = doc(db, 'Companies', user.uid);


    try {
      await setDoc(docRef, {
        userID: user.uid,
        companyName: this.form.value.companyName,
        email: this.form.value.companyEmail,
        phoneNumber: this.form.value.companyNumber,
        type: 'vendor',
      });

      this.hasVendorCompany = true;
      const snap = await getDoc(docRef);
      this.companyVendorData = snap.data();

      alert("Vendor Company created successfully!");
    } catch (e) {
      console.error("Error adding document: ", e);
      alert("Error creating your Vendor Company.");
    }
  }//createVendorCompany


  
}
