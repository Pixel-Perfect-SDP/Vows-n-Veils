import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Trackorders } from './trackorders';

describe('Trackorders', () => {
  let component: Trackorders;
  let fixture: ComponentFixture<Trackorders>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Trackorders]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Trackorders);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
