import { Injectable } from '@angular/core';
import { HttpManagerService } from '../../http-manager/http-manager.service';
import { BehaviorSubject, Observable } from 'rxjs';

export interface DateRange {
  from: Date | number | string;
  to: Date | number | string;
}

@Injectable({
  providedIn: 'root',
})
export class CommonService {

  constructor(
    private httpManager: HttpManagerService
  ) { }

  getSiteList() {
    return this.httpManager.get('https://hiring-dev.internal.kloudspot.com/api/sites')
  }

  private filterSubject = new BehaviorSubject<{
    siteId: string | null;
    dateRange: DateRange | null;
  }>({
    siteId: null,
    dateRange: null
  });

  setFilters(siteId: string | null, dateRange: DateRange | null) {
    this.filterSubject.next({ siteId, dateRange });
  }

  getFilters$() {
    return this.filterSubject.asObservable();
  }

}
