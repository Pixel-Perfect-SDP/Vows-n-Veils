import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Firestore, collection, addDoc, doc, getDoc, setDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { auth } from '../firebase/firebase-config';
import { signOut } from 'firebase/auth';
import { AuthService } from '../../core/auth';
import { getFirestore } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { FormGroup, FormControl, FormsModule, AbstractControl  } from '@angular/forms';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { DataService} from '../../core/data.service';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';



@Component({
  selector: 'app-story',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule, DragDropModule],
  templateUrl: './story.html',
  styleUrls: ['./story.css']
})
export class Story {
  router = inject(Router);
  auth = inject(AuthService);
  private dataService = inject(DataService);

  private formBuild = inject(FormBuilder);

  public hasStory : boolean | null = null;
  public storyData: any = null;
   private originalStory: any = null; 

    uploadingImage = false;

    form = this.formBuild.group({
      howWeMet: ['', [Validators.required]],
      photoURL: [''],
      proposal: ['', [Validators.required]],
      userID: [''],
      timeline: this.formBuild.array([])
    });

    get timeline() {
      return this.form.get('timeline') as FormArray;
    }

        
    addTimelineEntry() {
      if (this.timeline.length >= 5) {
        alert("You can only have 5 milestones.");
        return;
      }
      this.timeline.push(this.formBuild.group({
        title: ['', Validators.required],
        description: ['', Validators.required]
      }));
    }

    removeTimelineEntry(index: number) {
      this.timeline.removeAt(index);
    }


     drop(event: CdkDragDrop<AbstractControl[]>) {
  moveItemInArray(this.timeline.controls, event.previousIndex, event.currentIndex);

  const updatedTimeline = this.timeline.controls.map(ctrl => ({
    title: ctrl.get('title')?.value,
    description: ctrl.get('description')?.value
  }));

  this.saveTimelineOrder(updatedTimeline);
}


private async saveTimelineOrder(timelineData: { title: string; description: string }[]) {
  const user = await this.waitForUser();
  if (!user) return;

  const db = getFirestore(getApp());
  const docRef = doc(db, 'Story', user.uid);

  try {
    await setDoc(docRef, { timeline: timelineData }, { merge: true });
    console.log('Timeline order updated in Firebase');
  } catch (err) {
    console.error('Failed to update timeline order', err);
  }
}






    trackByIndex(index: number, item: AbstractControl) {
      return index;
    }




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
      }, 5000); 
    });
  }




  //check if user has an existing story
  async ngOnInit() {
    try {
      const user = await this.waitForUser();
      if (!user) {
        return;
      }

      const db = getFirestore(getApp());
      const docRef = doc(db, 'Story', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        this.hasStory = true;
        this.storyData = docSnap.data();

        this.timeline.clear();

        if (this.storyData.timeline?.length) {
        this.storyData.timeline.forEach((t: any) => this.timeline.push(this.formBuild.group({
          title: [t.title, Validators.required],
          description: [t.description, Validators.required]
        })));
      }

        this.form.patchValue(this.storyData);


        this.originalStory = { ...this.storyData };

        
      }
      else {
        this.hasStory = false;
        this.storyData = null;
      }

    } catch (error) {
      console.error("Error checking story: ", error);
      this.hasStory = false;
      this.storyData = null;
    }
  }//onInit



  //allow user to create/update their story
  async saveStory(){

    if (this.form.invalid) {
      return;
    }

    const user = await this.waitForUser();
    if (!user) {
      return;
    }

    const db = getFirestore(getApp());
    let photoURL = this.form.value.photoURL || null;

    const docRef = doc(db, 'Story', user.uid);

     const timelineData = this.timeline.controls.map(ctrl => ({
    title: ctrl.get('title')?.value,
    description: ctrl.get('description')?.value
  }));

    try{
      await setDoc(docRef, {
        howWeMet: this.form.value.howWeMet,
        photoURL: this.form.value.photoURL,
        proposal: this.form.value.proposal,
        userID: user.uid,
        timeline: timelineData,
      }
      , { merge: true }
    );

      this.hasStory = true;
      const snap = await getDoc(docRef);
      this.storyData = snap.data();

      this.originalStory = { ...this.storyData }; 

      alert("Story saved successfully!");
    }
    catch(error){
      console.error("Error creating story: ", error);
      alert("Error creating story. Please try again.");
    }


  }

    cancelEdit() {
    if (this.originalStory) {
      this.form.patchValue(this.originalStory);
    }
  }


   private saveBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }


   async exportPdf() {
    const user = await this.waitForUser();
    if (!user) return;

    const userId = user.uid;

    this.dataService.downloadStoryPdf(userId).subscribe({
      next: (blob: Blob) => {
        this.saveBlob(blob, 'our-story.pdf');
      },
      error: (err) => {
        console.error('PDF export failed', err);
        alert('Failed to export PDF. Please make sure the backend route exists.');
      }
    });
  }




  //allow user to upload a photo
  

}