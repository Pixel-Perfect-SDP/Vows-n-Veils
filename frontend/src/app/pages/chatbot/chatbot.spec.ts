import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { Chatbot } from './chatbot';
import { of, throwError } from 'rxjs';

describe('Chatbot', () => {
  let component: Chatbot;
  let fixture: ComponentFixture<Chatbot>;
  let httpMock: HttpTestingController;
  let httpClientSpy: { post: jasmine.Spy };

  const mockFAQData = {
    faqs: [
      {
        id: 1,
        question: 'How do I start planning my wedding?',
        answer: 'Sign in using Google and fill in basic wedding details.',
        keywords: ['start', 'planning', 'wedding']
      },
      {
        id: 2,
        question: 'How do I add guests?',
        answer: 'Go to your dashboard and select Guests on the sidebar.',
        keywords: ['guests', 'add', 'dashboard']
      },
      {
        id: 3,
        question: 'How do I create an invitation?',
        answer: 'Go to your dashboard and select Invitations.',
        keywords: ['invitation', 'create']
      }
    ]
  };

  beforeEach(async () => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['post']);
    
    await TestBed.configureTestingModule({
      imports: [Chatbot, HttpClientTestingModule, FormsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(Chatbot);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    
    // Override the http property with our spy
    (component as any).http = httpClientSpy;
    
    // Don't call fixture.detectChanges() here to prevent ngOnInit
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should call loadFAQs on initialization', () => {
      spyOn(component, 'loadFAQs');
      component.ngOnInit();
      expect(component.loadFAQs).toHaveBeenCalled();
    });

    it('should log to console', () => {
      spyOn(console, 'log');
      component.ngOnInit();
      
      const req = httpMock.expectOne('/assets/faq.json');
      req.flush(mockFAQData);
      
      expect(console.log).toHaveBeenCalledWith('Chatbot loaded');
    });
  });

  describe('loadFAQs', () => {
    it('should load FAQs successfully', () => {
      component.loadFAQs();

      const req = httpMock.expectOne('/assets/faq.json');
      expect(req.request.method).toBe('GET');
      req.flush(mockFAQData);

      expect(component.faqs).toEqual(mockFAQData.faqs);
      expect(component.messages.length).toBe(1);
      expect(component.messages[0].text).toBe('Hello! How can I help you today? ');
      expect(component.messages[0].isUser).toBe(false);
    });

    it('should handle error when loading FAQs', () => {
      spyOn(console, 'error');
      component.loadFAQs();

      const req = httpMock.expectOne('/assets/faq.json');
      req.error(new ProgressEvent('error'), { status: 500, statusText: 'Server Error' });

      expect(console.error).toHaveBeenCalled();
      expect(component.messages[0].text).toBe('Sorry, I had trouble loading the FAQ data.');
    });
  });

  describe('toggleChat', () => {
    it('should toggle isOpen from false to true', () => {
      component.isOpen = false;
      component.toggleChat();
      expect(component.isOpen).toBe(true);
    });

    it('should toggle isOpen from true to false', () => {
      component.isOpen = true;
      component.toggleChat();
      expect(component.isOpen).toBe(false);
    });

    it('should set isMinimized to false when opening chat', () => {
      component.isOpen = false;
      component.isMinimized = true;
      component.toggleChat();
      expect(component.isMinimized).toBe(false);
    });
  });

  describe('minimizeChat', () => {
    it('should toggle isMinimized from false to true', () => {
      component.isMinimized = false;
      component.minimizeChat();
      expect(component.isMinimized).toBe(true);
    });

    it('should toggle isMinimized from true to false', () => {
      component.isMinimized = true;
      component.minimizeChat();
      expect(component.isMinimized).toBe(false);
    });
  });

  describe('closeChat', () => {
    it('should set isOpen to false', () => {
      component.isOpen = true;
      component.closeChat();
      expect(component.isOpen).toBe(false);
    });

    it('should set isMinimized to false', () => {
      component.isMinimized = true;
      component.closeChat();
      expect(component.isMinimized).toBe(false);
    });
  });

  describe('selectFAQ', () => {
    it('should add user message and bot response', () => {
      const faq = mockFAQData.faqs[0];
      component.selectFAQ(faq);

      expect(component.messages.length).toBe(2);
      expect(component.messages[0].text).toBe(faq.question);
      expect(component.messages[0].isUser).toBe(true);
      expect(component.messages[1].text).toBe(faq.answer);
      expect(component.messages[1].isUser).toBe(false);
    });
  });

  describe('sendMessage', () => {
    beforeEach(() => {
      component.faqs = mockFAQData.faqs;
    });

    it('should not send message if input is empty', () => {
      component.userInput = '';
      const initialLength = component.messages.length;
      component.sendMessage();
      expect(component.messages.length).toBe(initialLength);
    });

    it('should not send message if input is only whitespace', () => {
      component.userInput = '   ';
      const initialLength = component.messages.length;
      component.sendMessage();
      expect(component.messages.length).toBe(initialLength);
    });

    it('should not send message if isLoading is true', () => {
      component.userInput = 'test';
      component.isLoading = true;
      const initialLength = component.messages.length;
      component.sendMessage();
      expect(component.messages.length).toBe(initialLength);
    });

    it('should send message and find keyword match', () => {
      component.userInput = 'How do I add guests?';
      component.sendMessage();

      expect(component.messages.length).toBe(2);
      expect(component.messages[0].text).toBe('How do I add guests?');
      expect(component.messages[0].isUser).toBe(true);
      expect(component.messages[1].text).toBe('Go to your dashboard and select Guests on the sidebar.');
      expect(component.isLoading).toBe(false);
      expect(component.userInput).toBe('');
    });

    it('should call findAnswerWithAI if no keyword match found', () => {
      spyOn(component, 'findAnswerWithAI');
      component.userInput = 'some random question';
      component.sendMessage();

      expect(component.findAnswerWithAI).toHaveBeenCalledWith('some random question');
      expect(component.isLoading).toBe(true);
    });
  });

  describe('searchByKeywords', () => {
    beforeEach(() => {
      component.faqs = mockFAQData.faqs;
    });

    it('should find FAQ by keyword match', () => {
      const result = component.searchByKeywords('I want to add guests');
      expect(result).toBeTruthy();
      expect(result?.id).toBe(2);
    });

    it('should find FAQ by partial question match', () => {
      const result = component.searchByKeywords('start planning');
      expect(result).toBeTruthy();
      expect(result?.id).toBe(1);
    });

    it('should find FAQ when input contains question', () => {
      const result = component.searchByKeywords('Tell me how do I create an invitation please');
      expect(result).toBeTruthy();
      expect(result?.id).toBe(3);
    });

    it('should return null if no match found', () => {
      const result = component.searchByKeywords('completely unrelated question');
      expect(result).toBeNull();
    });

    it('should handle case-insensitive keyword matching', () => {
      const result = component.searchByKeywords('GUESTS');
      expect(result).toBeTruthy();
      expect(result?.id).toBe(2);
    });
  });

  describe('findAnswerWithAI', () => {
    beforeEach(() => {
      component.faqs = mockFAQData.faqs;
    });

    it('should find best match with high score', () => {
      const userQuestion = 'How to plan wedding?';
      
      // Use the spy instead of expecting a real HTTP request
      httpClientSpy.post.and.returnValue(of({ scores: [0.8, 0.3, 0.2] }));
      
      component.findAnswerWithAI(userQuestion);

      expect(httpClientSpy.post).toHaveBeenCalledWith(
        'https://site--vowsandveils--5dl8fyl4jyqm.code.run/chatbot/answer',
        {
          question: userQuestion,
          faqQuestions: mockFAQData.faqs.map(f => f.question)
        }
      );

      expect(component.messages[component.messages.length - 1].text)
        .toBe('Sign in using Google and fill in basic wedding details.');
      expect(component.isLoading).toBe(false);
    });

    it('should return default message when score is below threshold', () => {
      const userQuestion = 'Random question';
      
      // Use the spy instead of expecting a real HTTP request
      httpClientSpy.post.and.returnValue(of({ scores: [0.1, 0.15, 0.2] }));
      
      component.findAnswerWithAI(userQuestion);

      expect(httpClientSpy.post).toHaveBeenCalledWith(
        'https://site--vowsandveils--5dl8fyl4jyqm.code.run/chatbot/answer',
        {
          question: userQuestion,
          faqQuestions: mockFAQData.faqs.map(f => f.question)
        }
      );

      expect(component.messages[component.messages.length - 1].text)
        .toBe("I'm sorry, I couldn't find a relevant answer to your question. Please try rephrasing or contact our support team for assistance.");
      expect(component.isLoading).toBe(false);
    });

    it('should handle HTTP error', () => {
      spyOn(console, 'error');
      const userQuestion = 'Test question';
      
      // Use the spy instead of expecting a real HTTP request
      httpClientSpy.post.and.returnValue(throwError(() => new Error('Server Error')));
      
      component.findAnswerWithAI(userQuestion);

      expect(httpClientSpy.post).toHaveBeenCalledWith(
        'https://site--vowsandveils--5dl8fyl4jyqm.code.run/chatbot/answer',
        {
          question: userQuestion,
          faqQuestions: mockFAQData.faqs.map(f => f.question)
        }
      );

      expect(console.error).toHaveBeenCalled();
      expect(component.messages[component.messages.length - 1].text)
        .toBe("I'm having trouble processing your question right now. Please try again or contact support.");
      expect(component.isLoading).toBe(false);
    });

    it('should handle subscribe error', () => {
      spyOn(console, 'error');
      const userQuestion = 'Test question';
      
      // Use the spy instead of expecting a real HTTP request
      httpClientSpy.post.and.returnValue(throwError(() => new Error('Subscribe error')));
      
      component.findAnswerWithAI(userQuestion);

      expect(httpClientSpy.post).toHaveBeenCalledWith(
        'https://site--vowsandveils--5dl8fyl4jyqm.code.run/chatbot/answer',
        {
          question: userQuestion,
          faqQuestions: mockFAQData.faqs.map(f => f.question)
        }
      );

      expect(console.error).toHaveBeenCalled();
      expect(component.messages[component.messages.length - 1].text)
        .toBe("I'm having trouble processing your question right now. Please try again or contact support.");
      expect(component.isLoading).toBe(false);
    });

    it('should handle exactly threshold score (0.3)', () => {
      const userQuestion = 'Test';
      
      // Use the spy instead of expecting a real HTTP request
      httpClientSpy.post.and.returnValue(of({ scores: [0.3, 0.2, 0.1] }));
      
      component.findAnswerWithAI(userQuestion);

      expect(httpClientSpy.post).toHaveBeenCalledWith(
        'https://site--vowsandveils--5dl8fyl4jyqm.code.run/chatbot/answer',
        {
          question: userQuestion,
          faqQuestions: mockFAQData.faqs.map(f => f.question)
        }
      );

      expect(component.messages[component.messages.length - 1].text)
        .toBe('Sign in using Google and fill in basic wedding details.');
    });

    it('should find best match when multiple scores are close', () => {
      const userQuestion = 'Test';
      
      // Use the spy instead of expecting a real HTTP request
      httpClientSpy.post.and.returnValue(of({ scores: [0.45, 0.5, 0.48] }));
      
      component.findAnswerWithAI(userQuestion);

      expect(httpClientSpy.post).toHaveBeenCalledWith(
        'https://site--vowsandveils--5dl8fyl4jyqm.code.run/chatbot/answer',
        {
          question: userQuestion,
          faqQuestions: mockFAQData.faqs.map(f => f.question)
        }
      );

      expect(component.messages[component.messages.length - 1].text)
        .toBe('Go to your dashboard and select Guests on the sidebar.');
    });
  });

  describe('addUserMessage', () => {
    it('should add user message to messages array', () => {
      const text = 'Test user message';
      const initialLength = component.messages.length;
      component.addUserMessage(text);

      expect(component.messages.length).toBe(initialLength + 1);
      expect(component.messages[component.messages.length - 1].text).toBe(text);
      expect(component.messages[component.messages.length - 1].isUser).toBe(true);
      expect(component.messages[component.messages.length - 1].timestamp).toBeInstanceOf(Date);
    });
  });

  describe('addBotMessage', () => {
    it('should add bot message to messages array', () => {
      const text = 'Test bot message';
      const initialLength = component.messages.length;
      component.addBotMessage(text);

      expect(component.messages.length).toBe(initialLength + 1);
      expect(component.messages[component.messages.length - 1].text).toBe(text);
      expect(component.messages[component.messages.length - 1].isUser).toBe(false);
      expect(component.messages[component.messages.length - 1].timestamp).toBeInstanceOf(Date);
    });
  });

  describe('onKeyPress', () => {
    it('should call sendMessage when Enter key is pressed', () => {
      spyOn(component, 'sendMessage');
      const event = new KeyboardEvent('keypress', { key: 'Enter', shiftKey: false });
      spyOn(event, 'preventDefault');

      component.onKeyPress(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.sendMessage).toHaveBeenCalled();
    });

    it('should not call sendMessage when Shift+Enter is pressed', () => {
      spyOn(component, 'sendMessage');
      const event = new KeyboardEvent('keypress', { key: 'Enter', shiftKey: true });
      spyOn(event, 'preventDefault');

      component.onKeyPress(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(component.sendMessage).not.toHaveBeenCalled();
    });

    it('should not call sendMessage when other keys are pressed', () => {
      spyOn(component, 'sendMessage');
      const event = new KeyboardEvent('keypress', { key: 'a' });

      component.onKeyPress(event);

      expect(component.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('backtofaq', () => {
    it('should clear messages and add welcome message', () => {
      component.messages = [
        { text: 'Old message 1', isUser: true, timestamp: new Date() },
        { text: 'Old message 2', isUser: false, timestamp: new Date() }
      ];

      component.backtofaq();

      expect(component.messages.length).toBe(1);
      expect(component.messages[0].text).toBe('Hello! How can I help you today? ');
      expect(component.messages[0].isUser).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      component.faqs = mockFAQData.faqs;
    });

    it('should handle empty FAQ array in searchByKeywords', () => {
      component.faqs = [];
      const result = component.searchByKeywords('test');
      expect(result).toBeNull();
    });

    it('should handle multiple keyword matches and return first', () => {
      const result = component.searchByKeywords('planning wedding guests');
      expect(result).toBeTruthy();
    });

    it('should handle FAQ with empty keywords array', () => {
      component.faqs = [{
        id: 99,
        question: 'Test question',
        answer: 'Test answer',
        keywords: []
      }];
      const result = component.searchByKeywords('test');
      expect(result).toBeTruthy();
    });
  });
});