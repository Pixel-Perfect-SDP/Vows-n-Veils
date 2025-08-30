import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VendorsCompany } from './vendors-company';

describe('VendorsCompany', () => {
  let component: VendorsCompany;
  let fixture: ComponentFixture<VendorsCompany>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorsCompany]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VendorsCompany);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
