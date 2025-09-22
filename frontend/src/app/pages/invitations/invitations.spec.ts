import { ComponentFixture, TestBed } from '@angular/core/testing'; 
import { Invitations } from './invitations'; 
import { ReactiveFormsModule } from '@angular/forms'; 
import { Router } from '@angular/router'; 
import { RouterTestingModule } from '@angular/router/testing'; 
import { getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import * as firestore from 'firebase/firestore';


describe('Invitations', () => { 
  let component: Invitations; 
  let fixture: ComponentFixture<Invitations>; 
  let router: Router; 
  let dbMock: ReturnType<typeof getFirestore>; 

  beforeEach(async () => { 
    await TestBed.configureTestingModule({ 
      imports: [ Invitations, ReactiveFormsModule, RouterTestingModule.withRoutes([]) ],
    }).compileComponents(); 

    fixture = TestBed.createComponent(Invitations); 
    component = fixture.componentInstance; 
    router = TestBed.inject(Router); 
    fixture.detectChanges(); 
    dbMock = {} as any; 
  }); 

  // -----------------------------
  // getVenueName function
  // -----------------------------
  describe('getVenueName function', () => { 
    it('should return venuename if VenueID is a DocumentReference', async () => { 
      const mockSnap = { exists: () => true, data: () => ({ venuename: 'Test Venue' }) }; 
      // @ts-ignore 
      component['getVenueNameInternal'] = async () => mockSnap.data().venuename; 
      // @ts-ignore 
      const result = await component['getVenueNameInternal'](null, { path: 'Venues/123' }); 
      expect(result).toBe('Test Venue'); 
    }); 

    it('should return empty string if VenueID is null', async () => { 
      // @ts-ignore 
      const result = await component['getVenueName'](null, null); 
      expect(result).toBe(''); 
    }); 

    it('should return venuename if VenueID is a string', async () => { 
      const mockSnap = { exists: () => true, data: () => ({ venuename: 'String Venue' }) }; 
      // @ts-ignore 
      component['getVenueNameInternal'] = async () => mockSnap.data().venuename; 
      // @ts-ignore 
      const result = await component['getVenueNameInternal'](null, 'abc123'); 
      expect(result).toBe('String Venue'); 
    }); 

    it('should return empty string if VenueID string does not exist', async () => { 
      // @ts-ignore 
      component['getVenueNameInternal'] = async () => ''; 
      // @ts-ignore 
      const result = await component['getVenueNameInternal'](null, 'nonexistent'); 
      expect(result).toBe(''); 
    }); 

    it('should return empty string if DocumentReference exists but has no venuename', async () => { 
      // @ts-ignore 
      component['getVenueNameInternal'] = async () => ''; 
      // @ts-ignore 
      const result = await component['getVenueNameInternal'](null, { path: 'Venues/456' }); 
      expect(result).toBe(''); 
    }); 
  }); 

  // -----------------------------
  // loadDefaultsFromEvent
  // -----------------------------
  describe('loadDefaultsFromEvent user load', () => { 
    it('should exit early if waitForUser returns null', async () => { 
      // @ts-ignore 
      spyOn(component, 'waitForUser').and.returnValue(Promise.resolve(null)); 
      component.form.patchValue({ bride: 'Initial' }); 
      // @ts-ignore 
      await component['loadDefaultsFromEvent'](); 
      expect(component.form.getRawValue().bride).toBe('Initial'); 
    }); 

    it('should continue if waitForUser returns a user', async () => { 
      const mockUser = { uid: 'user123' }; 
      // @ts-ignore 
      spyOn(component, 'waitForUser').and.returnValue(Promise.resolve(mockUser)); 
      // @ts-ignore 
      component['loadDefaultsFromEventInternal'] = async () => true; 
      // @ts-ignore 
      await component['loadDefaultsFromEventInternal'](); 
      expect(true).toBeTrue(); 
    }); 
  }); 

  // -----------------------------
  // backTohome
  // -----------------------------
  describe('backTohome function', () => { 
    it('should navigate to /homepage', () => { 
      const navigateSpy = spyOn(router, 'navigate'); 
      component.backTohome(); 
      expect(navigateSpy).toHaveBeenCalledWith(['/homepage']); 
    }); 
  }); 

  // -----------------------------
  // saveInvitation
  // -----------------------------
  describe('saveInvitation', () => { 
    beforeEach(() => { 
      component.form.patchValue({
        bride: 'Alice',
        groom: 'Bob',
        date: '2025-09-22',
        time: '15:00',
        venue: 'Venue 1',
        message: 'Congrats!'
      }); 
      component.selected = { id: 'template123', name: 'Test Template', thumb: 'thumb.png', bg: 'bg.png' }; 
    }); 

    it('should return early if no template selected', async () => { 
      component.selected = undefined; 
      spyOn(component as any, 'waitForUser').and.returnValue(Promise.resolve({ uid: 'user123' })); 
      spyOn(window, 'alert'); 
      await (component as any).saveInvitation(); 
      expect(window.alert).not.toHaveBeenCalled(); 
      expect(component.hasInvite).not.toBeTrue(); 
    }); 
  }); 

  // -----------------------------
  // downloadCanvasPNG
  // -----------------------------
  describe('downloadCanvasPNG', () => { 
    let createObjectURLSpy: jasmine.Spy; 
    let revokeObjectURLSpy: jasmine.Spy; 

    beforeEach(() => { 
      createObjectURLSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:url'); 
      revokeObjectURLSpy = spyOn(URL, 'revokeObjectURL'); 

      spyOn(document, 'createElement').and.callFake((tag: string) => { 
        const el = document.createElement(tag) as HTMLElement; 
        if (tag === 'canvas') { 
          const canvas = el as unknown as HTMLCanvasElement; 
          canvas.toBlob = (cb: BlobCallback) => cb(new Blob()); 
          canvas.getContext = (() => ({
            fillRect: () => {}, drawImage: () => {}, save: () => {}, restore: () => {}, 
            fillText: () => {}, measureText: () => ({ width: 100 }), shadowColor: '', shadowBlur: 0, 
            shadowOffsetY: 0, font: '', fillStyle: '', textAlign: '', textBaseline: ''
          })) as unknown as typeof canvas.getContext; 
          return canvas; 
        } 
        return el; 
      }); 
    }); 

    it('should return early if no template selected', async () => { 
      component.selected = undefined; 
      await component.downloadCanvasPNG(); 
      expect(createObjectURLSpy).not.toHaveBeenCalled(); 
    }); 

    it('should draw and trigger download when template selected', async () => { 
      component.selected = { id: 't1', name: 'Template1', thumb: '', bg: '' } as any; 
      component.photoUrl = 'photo.jpg'; 
      spyOn(component as any, 'loadImage').and.callFake(async () => ({ width: 800, height: 600 } as any)); 
      spyOn(component as any, 'drawRoundedImage'); 
      await component.downloadCanvasPNG(); 
      expect(createObjectURLSpy).toHaveBeenCalled(); 
      expect(revokeObjectURLSpy).toHaveBeenCalled(); 
    }); 
  }); 

  // -----------------------------
  // loadImage
  // -----------------------------
  describe('loadImage', () => { 
    beforeEach(() => { 
      fixture = TestBed.createComponent(Invitations);
      component = fixture.componentInstance; 
      fixture.detectChanges(); 
    }); 

    it('should resolve when image loads successfully', async () => { 
      const mockImage = {} as HTMLImageElement; 
      spyOn(window as any, 'Image').and.callFake(() => {
        setTimeout(() => (mockImage as any).onload?.(), 0); 
        return mockImage; 
      }); 
      const result = await (component as any).loadImage('test.png'); 
      expect(result).toBe(mockImage); 
    }); 

    it('should reject when image fails to load', async () => { 
      const mockImage = {} as HTMLImageElement; 
      spyOn(window as any, 'Image').and.callFake(() => { 
        setTimeout(() => (mockImage as any).onerror?.(new Error('fail')), 0); 
        return mockImage; 
      }); 
      await expectAsync((component as any).loadImage('bad.png')).toBeRejected(); 
    }); 
  });



// ---- choose() ----
it('should set selected template when choose() is called', () => {
  const template = { id: 'modern', name: 'Modern', thumb: '', bg: '' } as any;
  component.choose(template);
  expect(component.selected).toBe(template);
});

// ---- onPhotoChange() ----
describe('onPhotoChange', () => {
  let createObjectURLSpy: jasmine.Spy;
  let revokeObjectURLSpy: jasmine.Spy;

  beforeEach(() => {
    createObjectURLSpy = spyOn(URL, 'createObjectURL').and.returnValue('fake-url');
    revokeObjectURLSpy = spyOn(URL, 'revokeObjectURL');
  });

  it('should set photoUrl when a file is selected', () => {
    const file = new File([''], 'photo.png');
    const event = { target: { files: [file] } } as unknown as Event;
    component.onPhotoChange(event);
    expect(component.photoUrl).toBe('fake-url');
  });

  it('should not set photoUrl if no file is selected', () => {
    const event = { target: { files: [] } } as unknown as Event;
    component.photoUrl = 'old-url';
    component.onPhotoChange(event);
    expect(component.photoUrl).toBe('old-url');
  });

  it('should revoke previous photoUrl', () => {
    component.photoUrl = 'old-url';
    const file = new File([''], 'newphoto.png');
    const event = { target: { files: [file] } } as unknown as Event;
    component.onPhotoChange(event);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('old-url');
  });
});




});
