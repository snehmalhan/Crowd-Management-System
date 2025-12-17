import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OverviewDashboard } from './overview-dashboard';

describe('OverviewDashboard', () => {
  let component: OverviewDashboard;
  let fixture: ComponentFixture<OverviewDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OverviewDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OverviewDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
