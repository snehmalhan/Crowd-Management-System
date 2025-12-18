import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { OverviewDashboardService } from '../../services/overview-dashboard/overview-dashboard.service';
import { CommonService } from '../../services/common/common-service';
import { Subscription, filter, distinctUntilChanged } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { SocketService } from '../../services/socket/socket';

Chart.register(...registerables);

@Component({
  selector: 'app-overview-dashboard',
  imports: [CommonModule],
  templateUrl: './overview-dashboard.html',
  styleUrl: './overview-dashboard.scss',
})
export class OverviewDashboard implements OnInit {
  @ViewChild('revenueChart') revenueChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('trafficChart') trafficChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('occupancyChart') occupancyChartRef!: ElementRef<HTMLCanvasElement>;

  revenueChart: Chart | null = null;
  trafficChart: Chart | null = null;
  occupancyChart: Chart | null = null;

  selectedSiteId: string | null = null;
  fromDate: any;
  toDate: any;
  selectedSiteSub?: Subscription;
  footfallData: any;
  dwellData: any;
  liveOccpancyData: any;
  demographicsData: any;
  liveCount: number = 0;
  isOccupancyLoading = false;
  isDemographicsLoading = false;
  prevFootfallData: any;
  prevDwellData: any;
  prevOccupancyData: any;
  footfallChange: number = 0;
  dwellChange: number = 0;
  liveOccupancyChange: number = 0;

