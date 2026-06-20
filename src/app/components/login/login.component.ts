import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EcosystemService } from '../../services/ecosystem.service';
import { TranslatePipe } from '../../services/translate.pipe';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './login.component.html',
  styleUrls: []
})
export class LoginComponent {
  username = '';
  password = '';

  constructor(public eco: EcosystemService) {}

  onSubmit() {
    if (!this.username || !this.password) {
      this.eco.showToast('TOAST_FILL_REQUIRED', 'danger');
      return;
    }
    this.eco.login(this.username, this.password);
  }
}
