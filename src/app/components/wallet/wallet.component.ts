import { Component, NgZone } from '@angular/core';
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
  styleUrls: []
})
export class WalletComponent {
  topupAmount = 500;
  paymentMethod = 'upi';
  private readonly razorpayKeyId = 'rzp_test_T3Tv709mDxmDRd';

  constructor(public eco: EcosystemService, private ts: TranslationService, private ngZone: NgZone) {}

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
    this.eco.showToast('FUNDS_LOADED_SUCCESS', 'success', {
      amount: this.topupAmount.toFixed(2),
      method: this.paymentMethod.toUpperCase(),
      paymentId: paymentId
    });
    this.topupAmount = 500;
  }

  exportLogs() {
    this.eco.showToast('EXPORTING_CSV', 'success');
  }
}
