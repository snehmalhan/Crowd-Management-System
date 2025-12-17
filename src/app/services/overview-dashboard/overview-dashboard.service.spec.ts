import { TestBed } from '@angular/core/testing';
import { OverviewDashboardService } from './overview-dashboard.service';


describe('OverviewDashboardService', () => {
  let service: OverviewDashboardService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OverviewDashboardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
