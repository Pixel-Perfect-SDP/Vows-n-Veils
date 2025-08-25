import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VenuesCouples } from './venues-couples';

describe('VenuesCouples', () => {
  let component: VenuesCouples;
  let fixture: ComponentFixture<VenuesCouples>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VenuesCouples]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VenuesCouples);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
