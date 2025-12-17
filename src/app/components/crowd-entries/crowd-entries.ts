import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommonService } from '../../services/common/common-service';
import { OverviewDashboardService } from '../../services/overview-dashboard/overview-dashboard.service';
import { ToastrService } from 'ngx-toastr';
import { Subscription, filter, distinctUntilChanged, combineLatest } from 'rxjs';
import { SocketService } from '../../services/socket/socket';

interface EntryRow {
  name: string;
  sex: string;
  entry: string;
  exit: string;
  dwell: string;
  avatar: string;
}

@Component({
  selector: 'app-crowd-entries',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crowd-entries.html',
  styleUrl: './crowd-entries.scss',
})
export class CrowdEntries implements OnInit, OnDestroy {

  selectedRange = 'today';

  pageIndex = 1;
  pageSize = 7;
  totalPages = 0;

  entries: any[] = [];
  paginatedEntries: any[] = [];
  visiblePages: number[] = [];

  selectedSiteId: string | null = null;
  selectedSiteSub?: Subscription;
  fromDate: any;
  toDate: any;
  isTableLoading = false;

  constructor(
    private commonService: CommonService,
    private overviewDashboardService: OverviewDashboardService,
    private toastr: ToastrService,
    private socketService: SocketService
  ) { }

  ngOnInit(): void {
    this.selectedSiteSub = this.commonService.getFilters$().pipe(
      filter(f =>
        !!f.siteId &&
        !!f.dateRange?.from &&
        !!f.dateRange?.to
      ),
      distinctUntilChanged(
        (a, b) =>
          a.siteId === b.siteId &&
          a.dateRange?.from === b.dateRange?.from &&
          a.dateRange?.to === b.dateRange?.to
      )
    ).subscribe(f => {
      this.selectedSiteId = f.siteId!;
      this.fromDate = f.dateRange!.from;
      this.toDate = f.dateRange!.to;

      this.getEntryExitData(); // ✅ ONLY ONCE
    });

    this.initSocketListener();
  }

  initSocketListener() {
    this.socketService.listen('alert').subscribe((data: any) => {
      if (this.selectedSiteId && data.siteId === this.selectedSiteId) {
        const newRow = this.mapApiRow(data, 0);
        this.entries.unshift(newRow);
        this.pageIndex = 1;
        this.pageSize = 7;
        this.updatePagination();
      }
    });
  }

  ngOnDestroy(): void {
    this.selectedSiteSub?.unsubscribe();
  }


  getEntryExitData(): void {
    this.isTableLoading = true;
    let fromUtc = Date.parse(this.fromDate)
    let toUtc = Date.parse(this.toDate)
    const payload = {
      siteId: this.selectedSiteId,
      fromUtc: fromUtc,
      toUtc: toUtc,
      pageSize: this.pageSize,
      pageNumber: this.pageIndex
    };

    this.overviewDashboardService.getEntryExitAnalytics(payload).subscribe({
      next: (response: any) => {
        const records = response?.records ?? [];

        this.entries = records.map((r: any, i: number) =>
          this.mapApiRow(r, i)
        );

        this.paginatedEntries = this.entries;

        this.pageIndex = 1;
        this.updatePagination();
        this.isTableLoading = false;
      },
      error: () => {
        this.toastr.error('Failed to load entry exit data');
        this.isTableLoading = false;
      }
    });
  }


  mapApiRow(row: any, index: number): EntryRow {
    const entryTime =
      row.entryUtc ??
      (row.direction === 'entry' ? row.ts : null);

    const exitTime =
      row.exitUtc ??
      (row.direction === 'exit' ? row.ts : null);

    return {
      name: row.personName ?? '—',
      sex: row.gender ?? '—',

      entry: entryTime
        ? this.formatTo12HourTime(entryTime)
        : '--',

      exit: exitTime
        ? this.formatTo12HourTime(exitTime)
        : '--',

      dwell: this.formatdwell(row.dwellMinutes) ?? '--',

      avatar: row.avatarUrl || `https://i.pravatar.cc/100?img=${index + 1}`
    };
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.entries.length / this.pageSize);

    const startIndex = (this.pageIndex - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;

    this.paginatedEntries = this.entries.slice(startIndex, endIndex);

    this.buildVisiblePages();
  }



  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;

    this.pageIndex = page;
    this.updatePagination();
    this.getEntryExitData();
  }


  buildVisiblePages(): void {
    const maxVisible = 5;
    const pages: number[] = [];

    let start = Math.max(1, this.pageIndex - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    this.visiblePages = pages;
  }


  onRangeChange(): void {
    this.pageIndex = 1;
    this.pageIndex = 9;
    this.getEntryExitData();
  }

  formatdwell(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '--';
    }
    const hours = Math.floor(value);
    const minutes = Math.round((value - hours) * 100);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  }

  formatTo12HourTime(utcMillis: number): string {
    if (!utcMillis) return '--';

    const date = new Date(utcMillis); // UTC → Local automatically

    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12 || 12;

    return `${hours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  }


  get hasEntries(): boolean {
    return this.paginatedEntries.length > 0;
  }


}
