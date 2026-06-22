import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EcosystemService } from './services/ecosystem.service';
import { TranslationService } from './services/translation.service';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { MapComponent } from './components/map/map.component';
import { OcppTerminalComponent } from './components/ocpp-terminal/ocpp-terminal.component';
import { WalletComponent } from './components/wallet/wallet.component';
import { AnalyticsComponent } from './components/analytics/analytics.component';
import { LoginComponent } from './components/login/login.component';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

import { TranslatePipe } from './services/translate.pipe';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    DashboardComponent,
    MapComponent,
    OcppTerminalComponent,
    WalletComponent,
    AnalyticsComponent,
    LoginComponent,
    RouterOutlet
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  isSidebarCollapsed = false;
  isMobileSidebarOpen = false;
  isMobileToolsOpen = false;
  private routerSub!: Subscription;
  constructor(public eco: EcosystemService, public ts: TranslationService, private router: Router) {}
  toggleMobileToolsModal() {
    this.isMobileToolsOpen = !this.isMobileToolsOpen;
  }
  closeMobileToolsModal() {
    this.isMobileToolsOpen = false;
  }

  ngOnInit() {
    this.routerSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = event.urlAfterRedirects || event.url;
      const path = url.split('/')[1] || 'dashboard';
      if (['dashboard', 'map', 'ocpp', 'wallet', 'analytics', 'ai-insights'].includes(path)) {
        this.eco.activeTab = path;
      }
    });
  }

  ngOnDestroy() {
    if (this.routerSub) {
      this.routerSub.unsubscribe();
    }
  }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    if (this.eco.map) {
      setTimeout(() => this.eco.map.invalidateSize(), 300);
    }
  }

  changeLang(event: Event) {
    const selectEl = event.target as HTMLSelectElement;
    this.ts.setLanguage(selectEl.value as 'en' | 'es' | 'hi' | 'kn');
  }

  switchTab(tabId: string) {
    this.router.navigate([`/${tabId}`]);
    this.closeMobileSidebar();
    this.closeMobileToolsModal();
  }
  toggleMobileSidebar() {
    this.isMobileSidebarOpen = !this.isMobileSidebarOpen;
  }
  closeMobileSidebar() {
    this.isMobileSidebarOpen = false;
  }

  toggleThemeMapping() {
    this.eco.showThemeMapping = !this.eco.showThemeMapping;
    if (this.eco.showThemeMapping) {
      this.eco.showToast('TOAST_OVERLAYS_VISIBLE', 'info');
    } else {
      this.eco.showToast('TOAST_RETURN_DASHBOARD', 'info');
    }
  }

  toggleNetworkConnection() {
    this.eco.toggleNetworkConnection();
  }

  toggleRole() {
    if (this.eco.loggedInUser !== 'admin') {
      this.eco.showToast('TOAST_ADMIN_ONLY', 'danger');
      return;
    }
    this.eco.toggleRole();
    if (this.eco.activeTab === 'dashboard' && this.router.url.includes('/ocpp')) {
      this.router.navigate(['/dashboard']);
    }
  }

  toggleTheme() {
    this.eco.toggleTheme();
  }

  toggleGridOverload() {
    this.eco.toggleGridOverload();
  }

  logout() {
    this.eco.logout();
    this.router.navigate(['/login']);
  }
}
