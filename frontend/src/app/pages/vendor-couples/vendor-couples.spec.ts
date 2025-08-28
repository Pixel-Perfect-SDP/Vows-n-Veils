import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VendorCouples } from './vendor-couples';

describe('VendorCouples', () => {
  let component: VendorCouples;
  let fixture: ComponentFixture<VendorCouples>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorCouples]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VendorCouples);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
