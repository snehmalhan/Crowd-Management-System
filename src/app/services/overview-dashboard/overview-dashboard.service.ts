import { Injectable } from '@angular/core';
import { HttpManagerService } from '../../http-manager/http-manager.service';

@Injectable({
  providedIn: 'root'
})
export class OverviewDashboardService {

  constructor(
    private httpManager: HttpManagerService
  ) { }

  getFootfallAnalytics(payload: any) {
    return this.httpManager.post('https://hiring-dev.internal.kloudspot.com/api/analytics/footfall', payload)
  }

  getDwellAnalytics(payload: any) {
    return this.httpManager.post('https://hiring-dev.internal.kloudspot.com/api/analytics/dwell', payload)
  }

  getOccupanyAnalytics(payload: any) {
    return this.httpManager.post('https://hiring-dev.internal.kloudspot.com/api/analytics/occupancy', payload)
  }

  getDempgraphicsAnalytics(payload: any) {
    return this.httpManager.post('https://hiring-dev.internal.kloudspot.com/api/analytics/demographics', payload)
  }

  getEntryExitAnalytics(payload: any) {
    return this.httpManager.post('https://hiring-dev.internal.kloudspot.com/api/analytics/entry-exit', payload)
  }

}
