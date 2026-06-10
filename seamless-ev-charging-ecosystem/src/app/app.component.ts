import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EcosystemService } from './services/ecosystem.service';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { MapComponent } from './components/map/map.component';
import { OcppTerminalComponent } from './components/ocpp-terminal/ocpp-terminal.component';
import { WalletComponent } from './components/wallet/wallet.component';
import { AnalyticsComponent } from './components/analytics/analytics.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    DashboardComponent,
    MapComponent,
    OcppTerminalComponent,
    WalletComponent,
    AnalyticsComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  constructor(public eco: EcosystemService) {}

  switchTab(tabId: string) {
    this.eco.activeTab = tabId;
    
    // Trigger Leaflet map redraw if map tab is selected
    if (tabId === 'map') {
      if (this.eco.map) {
        setTimeout(() => this.eco.map.invalidateSize(), 100);
      }
    }
  }

  toggleThemeMapping() {
    this.eco.showThemeMapping = !this.eco.showThemeMapping;
    if (this.eco.showThemeMapping) {
      this.eco.showToast("Hackathon theme mapping overlays visible.", 'info');
    } else {
      this.eco.showToast("Returning to active dashboard.", 'info');
    }
  }

  toggleNetworkConnection() {
    this.eco.toggleNetworkConnection();
  }

  toggleRole() {
    this.eco.toggleRole();
  }

  toggleTheme() {
    this.eco.toggleTheme();
  }

  toggleGridOverload() {
    this.eco.toggleGridOverload();
  }
}
