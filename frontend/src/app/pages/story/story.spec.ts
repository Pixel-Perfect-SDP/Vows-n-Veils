import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormBuilder, FormArray, AbstractControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';

import { Story } from './story';
import { AuthService } from '../../core/auth';
import { DataService } from '../../core/data.service';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';

// Mock services
class MockAuthService {
  user = jasmine.createSpy('user').and.returnValue({ uid: 'test-uid', email: 'test@test.com' });
}

class MockDataService {
  downloadStoryPdf = jasmine.createSpy('downloadStoryPdf').and.returnValue(of(new Blob()));
}

class MockRouter {
  navigate = jasmine.createSpy('navigate');
}

class MockActivatedRoute {
  // Add any properties needed for ActivatedRoute
}

// Firebase mocks
const mockGetDoc = jasmine.createSpy('getDoc');
const mockSetDoc = jasmine.createSpy('setDoc');
const mockGetFirestore = jasmine.createSpy('getFirestore').and.returnValue({});
const mockDoc = jasmine.createSpy('doc').and.returnValue('test-doc-ref');
const mockGetApp = jasmine.createSpy('getApp').and.returnValue({});

// Create a proper mock for CdkDragDrop event
function createDragEvent(previousIndex: number, currentIndex: number): CdkDragDrop<AbstractControl[]> {
  return {
    previousIndex,
    currentIndex,
    item: { data: {} } as any,
    container: { data: [] } as any,
    previousContainer: { data: [] } as any,
    isPointerOverContainer: true,
    distance: { x: 0, y: 0 },
    dropPoint: { x: 0, y: 0 },
    event: {} as any
  } as CdkDragDrop<AbstractControl[]>;
}

