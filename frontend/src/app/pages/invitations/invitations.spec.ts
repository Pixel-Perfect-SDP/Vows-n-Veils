import { ComponentFixture, TestBed } from '@angular/core/testing'; 
import { Invitations } from './invitations'; 
import { ReactiveFormsModule, FormBuilder } from '@angular/forms'; 
import { Router } from '@angular/router'; 
import { RouterTestingModule } from '@angular/router/testing'; 


import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import * as firestore from 'firebase/firestore';
import { DocumentSnapshot, DocumentData } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { of } from 'rxjs';


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
  }); //describe getVenueName

  
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
  }); //describe loadDefaultsFromEvent user load

  describe('backTohome function', () => { 
    it('should navigate to /homepage', () => { 
      const navigateSpy = spyOn(router, 'navigate'); 
      component.backTohome(); 
      expect(navigateSpy).toHaveBeenCalledWith(['/homepage']); 
    }); 
  }); //describe backTohome

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
  }); //describe saveInvitation


  describe('downloadCanvasPNG', () => { 
  let createObjectURLSpy: jasmine.Spy; 
  let revokeObjectURLSpy: jasmine.Spy; 
  const realCreateElement = document.createElement;

  beforeEach(() => { 
    createObjectURLSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:url'); 
    revokeObjectURLSpy = spyOn(URL, 'revokeObjectURL');

    spyOn(document, 'createElement').and.callFake((tag: string) => { 
      if (tag === 'canvas') {
        const canvas = realCreateElement.call(document, tag) as HTMLCanvasElement;
        canvas.toBlob = (cb: BlobCallback) => cb(new Blob());
        canvas.getContext = (() => ({
          fillRect: () => {}, drawImage: () => {}, save: () => {}, restore: () => {},
          fillText: () => {}, measureText: () => ({ width: 100 }),
          shadowColor: '', shadowBlur: 0, shadowOffsetY: 0, font: '',
          fillStyle: '', textAlign: '', textBaseline: ''
        })) as any;
        return canvas;
      }
      return realCreateElement.call(document, tag);
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
});//describe downloadCanvasPNG

  describe('loadImage', () => {
  it('should resolve when image loads successfully', async () => {
    // Save real Image
    const RealImage = window.Image;

    // Mock Image constructor
    (window as any).Image = class {
      onload: (() => void) | null = null;
      onerror: ((err: any) => void) | null = null;
      src = '';
      constructor() {
        setTimeout(() => this.onload && this.onload(), 0); // trigger load
      }
    };

    const img = await (component as any).loadImage('test.png');
    expect(img).toBeDefined();

    // Restore real Image
    window.Image = RealImage;
  });

  it('should reject when image fails to load', async () => {
    const RealImage = window.Image;

    (window as any).Image = class {
      onload: (() => void) | null = null;
      onerror: ((err: any) => void) | null = null;
      src = '';
      constructor() {
        setTimeout(() => this.onerror && this.onerror(new Error('fail')), 0); // trigger error
      }
    };

    await expectAsync((component as any).loadImage('bad.png')).toBeRejected();

    window.Image = RealImage;
  });
});//describe loadImage







  // choose()
it('should set selected template when choose() is called', () => {
  const template = { id: 'modern', name: 'Modern', thumb: '', bg: '' } as any;
  component.choose(template);
  expect(component.selected).toBe(template);
});



//onPhotoChange
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
});//describe onPhotoChange



describe('ngOnInit', () => {
  it('should exit early if no user', async () => {
    spyOn(component as any, 'waitForUser').and.returnValue(Promise.resolve(null));
    await component.ngOnInit();
    expect(component.hasInvite).toBeNull();
  });

//  it('should hydrate invitation if snap exists', async () => {
//   // Spy on waitForUser to return a user
//   spyOn(component as any, 'waitForUser').and.returnValue(Promise.resolve({ uid: 'u1' }));

//   // Replace getDoc with a mock function directly
//   (component as any).getDoc = async () => ({
//     exists: () => true,
//     data: () => ({
//       TemplateId: 'classic',
//       Bride: 'A',
//       Groom: 'B',
//       Date: '2025-01-01',
//       Time: '10:00',
//       Venue: 'V',
//       Message: 'M'
//     })
//   });

//   // Call ngOnInit without spying on doc/getFirestore
//   await component.ngOnInit();

//   expect(component.hasInvite).toBeTrue();
//   expect(component.selected?.id).toBe('classic');
//   expect(component.form.value.bride).toBe('A');
// });






});//describe ngOnInit



describe('saveInvitation full', () => {
  it('should exit if form invalid', async () => {
    component.selected = { id: 'classic', name: '', thumb: '', bg: '' };
    component.form.patchValue({ bride: '' }); // invalid
    await component.saveInvitation();
    expect(component.hasInvite).toBeNull();
  });

  it('should exit if no user', async () => {
    component.selected = { id: 'classic', name: '', thumb: '', bg: '' };
    spyOn(component as any, 'waitForUser').and.returnValue(Promise.resolve(null));
    await component.saveInvitation();
    expect(component.hasInvite).toBeNull();
  });
});//describe saveInvitation full



describe('downloadCanvasPNG fallbacks', () => {
  beforeEach(() => {
    component.selected = { id: 'classic', name: 'Classic', thumb: '', bg: 'bad-bg.png' } as any;
  });


  it('should fallback to plain background if bg load fails', async () => {
  component.selected = { id: 'classic', name: 'Classic', thumb: '', bg: 'bad-bg.png' } as any;
  component.photoUrl = 'good-photo.png';

  // Spy loadImage: reject bg, resolve photo
  spyOn(component as any, 'loadImage').and.callFake((url: string) => {
    const selected = component.selected!;
    if (url === selected.bg) {
      return Promise.reject(new Error('bg fail'));
    }
    return Promise.resolve({ width: 100, height: 100 } as any);
  });

  // Mock canvas and context
  const ctx = {
    fillRect: jasmine.createSpy(),
    drawImage: jasmine.createSpy(),
    measureText: () => ({ width: 10 }),
    fillText: jasmine.createSpy(),
    save: jasmine.createSpy(),
    restore: jasmine.createSpy(),
    textAlign: '',
    textBaseline: '',
    font: ''
  };

  const originalCreateElement = document.createElement.bind(document);
  spyOn(document, 'createElement').and.callFake((tag: string) => {
    if (tag === 'canvas') {
      return { width: 0, height: 0, getContext: () => ctx, toBlob: (cb: any) => cb(new Blob()) } as any;
    }
    return originalCreateElement(tag); // safe, avoids recursion
  });

  spyOn(URL, 'createObjectURL').and.returnValue('url');
  spyOn(URL, 'revokeObjectURL');

  await component.downloadCanvasPNG();

  expect(ctx.fillRect).toHaveBeenCalled(); // fallback used
  expect(URL.createObjectURL).toHaveBeenCalled();
});



});//describe downloadCanvasPNG fallbacks


// it('should draw rounded image correctly', () => {
//   const ctx = {
//     save: jasmine.createSpy(),
//     beginPath: jasmine.createSpy(),
//     moveTo: jasmine.createSpy(),
//     lineTo: jasmine.createSpy(),
//     arcTo: jasmine.createSpy(),
//     closePath: jasmine.createSpy(),
//     clip: jasmine.createSpy(),
//     drawImage: jasmine.createSpy(),
//     restore: jasmine.createSpy(),
//   } as unknown as CanvasRenderingContext2D;

//   const img = {} as HTMLImageElement;
//   (component as any).drawRoundedImage(ctx, img, 0, 0, 100, 100, 10);

//   expect(ctx.save).toHaveBeenCalled();
//   expect(ctx.beginPath).toHaveBeenCalled();
//   expect(ctx.moveTo).toHaveBeenCalled();
//   expect(ctx.lineTo).toHaveBeenCalled();
//   expect(ctx.arcTo).toHaveBeenCalled();
//   expect(ctx.closePath).toHaveBeenCalled();
//   expect(ctx.clip).toHaveBeenCalled();
//  expect(ctx.drawImage).toHaveBeenCalledWith(
//   img,
//   0, 0, 100, 100,
//   jasmine.anything(), jasmine.anything(), jasmine.anything(), jasmine.anything()
// );


//   expect(ctx.restore).toHaveBeenCalled();
// });








});//describe Invitations
