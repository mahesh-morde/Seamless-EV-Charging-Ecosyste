import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { MapComponent } from './components/map/map.component';
import { OcppTerminalComponent } from './components/ocpp-terminal/ocpp-terminal.component';
import { WalletComponent } from './components/wallet/wallet.component';
import { AnalyticsComponent } from './components/analytics/analytics.component';
import { AiInsightsComponent } from './components/ai-insights/ai-insights.component';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { EcosystemService } from './services/ecosystem.service';

const authGuard = () => {
  const eco = inject(EcosystemService);
  const router = inject(Router);
  if (!eco.isLoggedIn) {
    router.navigate(['/login']);
    return false;
  }
  return true;
};

const loginGuard = () => {
  const eco = inject(EcosystemService);
  const router = inject(Router);
  if (eco.isLoggedIn) {
    router.navigate(['/dashboard']);
    return false;
  }
  return true;
};

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'login', component: LoginComponent, canActivate: [loginGuard] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'map', component: MapComponent, canActivate: [authGuard] },
  { path: 'ocpp', component: OcppTerminalComponent, canActivate: [authGuard] },
  { path: 'wallet', component: WalletComponent, canActivate: [authGuard] },
  { path: 'analytics', component: AnalyticsComponent, canActivate: [authGuard] },
  { path: 'ai-insights', component: AiInsightsComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'dashboard' }
];
