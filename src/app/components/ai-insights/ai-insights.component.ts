import { Component, OnInit, AfterViewChecked, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EcosystemService, ChatMessage, AiAgent } from '../../services/ecosystem.service';
import { TranslatePipe } from '../../services/translate.pipe';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-ai-insights',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './ai-insights.component.html',
  styleUrls: ['./ai-insights.component.scss']
})
export class AiInsightsComponent implements OnInit, AfterViewChecked {
  @ViewChild('messageContainer') private messageContainer!: ElementRef;

  activeAgentId = 'voltadvisor';
  userInput = '';
  isTyping = false;

  constructor(public eco: EcosystemService, public ts: TranslationService) {}

  ngOnInit() {
    this.eco.getChatHistory(this.activeAgentId);
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  get activeAgent(): AiAgent {
    return this.eco.aiAgents.find(a => a.id === this.activeAgentId) || this.eco.aiAgents[0];
  }

  get chatMessages(): ChatMessage[] {
    return this.eco.getChatHistory(this.activeAgentId);
  }

  selectAgent(agentId: string) {
    this.activeAgentId = agentId;
    this.eco.getChatHistory(agentId);
    this.scrollToBottom();
  }

  sendMessage() {
    if (!this.userInput.trim() || this.isTyping) return;

    const text = this.userInput;
    this.userInput = '';
    this.isTyping = true;

    this.eco.sendChatMessage(this.activeAgentId, text, () => {
      this.isTyping = false;
      this.scrollToBottom();
    });
  }

  useSuggestion(suggestionKey: string) {
    const text = this.ts.translate(suggestionKey);
    if (!text || this.isTyping) return;
    
    this.isTyping = true;
    this.eco.sendChatMessage(this.activeAgentId, text, () => {
      this.isTyping = false;
      this.scrollToBottom();
    });
  }

  private scrollToBottom(): void {
    try {
      this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
    } catch (err) {
      // Container not rendered yet
    }
  }

  formatMessage(text: string): string {
    if (!text) return '';
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
               .replace(/\n/g, '<br>');
  }

  get localizedRangeText(): string {
    return this.ts.translate('INSIGHT_CARD_RANGE_DESC')
      .replace('{{range}}', this.eco.estimatedRange.toString());
  }

  get localizedGridText(): string {
    return this.ts.translate('INSIGHT_CARD_GRID_DESC')
      .replace('{{load}}', this.eco.gridLoad.toString());
  }

  get localizedWalletText(): string {
    if (this.eco.walletBalance < 100) {
      return this.ts.translate('INSIGHT_CARD_LOW_FUNDS_DESC')
        .replace('{{balance}}', this.eco.walletBalance.toFixed(2));
    }
    return this.ts.translate('INSIGHT_CARD_WALLET_DESC')
      .replace('{{balance}}', this.eco.walletBalance.toFixed(2));
  }
}
