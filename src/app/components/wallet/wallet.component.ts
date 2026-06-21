import { Component, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EcosystemService } from '../../services/ecosystem.service';
import { TranslatePipe } from '../../services/translate.pipe';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './wallet.component.html',
  styleUrls: ['./wallet.component.scss']
})
export class WalletComponent implements OnInit {
  topupAmount = 500;
  paymentMethod = 'upi';
  private readonly razorpayKeyId = 'rzp_test_T3Tv709mDxmDRd';

  selectedType: 'all' | 'payment' | 'topup' = 'all';
  startDate = '';
  endDate = '';

  constructor(public eco: EcosystemService, private ts: TranslationService, private ngZone: NgZone) {}

  ngOnInit() {
    this.eco.ensureWalletTransactionsLoaded();
  }

  get filteredTransactions() {
    return this.eco.walletTransactions.filter(tx => {
      // 1. Filter by Type
      if (this.selectedType !== 'all' && tx.type !== this.selectedType) {
        return false;
      }

      // 2. Filter by Date range
      const txDateOnly = tx.date.split(' ')[0]; // "YYYY-MM-DD"
      if (this.startDate && txDateOnly < this.startDate) {
        return false;
      }
      if (this.endDate && txDateOnly > this.endDate) {
        return false;
      }

      return true;
    });
  }

  submitTopup() {
    if (isNaN(this.topupAmount) || this.topupAmount <= 0) {
      this.eco.showToast('ERR_VALID_AMOUNT', 'danger');
      return;
    }

    const RazorpayConstructor = (window as any).Razorpay;
    if (RazorpayConstructor) {
      const options = {
        key: this.razorpayKeyId,
        amount: this.topupAmount * 100, // Amount in paise
        currency: "INR",
        name: "VoltStream Pay",
        description: this.ts.translate('ADD_FUNDS_TITLE'),
        handler: (response: any) => {
          this.ngZone.run(() => {
            const paymentId = response.razorpay_payment_id || 'pay_test_' + Math.random().toString(36).substring(2, 10).toUpperCase();
            this.completePayment(paymentId);
          });
        },
        modal: {
          ondismiss: () => {
            this.ngZone.run(() => {
              this.eco.showToast('TOAST_PAYMENT_CANCELLED', 'warning');
            });
          }
        },
        prefill: {
          name: "Mahindra Owner",
          email: "owner@voltstream.ev",
          contact: "+919999999999"
        },
        theme: {
          color: "#06b6d4" // VoltStream neon cyan theme accent
        }
      };

      try {
        const rzp = new RazorpayConstructor(options);
        rzp.open();
      } catch (err) {
        console.error('Failed to initialize Razorpay', err);
        this.eco.showToast('TOAST_RZP_KEY_INVALID', 'danger');
      }
    } else {
      // Offline fallback / script blocked simulation
      this.eco.showToast('TOAST_PAYMENT_SIMULATING', 'warning');
      setTimeout(() => {
        const dummyPaymentId = 'pay_sim_' + Math.random().toString(36).substring(2, 10).toUpperCase();
        this.completePayment(dummyPaymentId);
      }, 1500);
    }
  }

  completePayment(paymentId: string) {
    this.eco.walletBalance += this.topupAmount;

    // Add to wallet transactions list
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    this.eco.walletTransactions.unshift({
      id: paymentId,
      date: formattedDate,
      type: 'topup',
      description: `Fund Added via ${this.paymentMethod.toUpperCase()}`,
      amount: this.topupAmount,
      status: 'Success',
      method: this.paymentMethod.toUpperCase()
    });

    this.eco.showToast('FUNDS_LOADED_SUCCESS', 'success', {
      amount: this.topupAmount.toFixed(2),
      method: this.paymentMethod.toUpperCase(),
      paymentId: paymentId
    });
    this.topupAmount = 500;
  }

  exportLogs() {
    this.eco.showToast('EXPORTING_CSV', 'success');

    const headers = ['Transaction ID', 'Date/Time', 'Type', 'Description', 'Amount (INR)', 'Method/Network', 'Status'];
    const rows = this.filteredTransactions.map(tx => [
      tx.id,
      tx.date,
      tx.type === 'topup' ? 'Credit' : 'Debit',
      tx.description.replace(/"/g, '""'), // Escape double quotes for CSV
      tx.amount,
      tx.method,
      tx.status
    ]);

    // Construct CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val}"`).join(','))
    ].join('\n');

    // Create file blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `VoltStream_Wallet_Transactions_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
  getTranslatedDescription(desc: string, method?: string): string {
    if (desc && desc.startsWith('Fund Added via')) {
      return this.ts.translate('FUND_ADDED_VIA', { method: method || 'UPI' });
    }
    return desc;
  }
}
