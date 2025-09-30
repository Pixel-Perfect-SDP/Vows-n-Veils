import { Component} from '@angular/core';
import { DataService } from '../../core/data.service';

@Component({
  selector: 'app-guest-list',
  imports: [],
  templateUrl: './guest-list.html',
  styleUrls:[ './guest-list.css']
})
export class GuestList {

  constructor(private dataService: DataService) {}

  // Example method to send a guest invitation
  sendInvitation(guestEmail: string, guestName: string) {
    const inviteData = {
      guestEmail: guestEmail,
      guestName: guestName,
      phone: "+2771234567", // Placeholder phone number
      extra: {} // Empty object exactly as specified
    };

    this.dataService.sendGuestInvite(inviteData).subscribe({
      next: (response) => {
        console.log('Invitation sent successfully:', response);
        // Handle success (show success message, update UI, etc.)
        alert('Invitation sent successfully!');
      },
      error: (error) => {
        console.error('Error sending invitation:', error);
        // Handle error (show error message, etc.)
        alert('Failed to send invitation. Please try again.');
      }
    });
  }

}
