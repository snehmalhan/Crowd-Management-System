import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../services/auth-management/auth.service';
import { CommonService } from '../../../services/common/common-service';
import { FormsModule } from '@angular/forms';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { SocketService } from '../../../services/socket/socket';


@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxSpinnerModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})

export class HeaderComponent implements OnInit {
  siteList: any;
  selectedDateFilter = 'today';
  selectedSiteId: any;
  // selectedSiteTimezone: any;
  showAlerts = false
  alerts: any[] = [];


  constructor(private authService: AuthService,
    private commonService: CommonService,
    private spinner: NgxSpinnerService,
    private socketService: SocketService
  ) { }

  ngOnInit() {
    this.getSiteList();
    this.initSocketListener();
  }

  initSocketListener() {
    this.socketService.listen('alert').subscribe((data: any) => {
      this.alerts.unshift(data); // Add new alert to the top
    });
  }

  getSiteList() {
    this.spinner.show();
    this.commonService.getSiteList().subscribe((res: any) => {
      this.siteList = res;

      const initialId = this.siteList[0]?.siteId ?? null;
      this.selectedSiteId = initialId;
      const range = this.calculateDateRange('today');

      this.commonService.setFilters(initialId, range); // ✅ ONE emission
      this.spinner.hide();
    });
  }


  onSiteChange(event: Event) {
    const selectedId = (event.target as HTMLSelectElement).value;
    this.selectedSiteId = selectedId;
    const range = this.calculateDateRange('today');
    this.selectedDateFilter = 'today';

    this.commonService.setFilters(selectedId, range); // ✅ ONE emission
  }


  //   updateSelectedSiteTimezone(siteId: string) {
  //   const site = this.siteList?.find((s: any) => s.siteId === siteId);
  //   this.selectedSiteTimezone = site?.timezone ?? 'UTC';

  //   console.log('Selected Site Timezone:', this.selectedSiteTimezone);
  // }

  onDateChange(value: string) {
    this.selectedDateFilter = value;

    const range = this.calculateDateRange(value);

    this.commonService.setFilters(this.selectedSiteId, range); // ✅ EMIT
  }


  calculateDateRange(value: string) {
    const today = new Date();
    let fromDate: Date;
    fromDate = new Date(today);
    switch (value) {
      case 'today':
        break;
      case 'yesterday':
        fromDate.setDate(today.getDate() - 1);
        break;
      case 'week':
        fromDate.setDate(today.getDate() - today.getDay());
        break;
      case 'month':
        fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'year':
        fromDate = new Date(today.getFullYear(), 0, 1);
        break;
      default:
        break;
    }
    fromDate.setHours(0, 0, 0, 0);
    return { from: fromDate, to: today };
  }



  toggleAlerts() {
    this.showAlerts = !this.showAlerts;
  }

  closeAlerts() {
    this.showAlerts = false;
  }

  formatAlertDate(ts: any): string {
    const d = new Date(Number(ts));

    const date = d.toLocaleDateString('en-US', {
      month: 'long',
      day: '2-digit',
      year: 'numeric'
    });

    const time = d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    return `${date} ${time}`;
  }




}
