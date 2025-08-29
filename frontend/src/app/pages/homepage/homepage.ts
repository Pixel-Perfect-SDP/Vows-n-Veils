import { Component, inject, OnInit, OnDestroy, PLATFORM_ID, NgZone, ChangeDetectorRef } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Firestore, collection, addDoc, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { AuthService } from '../../core/auth';
import { getFirestore } from 'firebase/firestore';
import { getApp } from 'firebase/app';

//New: Data service
import { DataService, Guest } from '../../core/data.service';

@Component({
  selector: 'app-homepage',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './homepage.html',
  styleUrls: ['./homepage.css']
})
export class Homepage {
  router = inject(Router);
  //db = inject(Firestore);
  auth = inject(AuthService);
  private formBuild = inject(FormBuilder);
  
  //New: Data service
  private dataService = inject(DataService);

  public hasEvent: boolean | null = null;
  public eventData: any = null;

  // NEW: UI state
  activeTab: 'overview' | 'guests' = 'overview';
  guests: Guest[] = [];
  guestsLoading = false;
  guestsError: string | null = null;
  
  form = this.formBuild.group({
    name1: ['', [Validators.required]],
    name2: ['', [Validators.required]],
    date: ['', [Validators.required]],
    time: ['', [Validators.required]],
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

  //check if user has an existing event
  async ngOnInit() {
    try{
      const user = await this.waitForUser();

      if (!user) {
        return;
      }

      const db = getFirestore(getApp());

      const docRef = doc(db, 'Events', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        this.hasEvent = true;
        this.eventData = docSnap.data();
      } else {
        this.hasEvent = false;
        this.eventData = null;
      }
    }
    catch(error){
      console.error("Error fetching event data: ", error);
      this.hasEvent = false;
      this.eventData = null;
    }
    
  }


  /*------------------------------user HAS event--------------------------*/
  // NEW: called by sidebar click
  async switchToGuests(e: Event) {
    e.preventDefault();
    this.activeTab = 'guests';
    await this.loadGuests();
  }

  // NEW: fetch guests from backend via DataService
  private async loadGuests() {
    this.guestsLoading = true;
    this.guestsError = null;
    this.guests = [];

    try {
      const user = await this.waitForUser();
      if (!user) {
        this.guestsLoading = false;
        this.guestsError = 'No authenticated user.';
        return;
      }

      const eventId = user.uid; // your Events doc id == uid
      this.dataService.getGuestsByEvent(eventId).subscribe({
        next: (guests) => {
          this.guests = guests ?? [];
          this.guestsLoading = false;
        },
        error: (err) => {
          console.error(err);
          this.guestsError = 'Failed to load guests';
          this.guestsLoading = false;
        }
      });
    } catch (e: any) {
      console.error(e);
      this.guestsError = e?.message ?? 'Unexpected error loading guests';
      this.guestsLoading = false;
    }
  }



  /*------------------------------user has NO event--------------------------*/
  //allow user to create one
  async createEvent() {
    if (this.form.invalid) {
      return;
    }

    const user = await this.waitForUser();
    if (!user) {
      return;
    }

    const db = getFirestore(getApp());
    const { name1, name2, date, time } = this.form.getRawValue();
    const docRef = doc(db, 'Events', user.uid);
    const dateTime = new Date(`${date}T${time}`);

    try {
        await setDoc(docRef, {
        Name1: this.form.value.name1,
        Name2: this.form.value.name2,
        Date_Time: dateTime,
        EventID: user.uid,
        RSVPcode: null,
        VendorID: null,
        VenueID: null,
      });

      this.hasEvent = true;
      const snap = await getDoc(docRef);
      this.eventData = snap.data();

      alert('Event successfully created!');
    }
    catch (error) {
      console.error('Error creating event: ', error);
      alert('Failed to create event. Please try again.');
    }


  }//createEvent
 }
