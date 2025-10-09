import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { catchError, map, of } from 'rxjs';
import { environmentcb } from '../../../environments/environment';

interface FAQ {
  id: number;
  question: string;
  answer: string;
  keywords: string[];
}

interface ChatMessage {
  text: string;
  isUser: boolean;
  timestamp: Date;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './chatbot.html',
  styleUrls: ['./chatbot.css']
})

export class Chatbot implements OnInit {
  isOpen = true;
  isMinimized = false;
  messages: ChatMessage[] = [];
  userInput = '';
  faqs: FAQ[] = [];
  isLoading = false;

  private huggingFaceApiUrl = 'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2';

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.loadFAQs();
        console.log('Chatbot loaded'); // check console


  }

  private loadFAQs(): void {
  this.http.get<{ faqs: FAQ[] }>('/assets/faq.json').subscribe({
    next: (data) => {
      this.faqs = data.faqs;
      this.addBotMessage('Hello! How can I help you today? Click on a question below or type your own.');
    },
    error: (error) => {
      console.error('Error loading FAQs:', error);
      this.addBotMessage('Sorry, I had trouble loading the FAQ data.');
    }
  });
}

  toggleChat(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.isMinimized = false;
    }
  }

  minimizeChat(): void {
    this.isMinimized = !this.isMinimized;
  }

  closeChat(): void {
    this.isOpen = false;
    this.isMinimized = false;
  }

  selectFAQ(faq: FAQ): void {
    this.addUserMessage(faq.question);
    this.addBotMessage(faq.answer);
  }

  sendMessage(): void {
    if (!this.userInput.trim() || this.isLoading) {
      return;
    }

    const question = this.userInput.trim();
    this.addUserMessage(question);
    this.userInput = '';
    this.isLoading = true;

    // First try keyword matching
    const keywordMatch = this.searchByKeywords(question);
    if (keywordMatch) {
      this.addBotMessage(keywordMatch.answer);
      this.isLoading = false;
      return;
    }

    // If no keyword match, use AI
    this.findAnswerWithAI(question);
  }

  private searchByKeywords(userInput: string): FAQ | null {
    const lowerInput = userInput.toLowerCase();

    for (const faq of this.faqs) {
      // Check if any keyword matches
      if (faq.keywords.some(keyword => lowerInput.includes(keyword.toLowerCase()))) {
        return faq;
      }

      // Check if question partially matches
      if (faq.question.toLowerCase().includes(lowerInput) ||
        lowerInput.includes(faq.question.toLowerCase())) {
        return faq;
      }
    }

    return null;
  }

  private findAnswerWithAI(userQuestion: string): void {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${environmentcb.huggingFaceApiKey}`,
      'Content-Type': 'application/json'
    });

    this.http.post<any>(
      this.huggingFaceApiUrl,
      {
        inputs: {
          source_sentence: userQuestion,
          sentences: this.faqs.map(faq => faq.question)
        }
      },
      { headers }
    ).pipe(
      map(response => {
        const scores = response;
        let maxScore = -1;
        let bestMatchIndex = 0;

        scores.forEach((score: number, index: number) => {
          if (score > maxScore) {
            maxScore = score;
            bestMatchIndex = index;
          }
        });

        if (maxScore < 0.3) {
          return "I'm sorry, I couldn't find a relevant answer to your question. Please try rephrasing or contact our support team for assistance.";
        }

        return this.faqs[bestMatchIndex].answer;
      }),
      catchError(error => {
        console.error('Error calling Hugging Face API:', error);
        return of("I'm having trouble processing your question right now. Please try again or contact support.");
      })
    ).subscribe({
      next: (answer) => {
        this.addBotMessage(answer);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error:', error);
        this.addBotMessage('Sorry, I encountered an error. Please try again.');
        this.isLoading = false;
      }
    });
  }

  private addUserMessage(text: string): void {
    this.messages.push({
      text,
      isUser: true,
      timestamp: new Date()
    });
  }

  private addBotMessage(text: string): void {
    this.messages.push({
      text,
      isUser: false,
      timestamp: new Date()
    });
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
}
