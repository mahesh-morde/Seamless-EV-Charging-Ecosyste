import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EcosystemService } from '../../services/ecosystem.service';
import { TranslatePipe } from '../../services/translate.pipe';
import { TranslationService } from '../../services/translation.service';

declare const Chart: any;

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.scss']
})
export class AnalyticsComponent implements AfterViewInit, OnDestroy {
  energyChartInstance: any = null;
  providerChartInstance: any = null;
  co2ChartInstance: any = null;

  constructor(public eco: EcosystemService, private ts: TranslationService) {}

  private chartCallback = () => this.updateChartsData();
  private langCallback = () => this.updateChartLabels();

  async ngAfterViewInit() {
    await this.eco.ensureSessionHistoryLoaded();
    this.initCharts();
    // Register change listener to re-render charts when history updates
    this.eco.registerChartCallback(this.chartCallback);
    this.ts.registerLangCallback(this.langCallback);
  }

  ngOnDestroy() {
    this.eco.unregisterChartCallback(this.chartCallback);
    this.ts.unregisterLangCallback(this.langCallback);
    // Clean up chart instances to prevent canvas memory leaks
    if (this.energyChartInstance) this.energyChartInstance.destroy();
    if (this.providerChartInstance) this.providerChartInstance.destroy();
    if (this.co2ChartInstance) this.co2ChartInstance.destroy();
  }

  initCharts() {
    // A. Weekly energy line chart
    const energyCtx = document.getElementById("energy-chart") as any;
    if (!energyCtx) return;
    
    const energyCtx2D = energyCtx.getContext("2d");
    const cyanGradient = energyCtx2D.createLinearGradient(0, 0, 0, 200);
    cyanGradient.addColorStop(0, 'rgba(6, 182, 212, 0.4)');
    cyanGradient.addColorStop(1, 'rgba(6, 182, 212, 0.0)');

    this.energyChartInstance = new Chart(energyCtx2D, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Energy Consumption (kWh)',
                data: [12, 19, 3, 25, 2, 45, 18],
                borderColor: '#06b6d4',
                backgroundColor: cyanGradient,
                fill: true,
                tension: 0.4,
                borderWidth: 3,
                pointBackgroundColor: '#06b6d4'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } },
                x: { grid: { display: false }, ticks: { color: '#9ca3af' } }
            }
        }
    });

    // B. Provider Breakdown doughnut
    const providerCtx = document.getElementById("provider-chart") as any;
    if (!providerCtx) return;

    this.providerChartInstance = new Chart(providerCtx.getContext("2d"), {
        type: 'doughnut',
        data: {
            labels: ['Tata Power', 'Zeon', 'ChargeZone', 'Bolt'],
            datasets: [{
                data: [45, 25, 20, 10],
                backgroundColor: ['#06b6d4', '#10b981', '#a855f7', '#fbbf24'],
                borderWidth: 0,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#9ca3af', font: { family: 'Inter' } }
                }
            }
        }
    });

    // C. CO2 offset bar chart
    const co2Ctx = document.getElementById("co2-chart") as any;
    if (!co2Ctx) return;

    this.co2ChartInstance = new Chart(co2Ctx.getContext("2d"), {
        type: 'bar',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{
                label: 'CO2 Offset (kg)',
                data: [42, 68, 110, this.eco.co2Saved],
                backgroundColor: '#10b981',
                borderRadius: 6,
                barPercentage: 0.6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } },
                x: { grid: { display: false }, ticks: { color: '#9ca3af' } }
            }
        }
    });

    this.updateChartsData();
    this.updateChartLabels();
  }

  updateChartsData() {
    if (!this.energyChartInstance || !this.providerChartInstance || !this.co2ChartInstance) return;
    if (!document.getElementById("energy-chart")) return;
    
    let tata = 0, zeon = 0, cz = 0, bolt = 0;
    let energies = [0, 0, 0, 0, 0, 0, 0];
    
    this.eco.sessionHistory.forEach((r, idx) => {
        if (r.network === "Tata Power") tata++;
        else if (r.network === "Zeon") zeon++;
        else if (r.network === "ChargeZone") cz++;
        else if (r.network === "Bolt") bolt++;
        
        const dayIdx = (idx * 2) % 7;
        energies[dayIdx] += r.energy;
    });

    this.providerChartInstance.data.datasets[0].data = [tata, zeon, cz, bolt];
    this.providerChartInstance.update();

    this.energyChartInstance.data.datasets[0].data = energies.map(e => e === 0 ? Math.random() * 15 + 5 : e);
    this.energyChartInstance.update();

    this.co2ChartInstance.data.datasets[0].data[3] = parseFloat(this.eco.co2Saved.toFixed(1));
    this.co2ChartInstance.update();
  }

  updateChartLabels() {
    if (this.energyChartInstance) {
      this.energyChartInstance.data.datasets[0].label = this.ts.translate('WEEKLY_CONSUMPTION_LABEL');
      this.energyChartInstance.data.labels = [
        this.ts.translate('MON'),
        this.ts.translate('TUE'),
        this.ts.translate('WED'),
        this.ts.translate('THU'),
        this.ts.translate('FRI'),
        this.ts.translate('SAT'),
        this.ts.translate('SUN')
      ];
      this.energyChartInstance.update();
    }

    if (this.providerChartInstance) {
      this.providerChartInstance.data.labels = [
        this.ts.translate('TATA_POWER'),
        this.ts.translate('ZEON'),
        this.ts.translate('CHARGE_ZONE'),
        this.ts.translate('BOLT')
      ];
      this.providerChartInstance.update();
    }

    if (this.co2ChartInstance) {
      this.co2ChartInstance.data.datasets[0].label = this.ts.translate('CO2_OFFSET_LABEL');
      this.co2ChartInstance.data.labels = [
        `${this.ts.translate('WEEK')} 1`,
        `${this.ts.translate('WEEK')} 2`,
        `${this.ts.translate('WEEK')} 3`,
        `${this.ts.translate('WEEK')} 4`
      ];
      this.co2ChartInstance.update();
    }
  }
}
