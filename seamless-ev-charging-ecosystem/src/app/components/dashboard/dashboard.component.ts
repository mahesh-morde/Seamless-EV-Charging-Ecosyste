import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EcosystemService } from '../../services/ecosystem.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: []
})
export class DashboardComponent {
  constructor(public eco: EcosystemService) {}

  openMap() {
    this.eco.activeTab = 'map';
    if (this.eco.map) {
      setTimeout(() => this.eco.map.invalidateSize(), 100);
    }
  }

  startPlugAndCharge() {
    this.eco.startPlugAndChargeSimulation();
  }

  stopCharging() {
    this.eco.stopChargingSession();
  }

  get activeKwRate(): number {
    return this.eco.activeSession ? this.eco.activeSession.kwRate : 0;
  }

  get activeTimeRemaining(): string {
    if (!this.eco.activeSession) return '0 mins';
    const speed = this.eco.activeSession.station.speed;
    const speedkW = speed.includes("150kW") ? 150 : 
                    speed.includes("120kW") ? 120 : 
                    speed.includes("60kW") ? 60 : 
                    speed.includes("50kW") ? 50 : 22;
    const minLeft = Math.round(((100 - this.eco.vehicleSoc) / (speedkW / 60)) * 0.15);
    return minLeft > 0 ? `${minLeft} mins` : "Almost done";
  }
}
