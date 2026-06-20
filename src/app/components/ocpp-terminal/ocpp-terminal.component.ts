import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EcosystemService } from '../../services/ecosystem.service';
import { TranslatePipe } from '../../services/translate.pipe';

@Component({
  selector: 'app-ocpp-terminal',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './ocpp-terminal.component.html',
  styleUrls: []
})
export class OcppTerminalComponent {
  constructor(public eco: EcosystemService) {}

  clearLogs() {
    this.eco.clearLogs();
  }

  simulateReboot() {
    this.eco.simulateHardReset();
  }

  mathMin(a: number, b: number): number {
    return Math.min(a, b);
  }
}
