import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Chatbot } from './pages/chatbot/chatbot';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet,Chatbot, HttpClientModule],
  template: `
    <router-outlet></router-outlet>
    <app-chatbot></app-chatbot>
  `
})
export class AppComponent {}
