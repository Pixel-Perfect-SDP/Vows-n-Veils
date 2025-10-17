import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { Homepage } from './homepage';

describe('Homepage – clipboard utilities', () => {
  let component: Homepage;
  let originalClipboard: Clipboard | undefined;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Homepage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    const fixture = TestBed.createComponent(Homepage);
    component = fixture.componentInstance;

    originalClipboard = (navigator as any).clipboard;
  });

  afterEach(() => {
    if (originalClipboard) {
      Object.defineProperty(navigator, 'clipboard', {
        value: originalClipboard,
        configurable: true,
      });
    } else {
      delete (navigator as any).clipboard;
    }
  });

  it('copyToClipboard writes the RSVP code and logs success', async () => {
    const writeSpy = jasmine.createSpy('writeText').and.returnValue(Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeSpy },
      configurable: true,
    });
    const logSpy = spyOn(console, 'log');

    component.copyToClipboard('RSVP123');
    await writeSpy.calls.mostRecent().returnValue;

    expect(writeSpy).toHaveBeenCalledWith('RSVP123');
    expect(logSpy).toHaveBeenCalledWith('RSVP Code copied:', 'RSVP123');
  });

  it('copyToClipboard logs an error when the clipboard write fails', async () => {
    const writeSpy = jasmine.createSpy('writeText').and.returnValue(Promise.reject('fail'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeSpy },
      configurable: true,
    });
    const errorSpy = spyOn(console, 'error');

    component.copyToClipboard('BROKEN');
    await writeSpy.calls.mostRecent().returnValue.catch(() => {});

    expect(writeSpy).toHaveBeenCalledWith('BROKEN');
    expect(errorSpy).toHaveBeenCalled();
  });
});