describe('Story', () => {
  let component: Story;
  let fixture: ComponentFixture<Story>;
  let authService: MockAuthService;
  let dataService: MockDataService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, DragDropModule, Story], // Import the standalone component
      providers: [
        FormBuilder,
        { provide: AuthService, useClass: MockAuthService },
        { provide: DataService, useClass: MockDataService },
        { provide: Router, useClass: MockRouter },
        { provide: ActivatedRoute, useClass: MockActivatedRoute }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Story);
    component = fixture.componentInstance;

    // Get the actual injected services
    authService = TestBed.inject(AuthService) as any;
    dataService = TestBed.inject(DataService) as any;

    // Setup global Firebase mocks
    (window as any).getFirestore = mockGetFirestore;
    (window as any).getDoc = mockGetDoc;
    (window as any).setDoc = mockSetDoc;
    (window as any).doc = mockDoc;
    (window as any).getApp = mockGetApp;
  });

  afterEach(() => {
    // Clear all mocks
    mockGetDoc.calls.reset();
    mockSetDoc.calls.reset();
    mockGetFirestore.calls.reset();
    mockDoc.calls.reset();
    mockGetApp.calls.reset();
    authService.user.calls.reset();
    dataService.downloadStoryPdf.calls.reset();
  });

  describe('Component Creation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize form with empty values', () => {
      expect(component.form).toBeDefined();
      expect(component.form.get('howWeMet')?.value).toBe('');
      expect(component.form.get('photoURL')?.value).toBe('');
      expect(component.form.get('proposal')?.value).toBe('');
      expect(component.form.get('userID')?.value).toBe('');
      expect(component.timeline.length).toBe(0);
    });
  });

  describe('Timeline Management', () => {
    beforeEach(() => {
      // Don't call ngOnInit here to avoid Firebase calls in simple timeline tests
    });

    describe('addTimelineEntry', () => {
      it('should add a timeline entry when under limit', () => {
        component.addTimelineEntry();

        expect(component.timeline.length).toBe(1);
        expect(component.timeline.at(0).get('title')?.value).toBe('');
        expect(component.timeline.at(0).get('description')?.value).toBe('');
      });

      it('should not add timeline entry when at maximum limit', () => {
        // Add 5 entries
        for (let i = 0; i < 5; i++) {
          component.addTimelineEntry();
        }

        expect(component.timeline.length).toBe(5);

        // Try to add 6th entry
        const alertSpy = spyOn(window, 'alert');
        component.addTimelineEntry();

        expect(component.timeline.length).toBe(5);
        expect(alertSpy).toHaveBeenCalledWith('You can only have 5 milestones.');
      });
    });

    describe('removeTimelineEntry', () => {
      it('should remove timeline entry at specified index', () => {
        component.addTimelineEntry();
        component.addTimelineEntry();

        expect(component.timeline.length).toBe(2);

        component.removeTimelineEntry(0);

        expect(component.timeline.length).toBe(1);
      });

      it('should handle removing from empty timeline', () => {
        expect(() => component.removeTimelineEntry(0)).not.toThrow();
      });
    });

    describe('drop', () => {
      it('should reorder timeline entries and save order', async () => {
        // Add timeline entries
        component.addTimelineEntry();
        component.addTimelineEntry();
        component.addTimelineEntry();

        // Set values for testing
        component.timeline.at(0).get('title')?.setValue('Title 1');
        component.timeline.at(1).get('title')?.setValue('Title 2');
        component.timeline.at(2).get('title')?.setValue('Title 3');

        const mockEvent = createDragEvent(0, 2);

        // Mock the waitForUser method to return a user
        spyOn(component as any, 'waitForUser').and.returnValue(Promise.resolve({ uid: 'test-uid' }));

        await component.drop(mockEvent);

        // Check if items were reordered
        expect(component.timeline.at(0).get('title')?.value).toBe('Title 2');
        expect(component.timeline.at(1).get('title')?.value).toBe('Title 3');
        expect(component.timeline.at(2).get('title')?.value).toBe('Title 1');

        // Verify saveTimelineOrder was called
        expect(mockSetDoc).toHaveBeenCalled();
      });
    });

    describe('trackByIndex', () => {
      it('should return the index', () => {
        expect(component.trackByIndex(2, {} as AbstractControl)).toBe(2);
      });
    });
  });

  describe('User Authentication', () => {
    describe('waitForUser', () => {
      it('should resolve immediately if user exists', async () => {
        const user = { uid: 'test-uid' };
        authService.user.and.returnValue(user);

        const result = await (component as any).waitForUser();

        expect(result).toEqual(user);
      });

      it('should timeout if user never becomes available', async () => {
        authService.user.and.returnValue(null);

        const result = await (component as any).waitForUser();

        expect(result).toBeNull();
      }, 10000); // Extended timeout for this test
    });
  });

  describe('ngOnInit', () => {
    it('should set hasStory to true when story exists', async () => {
      const mockStoryData = {
        howWeMet: 'We met at school',
        proposal: 'He proposed on a beach',
        timeline: [
          { title: 'First date', description: 'We went to a movie' }
        ]
      };

      mockGetDoc.and.returnValue(Promise.resolve({
        exists: () => true,
        data: () => mockStoryData
      }));

      await component.ngOnInit();

      expect(component.hasStory).toBeTrue();
      expect(component.storyData).toEqual(mockStoryData);
      expect(component.timeline.length).toBe(1);
    });

    it('should set hasStory to false when no story exists', async () => {
      mockGetDoc.and.returnValue(Promise.resolve({
        exists: () => false
      }));

      await component.ngOnInit();

      expect(component.hasStory).toBeFalse();
      expect(component.storyData).toBeNull();
    });

    it('should handle errors during story check', async () => {
      mockGetDoc.and.returnValue(Promise.reject('Firebase error'));

      await component.ngOnInit();

      expect(component.hasStory).toBeFalse();
      expect(component.storyData).toBeNull();
    });
  });

  describe('saveStory', () => {
    beforeEach(() => {
      component.form.get('howWeMet')?.setValue('Test how we met');
      component.form.get('proposal')?.setValue('Test proposal');
      component.form.get('photoURL')?.setValue('test-photo.jpg');
    });

    it('should save story successfully', async () => {
      mockSetDoc.and.returnValue(Promise.resolve());
      mockGetDoc.and.returnValue(Promise.resolve({
        data: () => ({ saved: 'data' })
      }));

      // Mock waitForUser
      spyOn(component as any, 'waitForUser').and.returnValue(Promise.resolve({ uid: 'test-uid' }));

      await component.saveStory();

      expect(mockSetDoc).toHaveBeenCalled();
      expect(component.hasStory).toBeTrue();
    });

    it('should not save if form is invalid', async () => {
      component.form.get('howWeMet')?.setValue(''); // Make form invalid

      await component.saveStory();

      expect(mockSetDoc).not.toHaveBeenCalled();
    });

    it('should handle save errors', async () => {
      mockSetDoc.and.returnValue(Promise.reject('Save error'));
      const alertSpy = spyOn(window, 'alert');

      // Mock waitForUser
      spyOn(component as any, 'waitForUser').and.returnValue(Promise.resolve({ uid: 'test-uid' }));

      await component.saveStory();

      expect(alertSpy).toHaveBeenCalledWith('Error creating story. Please try again.');
    });
  });

  describe('cancelEdit', () => {
    it('should reset form to original story data', () => {
      const originalData = {
        howWeMet: 'Original story',
        proposal: 'Original proposal',
        photoURL: 'original.jpg',
        timeline: []
      };

      component.originalStory = originalData;
      component.form.get('howWeMet')?.setValue('Modified story');
      component.form.get('proposal')?.setValue('Modified proposal');

      component.cancelEdit();

      expect(component.form.get('howWeMet')?.value).toBe('Original story');
      expect(component.form.get('proposal')?.value).toBe('Original proposal');
    });

    it('should handle no original story', () => {
      component.originalStory = null;

      expect(() => component.cancelEdit()).not.toThrow();
    });
  });

  describe('exportPdf', () => {
    it('should export PDF successfully', () => {
      const blob = new Blob(['test content'], { type: 'application/pdf' });
      dataService.downloadStoryPdf.and.returnValue(of(blob));

      const createElementSpy = spyOn(document, 'createElement').and.callThrough();
      const clickSpy = jasmine.createSpy('click');

      createElementSpy.withArgs('a').and.returnValue({
        href: '',
        download: '',
        click: clickSpy,
        style: {}
      } as unknown as HTMLAnchorElement);

      // Mock waitForUser
      spyOn(component as any, 'waitForUser').and.returnValue(Promise.resolve({ uid: 'test-uid' }));

      component.exportPdf();

      expect(dataService.downloadStoryPdf).toHaveBeenCalledWith('test-uid');
    });

    it('should handle PDF export errors', () => {
      dataService.downloadStoryPdf.and.returnValue(throwError(() => new Error('Export failed')));
      const alertSpy = spyOn(window, 'alert');

      // Mock waitForUser
      spyOn(component as any, 'waitForUser').and.returnValue(Promise.resolve({ uid: 'test-uid' }));

      component.exportPdf();

      expect(alertSpy).toHaveBeenCalledWith('Failed to export PDF.');
    });
  });

  describe('Form Validation', () => {
    it('should mark required fields as invalid when empty', () => {
      component.form.get('howWeMet')?.setValue('');
      component.form.get('proposal')?.setValue('');

      expect(component.form.get('howWeMet')?.valid).toBeFalse();
      expect(component.form.get('proposal')?.valid).toBeFalse();
      expect(component.form.valid).toBeFalse();
    });

    it('should mark form as valid when required fields are filled', () => {
      component.form.get('howWeMet')?.setValue('We met at work');
      component.form.get('proposal')?.setValue('He proposed in Paris');

      expect(component.form.get('howWeMet')?.valid).toBeTrue();
      expect(component.form.get('proposal')?.valid).toBeTrue();
    });

    it('should validate timeline entries', () => {
      component.addTimelineEntry();

      const timelineEntry = component.timeline.at(0);
      expect(timelineEntry.get('title')?.valid).toBeFalse();
      expect(timelineEntry.get('description')?.valid).toBeFalse();

      timelineEntry.get('title')?.setValue('First Date');
      timelineEntry.get('description')?.setValue('We went to a restaurant');

      expect(timelineEntry.get('title')?.valid).toBeTrue();
      expect(timelineEntry.get('description')?.valid).toBeTrue();
    });
  });
});
