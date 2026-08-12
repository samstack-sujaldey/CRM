import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacebookLeadsComponent } from './facebook-leads.component';

describe('FacebookLeadsComponent', () => {
  let component: FacebookLeadsComponent;
  let fixture: ComponentFixture<FacebookLeadsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FacebookLeadsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FacebookLeadsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});