  constructor(private commonService: CommonService,
    private overviewDashboardService: OverviewDashboardService,
    private toastr: ToastrService,
    private socketService: SocketService,
    private cdr: ChangeDetectorRef
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
      this.resetCharts();
      this.isOccupancyLoading = true;
      this.isDemographicsLoading = true;
      this.callAllApi();
    });
    this.initSocketListener();
  }

  initSocketListener() {
    this.socketService.listen('live_occupancy').subscribe((data: any) => {
      if (this.selectedSiteId && data.siteId === this.selectedSiteId) {
        const date = new Date(data.ts);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        const localTime = `${hours}:${minutes}:${seconds}`;
        this.liveCount = data.siteOccupancy;
        if (this.liveOccpancyData && this.liveOccpancyData.buckets) {
          const newOccupancyBucket = {
            local: localTime,
            avg: data.siteOccupancy
          };
          this.liveOccpancyData.buckets.push(newOccupancyBucket);
          this.createOccupancyChart();
        }
        if (this.demographicsData && this.demographicsData.buckets) {
          const newDemographicsBucket = {
            local: localTime,
            male: data.genderCount?.male || 0,
            female: data.genderCount?.female || 0
          };
          this.demographicsData.buckets.push(newDemographicsBucket);
          this.createDemographicsChart();
          this.createDemographicsAnalysisChart();
        }
      }
    });
  }

  getPreviousDateRange(currentFrom: number) {
    const base = new Date(currentFrom);
    const start = Date.UTC(
      base.getUTCFullYear(),
      base.getUTCMonth(),
      base.getUTCDate() - 1,
      0, 0, 0, 0
    );
    const end = Date.UTC(
      base.getUTCFullYear(),
      base.getUTCMonth(),
      base.getUTCDate() - 1,
      23, 59, 59, 999
    );
    return {
      prevFromUtc: start,
      prevToUtc: end
    };
  }

  getComparisonData(payload: any) {
    this.overviewDashboardService.getFootfallAnalytics(payload).subscribe({
      next: (res: any) => {
        this.prevFootfallData = res;
        this.calculateFootfallChange();
      }
    });
    this.overviewDashboardService.getDwellAnalytics(payload).subscribe({
      next: (res: any) => {
        this.prevDwellData = res;
        this.calculateDwellChange();
      }
    });
    this.overviewDashboardService.getOccupanyAnalytics(payload).subscribe({
      next: (res: any) => {
        this.prevOccupancyData = res;
        this.calculateOccupancyChange();
      }
    });
  }

  calculateFootfallChange() {
    if (this.footfallData?.footfall !== undefined && this.prevFootfallData?.footfall) {
      const current = this.footfallData.footfall;
      const previous = this.prevFootfallData.footfall;
      if (previous === 0) {
        this.footfallChange = current > 0 ? 100 : 0;
      } else {
        const rawChange = ((current - previous) / previous) * 100;
        this.footfallChange = Math.round(Math.min(rawChange, 100));
      }
    } else {
      this.footfallChange = 0;
    }
  }

  calculateDwellChange() {
    if (this.dwellData?.dwellRecords !== undefined && this.prevDwellData?.dwellRecords !== undefined) {
      const current = this.dwellData.dwellRecords;
      const previous = this.prevDwellData.dwellRecords;
      if (previous === 0 || !previous) {
        this.dwellChange = current > 0 ? 100 : 0;
      } else {
        const rawChange = ((current - previous) / previous) * 100;
        this.dwellChange = Math.round(Math.min(rawChange, 100));
      }
    } else {
      this.dwellChange = 0;
    }
  }

  calculateOccupancyChange() {
    let prevAvg = 0;
    if (this.prevOccupancyData && this.prevOccupancyData.buckets && this.prevOccupancyData.buckets.length > 0) {
      const total = this.prevOccupancyData.buckets.reduce((acc: number, curr: any) => acc + (curr.avg || 0), 0);
      prevAvg = total / this.prevOccupancyData.buckets.length;
    }
    if (this.liveCount != undefined && prevAvg > 0) {
      const rawChange = ((this.liveCount - prevAvg) / prevAvg) * 100;
      this.liveOccupancyChange = Math.round(Math.min(rawChange, 100));
    } else if (this.liveCount > 0 && prevAvg == 0) {
      this.liveOccupancyChange = 100;
    } else {
      this.liveOccupancyChange = 0;
    }
  }

  callAllApi() {
    let fromUtc = Date.parse(this.fromDate)
    let toUtc = Date.parse(this.toDate)
    const payload = {
      "siteId": this.selectedSiteId,
      "fromUtc": fromUtc,
      "toUtc": toUtc,
    };
    this.getFootafallAnalytics(payload);
    this.getDwellAnalytics(payload);
    this.getOccupanyAnalytics(payload);
    this.getDempgraphicsAnalytics(payload);
    const { prevFromUtc, prevToUtc } = this.getPreviousDateRange(fromUtc);
    const prevPayload = {
      "siteId": this.selectedSiteId,
      "fromUtc": prevFromUtc,
      "toUtc": prevToUtc,
    };
    this.getComparisonData(prevPayload);
  }

  resetCharts() {
    if (this.occupancyChart) {
      this.occupancyChart.destroy();
      this.occupancyChart = null;
    }
    if (this.revenueChart) {
      this.revenueChart.destroy();
      this.revenueChart = null;
    }
    if (this.trafficChart) {
      this.trafficChart.destroy();
      this.trafficChart = null;
    }
  }

  getFootafallAnalytics(payload: any) {
    this.overviewDashboardService.getFootfallAnalytics(payload).subscribe({
      next: (response: any) => {
        if (!response) return;
        this.footfallData = response;
        this.calculateFootfallChange();
      },
      error: (error: any) => {
        console.log("error", error.error?.errorMessage)
      }
    });
  }

  getDwellAnalytics(payload: any) {
    this.overviewDashboardService.getDwellAnalytics(payload).subscribe({
      next: (response: any) => {
        this.dwellData = response;
      },
      error: (error: any) => {
        console.log("error", error.error?.errorMessage)
      }
    });
  }

  formatMinutesToMinSec(value: number): string {
    const minutes = Math.floor(value);
    const seconds = Math.round((value - minutes) * 60);
    return `${minutes}min ${seconds}sec`;
  }

  getOccupanyAnalytics(payload: any) {
    this.isOccupancyLoading = true;
    this.overviewDashboardService.getOccupanyAnalytics(payload).subscribe({
      next: (response: any) => {
        this.liveOccpancyData = response;
        if (this.liveOccpancyData?.buckets?.length) {
          this.liveCount = this.liveOccpancyData.buckets[this.liveOccpancyData.buckets.length - 1].avg;
        }
        this.isOccupancyLoading = false;
        this.cdr.detectChanges();
        this.createOccupancyChart();
      },
      error: (error: any) => {
        console.log("error", error.error?.errorMessage)
        this.isOccupancyLoading = false;
      }
    });
  }

  getDempgraphicsAnalytics(payload: any) {
    this.isDemographicsLoading = true;
    this.overviewDashboardService.getDempgraphicsAnalytics(payload).subscribe({
      next: (response: any) => {
        this.demographicsData = response;
        this.isDemographicsLoading = false;
        this.cdr.detectChanges();
        this.createDemographicsChart();
        this.createDemographicsAnalysisChart();
      },
      error: (error: any) => {
        console.log("error", error.error?.errorMessage)
        this.isDemographicsLoading = false;
      }
    });
  }

  getGenderDistribution(buckets: any[]) {
    if (!buckets || !buckets.length) {
      return { male: 0, female: 0 };
    }
    const totals = buckets.reduce(
      (acc, cur) => {
        acc.male += cur.male || 0;
        acc.female += cur.female || 0;
        return acc;
      },
      { male: 0, female: 0 }
    );
    const avgMale = totals.male / buckets.length;
    const avgFemale = totals.female / buckets.length;
    const sum = avgMale + avgFemale;
    return {
      male: +(avgMale / sum * 100).toFixed(1),
      female: +(avgFemale / sum * 100).toFixed(1)
    };
  }

  createDemographicsChart() {
    if (!this.revenueChartRef) return;
    const ctx = this.revenueChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    if (this.revenueChart) {
      this.revenueChart.destroy();
    }

    const { male, female } = this.getGenderDistribution(this.demographicsData.buckets);

    const centerTextPlugin = {
      id: 'centerTextPlugin',
      afterDraw(chart: any) {
        const { ctx, chartArea: { top, bottom, left, right } } = chart;
        ctx.save();

        const centerX = (left + right) / 2;
        const centerY = (top + bottom) / 2;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.font = '500 14px Inter, system-ui';
        ctx.fillStyle = '#6B7280';
        ctx.fillText('Total Crowd', centerX, centerY - 12);

        ctx.font = '700 22px Inter, system-ui';
        ctx.fillStyle = '#111827';
        ctx.fillText('100%', centerX, centerY + 12);

        ctx.restore();
      }
    };
    this.revenueChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Males', 'Females'],
        datasets: [
          {
            data: [male, female],
            backgroundColor: ['rgba(71, 178, 176, 0.4)', 'rgba(42, 127, 125, 0.6)'],
            borderWidth: 0,
            spacing: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        layout: {
          padding: 0
        },
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            align: 'start',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 20,
              boxWidth: 8,
              boxHeight: 8,
              color: '#111827',
              font: {
                size: 14,
                weight: 500
              },
              generateLabels(chart) {
                const dataset = chart.data.datasets[0] as any;
                return chart.data.labels!.map((label, i) => ({
                  text: `${dataset.data[i]}% ${label}`,
                  fillStyle: dataset.backgroundColor[i],
                  strokeStyle: dataset.backgroundColor[i],
                  index: i,
                  hidden: false
                }));
              }
            }
          },
          tooltip: { enabled: false }
        }
      },
      plugins: [centerTextPlugin]
    });
  }

  createDemographicsAnalysisChart(): void {
    if (!this.trafficChartRef) return;
    const ctx = this.trafficChartRef.nativeElement.getContext('2d');
    if (!ctx) return;
    if (this.trafficChart) {
      this.trafficChart.destroy();
    }
    const series = this.demographicsData.buckets;

    const labels = series.map((p: any) => {
      const m = p.local.match(/\b(\d{2}:\d{2})/);
      return m ? m[1] : '';
    });
    const maleData = series.map((p: any) => p.male);
    const femaleData = series.map((p: any) => p.female);

    const allValues = [...maleData, ...femaleData];
    const maxDataValue = Math.max(...allValues, 0);
    const dynamicMax = maxDataValue > 0 ? Math.ceil(maxDataValue * 1.2) : 10;
    const stepSize = Math.ceil(dynamicMax / 6);

    this.trafficChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Male',
            data: maleData,
            borderColor: 'rgba(42, 127, 125, 0.6)',
            backgroundColor: 'rgba(42, 127, 125, 0.2)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: 'rgba(77, 182, 172, 1)',
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 2
          },
          {
            label: 'Female',
            data: femaleData,
            borderColor: 'rgba(71, 178, 176, 0.4)',
            backgroundColor: 'rgba(71, 178, 176, 0.2)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: 'rgba(129, 199, 212, 1)',
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 20,
              font: {
                size: 13,
                weight: 500
              },
            }
          },
          tooltip: {
            backgroundColor: '#fff',
            titleColor: '#1D1D1B',
            bodyColor: '#1D1D1B',
            borderColor: '#E9EDF7',
            borderWidth: 1,
            padding: 12,
            displayColors: false,
            callbacks: {
              label: function (context) {
                const label = context.dataset.label || '';
                const val = context.parsed.y;
                return `${label}: ${val}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              color: '#666',
              font: {
                size: 11
              }
            },
            title: {
              display: true,
              text: 'Time',
              color: '#666',
              font: {
                size: 12,
                weight: 500
              },
              padding: { top: 10 }
            }
          },
          y: {
            beginAtZero: true,
            suggestedMax: dynamicMax,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              color: '#666',
              font: {
                size: 11
              },
              stepSize: stepSize
            },
            title: {
              display: true,
              text: 'Count',
              color: '#666',
              font: {
                size: 12,
                weight: 500
              },
              padding: { bottom: 10 }
            }
          }
        }
      }
    });
  }

  createOccupancyChart(): void {
    if (!this.occupancyChartRef) return;
    const ctx = this.occupancyChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    if (this.occupancyChart) {
      this.occupancyChart.destroy();
    }

    const occupancySeries = this.liveOccpancyData.buckets;

    const labels = occupancySeries.map((p: any) => {
      const match = p.local?.match(/\b(\d{2}:\d{2})/);
      return match ? match[1] : '';
    });

    const values = occupancySeries.map((p: any) => p.avg);
    const liveMarkerPlugin = {
      id: 'liveMarkerPlugin',
      afterDatasetsDraw: (chart: any) => {
        const { ctx, chartArea, scales } = chart;
        const xScale = scales.x;
        const yScale = scales.y;
        if (!xScale || !yScale) return;
        const labels = chart.data.labels as string[];
        const liveIndex = labels ? labels.length - 1 : 0;
        const x = xScale.getPixelForValue(liveIndex);
        ctx.save();
        ctx.setLineDash([6, 6]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#C2410C'; // reddish
        ctx.beginPath();
        ctx.moveTo(x, chartArea.top);
        ctx.lineTo(x, chartArea.bottom);
        ctx.stroke();
        ctx.setLineDash([]);
        const badgeText = 'LIVE';
        ctx.font = '600 12px Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial';
        const textMetrics = ctx.measureText(badgeText);
        const paddingX = 8;
        const paddingY = 4;
        const badgeW = textMetrics.width + paddingX * 2;
        const badgeH = 20;
        const badgeX = x - badgeW / 2;
        const badgeY = chartArea.top + 8;
        const r = 6;
        ctx.fillStyle = '#B91C1C';
        ctx.beginPath();
        ctx.moveTo(badgeX + r, badgeY);
        ctx.lineTo(badgeX + badgeW - r, badgeY);
        ctx.quadraticCurveTo(badgeX + badgeW, badgeY, badgeX + badgeW, badgeY + r);
        ctx.lineTo(badgeX + badgeW, badgeY + badgeH - r);
        ctx.quadraticCurveTo(badgeX + badgeW, badgeY + badgeH, badgeX + badgeW - r, badgeY + badgeH);
        ctx.lineTo(badgeX + r, badgeY + badgeH);
        ctx.quadraticCurveTo(badgeX, badgeY + badgeH, badgeX, badgeY + badgeH - r);
        ctx.lineTo(badgeX, badgeY + r);
        ctx.quadraticCurveTo(badgeX, badgeY, badgeX + r, badgeY);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + badgeH / 2 + 0.5);

        ctx.restore();
      }
    };

    this.occupancyChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Occupancy',
          data: values,
          borderColor: 'rgba(77, 182, 172, 1)',
          backgroundColor: 'rgba(77, 182, 172, 0.2)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 8,
          pointHoverBackgroundColor: 'rgba(77, 182, 172, 1)',
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 3,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              color: 'rgba(77, 182, 172, 1)',
              font: {
                size: 12,
                weight: 500
              },
              padding: 20
            }
          },
          tooltip: {
            backgroundColor: '#fff',
            titleColor: '#1D1D1B',
            bodyColor: '#1D1D1B',
            borderColor: '#E9EDF7',
            borderWidth: 1,
            padding: 12,
            displayColors: false,
            callbacks: {
              label: function (context) {
                return 'Count: ' + context.parsed.y;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: '#666',
              font: {
                size: 11
              }
            },
            title: {
              display: true,
              text: 'Time',
              color: '#666',
              font: {
                size: 12,
                weight: 500
              },
              padding: { top: 10 }
            }
          },
          y: {
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              color: '#666',
              font: {
                size: 11
              },
              stepSize: 20
            },
            title: {
              display: true,
              text: 'Count',
              color: '#666',
              font: {
                size: 12,
                weight: 500
              },
              padding: { bottom: 10 }
            }
          }
        }
      },
      plugins: [liveMarkerPlugin]
    });
  }

  ngOnDestroy(): void {
    if (this.selectedSiteSub) {
      this.selectedSiteSub.unsubscribe();
    }
    if (this.revenueChart) {
      this.revenueChart.destroy();
    }
    if (this.trafficChart) {
      this.trafficChart.destroy();
    }
    if (this.occupancyChart) {
      this.occupancyChart.destroy();
    }
  }
}
