import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SupportPage } from './support-page';
import { provideRouter } from '@angular/router';

describe('SupportPage', () => {
  let component: SupportPage;
  let fixture: ComponentFixture<SupportPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SupportPage],
      providers: [
        provideRouter([]), 
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(SupportPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });//beforeEach


  it('should create', () => {
    expect(component).toBeTruthy();
  });

  //test the selectSection method
  it('should select a section', () => {
    component.selectSection('example');
    expect(component.selectedSection).toBe('example');
    expect(component.searchTerm).toBe('');
  });

  //test the goBack method
  it('should go back and reset section and search term', () => {
    component.selectSection('example');
    component.searchTerm = 'test';
    component.goBack();
    expect(component.selectedSection).toBeNull();
    expect(component.searchTerm).toBe('');
  });

  //test the matchesSearch method
  it('matchesSearch should return true if searchTerm is empty', () => {
    component.searchTerm = '';
    expect(component.matchesSearch('anything')).toBeTrue();
  });

  //test the matchesSearch method with actual matching
  //case sensitive matching
  it('matchesSearch should correctly match text', () => {
    component.searchTerm = 'hello';
    expect(component.matchesSearch('Hello')).toBeTrue();
    expect(component.matchesSearch('Goodbye')).toBeFalse();
  });  

});
