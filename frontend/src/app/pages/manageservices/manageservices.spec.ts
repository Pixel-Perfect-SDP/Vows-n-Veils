import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Manageservices } from './manageservices';

describe('Manageservices', () => {
  let component: Manageservices;
  let fixture: ComponentFixture<Manageservices>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Manageservices]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Manageservices);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
