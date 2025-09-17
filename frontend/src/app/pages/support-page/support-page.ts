import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-support-page',
  imports: [CommonModule, FormsModule, RouterModule],
  standalone: true,
  templateUrl: './support-page.html',
  styleUrls: ['./support-page.css']
})
export class SupportPage {
   selectedSection: string | null = null;
   searchTerm: string = '';

  // selectSection(section: string) {
  //   this.selectedSection = section;
  // }

  selectSection(section: string) {
    this.selectedSection = section;
    this.searchTerm = ''; 
  }

  goBack() {
    this.selectedSection = null;
    this.searchTerm='';
  }

  matchesSearch(text: string): boolean {
    if (!this.searchTerm) return true;
    return text.toLowerCase().includes(this.searchTerm.toLowerCase());
  }


}
