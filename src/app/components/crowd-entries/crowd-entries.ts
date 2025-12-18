import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommonService } from '../../services/common/common-service';
import { OverviewDashboardService } from '../../services/overview-dashboard/overview-dashboard.service';
import { ToastrService } from 'ngx-toastr';
import { Subscription, filter, distinctUntilChanged } from 'rxjs';
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
  styleUrl: './crowd-entries.scss'
})
export class CrowdEntries implements OnInit, OnDestroy {

  pageIndex = 1;
  pageSize = 50;
  totalPages = 0;

  entries: EntryRow[] = [];
  paginatedEntries: EntryRow[] = [];
  visiblePages: (number | string)[] = [];

  selectedSiteId: string | null = null;
  fromDate: any;
  toDate: any;

  isTableLoading = false;
  selectedSiteSub?: Subscription;
  socketSub?: Subscription;

  constructor(
    private commonService: CommonService,
    private overviewDashboardService: OverviewDashboardService,
    private toastr: ToastrService,
    private socketService: SocketService
  ) { }

  ngOnInit(): void {
    this.selectedSiteSub = this.commonService.getFilters$().pipe(
      filter(f => !!f.siteId && !!f.dateRange?.from && !!f.dateRange?.to),
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

      this.pageIndex = 1;
      this.getEntryExitData();
    });

    this.initSocketListener();
  }

  ngOnDestroy(): void {
    this.selectedSiteSub?.unsubscribe();
    this.socketSub?.unsubscribe();
  }

  getEntryExitData(): void {
    this.isTableLoading = true;


    const payload = {
      pageSize: this.pageSize,
      pageNumber: this.pageIndex,
      siteId: this.selectedSiteId,
      fromUtc: Date.parse(this.fromDate),
      toUtc: Date.parse(this.toDate)
    };

    this.overviewDashboardService.getEntryExitAnalytics(payload).subscribe({
      next: (res: any) => {
        const records = res?.records ?? [];

        this.entries = records.map((r: any, i: number) =>
          this.mapApiRow(r, i)
        );

        this.paginatedEntries = this.entries;
        this.totalPages = res?.totalPages;
        this.buildVisiblePages();
        this.isTableLoading = false;
      },
      error: () => {
        this.toastr.error('Failed to load entry exit data');
        this.isTableLoading = false;
      }
    });
  }

  initSocketListener(): void {
    this.socketSub = this.socketService.listen('alert').subscribe((data: any) => {
      if (!this.selectedSiteId || data.siteId !== this.selectedSiteId) return;

      const newRow = this.mapApiRow(data, 0);

      // Only add to current view if we are on the first page
      if (this.pageIndex === 1) {
        this.paginatedEntries.unshift(newRow);
        if (this.paginatedEntries.length > this.pageSize) {
          this.paginatedEntries.pop();
        }
      }
    });
  }


  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;

    this.pageIndex = page;
    this.getEntryExitData();
  }

  buildVisiblePages(): void {
    const total = this.totalPages;
    const current = this.pageIndex;
    const rangeWithDots: (number | string)[] = [];

    if (total <= 5) {
      // 1 2 3 4 5
      for (let i = 1; i <= total; i++) rangeWithDots.push(i);
    } else {
      if (current <= 3) {
        // Start: 1 2 3 ... N
        rangeWithDots.push(1, 2, 3, '...', total);
      } else if (current >= total - 2) {
        // End: 1 ... N-2 N-1 N
        rangeWithDots.push(1, '...', total - 2, total - 1, total);
      } else {
        // Middle: 1 ... current ... N
        rangeWithDots.push(1, '...', current, '...', total);
      }
    }

    this.visiblePages = rangeWithDots;
  }


  mapApiRow(row: any, index: number): EntryRow {
    const entryTime =
      row.entryUtc ?? (row.direction === 'entry' ? row.ts : null);

    const exitTime =
      row.exitUtc ?? (row.direction === 'exit' ? row.ts : null);

    return {
      name: row.personName ?? '—',
      sex: row.gender ?? '—',
      entry: entryTime ? this.formatTo12HourTime(entryTime) : '--',
      exit: exitTime ? this.formatTo12HourTime(exitTime) : '--',
      dwell: this.formatdwell(row.dwellMinutes),
      avatar: row.avatarUrl || `https://i.pravatar.cc/100?img=${index + 1}`
    };
  }


  formatdwell(value: number | null | undefined): string {
    if (value == null) return '--';
    const h = Math.floor(value);
    const m = Math.round((value - h) * 60);
    return `${h}:${m.toString().padStart(2, '0')}`;
  }

  formatTo12HourTime(utcMillis: number): string {
    const d = new Date(utcMillis);
    let h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
  }

  get hasEntries(): boolean {
    return this.paginatedEntries.length > 0;
  }
}
