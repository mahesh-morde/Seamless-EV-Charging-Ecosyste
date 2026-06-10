import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EcosystemService } from '../../services/ecosystem.service';

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './wallet.component.html',
  styleUrls: []
})
export class WalletComponent {
  topupAmount = 500;
  paymentMethod = 'upi';

  constructor(public eco: EcosystemService) {}

  submitTopup() {
    if (isNaN(this.topupAmount) || this.topupAmount <= 0) {
      this.eco.showToast("Please enter a valid amount.", 'danger');
      return;
    }

    this.eco.walletBalance += this.topupAmount;
    this.eco.showToast(`₹${this.topupAmount.toFixed(2)} added to Unified Wallet via ${this.paymentMethod.toUpperCase()}.`, 'success');
    this.topupAmount = 500;
  }

  exportLogs() {
    this.eco.showToast("Exporting transactions to CSV...", 'success');
  }
}
