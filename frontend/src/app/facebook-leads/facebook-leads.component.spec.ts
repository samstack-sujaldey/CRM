import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacebookLeadComponent } from './facebook-leads.component';

describe('FacebookLeadComponent', () => {
  let component: FacebookLeadComponent;
  let fixture: ComponentFixture<FacebookLeadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FacebookLeadComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FacebookLeadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
