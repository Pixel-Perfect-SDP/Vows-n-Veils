import { Component, inject } from '@angular/core';
import { Firestore, doc, setDoc, getDoc, getFirestore, collection, query, where } from '@angular/fire/firestore';
import { getApp } from 'firebase/app';
import { getDocs, updateDoc } from '@angular/fire/firestore';
import { AuthService } from '../../core/auth';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component
(
  {
  selector: 'app-rsvp',
  templateUrl: './rsvp.html',
  styleUrls: ['./rsvp.css'],
  standalone:true,
  imports: [FormsModule, CommonModule]
  }
)

export class Rsvp
{
  // Inject services
  private auth = inject(AuthService);
  private db: Firestore = inject(Firestore);
  private router=inject(Router);

  // Form data
  formData =
  {
    guestID:'',
    Name: '',
    Surname: '',
    Email: '',
    Attending:'',
    Diet: 'None',
    otherDiet: '',
    Allergy: 'None',
    Song: ''
  };

  message = '';
  eventId: string = '';
  eventIdEntered: boolean = false;

  constructor() {}


  // Form submission
  async onSubmit()
  {
    try
    {

      // Determine final diet
      const finalDiet = this.formData.otherDiet.trim()
        ? this.formData.otherDiet
        : this.formData.Diet;

        const fullname = this.formData.Surname.trim()
        ? this.formData.Name.trim() + ' ' + this.formData.Surname.trim()
        : this.formData.Name.trim();

      let attendance;
      if (this.formData.Attending =="Yes")
      {
        attendance=true;
      }
      else
      {
        attendance=false;
      }

        const submitData =
        {
        Email: this.formData.Email,
        Dietary: finalDiet,
        Allergies: this.formData.Allergy,
        Song: this.formData.Song,
        RSVPstatus: attendance
      };

      const rsvpCollection = collection(this.db, 'Guests');


      //query for matching name and surname

      if (fullname.trim()=='')
      {
        this.message = 'Please enter your full name ❌';
        alert('Name field cannot be empty ❌');
        return;
      }
      const q=query
      (
        rsvpCollection,
        where('Name','==',fullname),
        where('EventID','==',this.eventId)
      );

      const querySnapshot=await getDocs(q);

      if (!querySnapshot.empty)
      {
        const docRef=doc(this.db,'Guests',querySnapshot.docs[0].id);
        await updateDoc(docRef,submitData);
        this.message=('RSVP updated successfully ✅');
        alert('You are successfully RSVPed ✅');

        setTimeout(() => {
          this.router.navigate(['/landing']);
        }, 2000);


      }
      else
      {
        this.message=('Guest not apart of wedding party ❌');
        alert('The name you entered is not apart of the wedding party❌');
      }



    }
    catch(err)
    {
      console.error(err);
    this.message = 'Something went wrong ❌';
    }
  }

  async submitEventId()
  {
    if (!this.eventId.trim()) {
      alert("Please enter a valid Event ID");
      return;
    }

    try {
      const guestsCollection = collection(this.db, "Guests");
      const q = query(guestsCollection, where("EventID", "==", this.eventId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        this.eventIdEntered = true;
        this.message = '';
      } else {
        this.eventIdEntered = false;
        this.message = 'Event ID not found ❌';
        alert('Event ID not found. Please try again');
        this.eventId = '';
      }
    } catch (err) {
      console.error(err);
      this.eventIdEntered = false;
      this.message = 'Error checking Event ID ❌';
    }
  }

}
