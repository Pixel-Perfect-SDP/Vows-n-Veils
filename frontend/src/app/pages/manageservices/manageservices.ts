import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-manageservices',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './manageservices.html',
  styleUrls: ['./manageservices.css']
})
export class Manageservices {

  selected: string | null = null;

  select(option: string) {
    this.selected = option;
  }
}
