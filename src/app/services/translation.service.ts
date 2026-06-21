import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private translations: any = {};
  private currentLang = 'en';
  private langCallbacks: (() => void)[] = [];

  constructor() {
    this.loadTranslations();
  }

  async loadTranslations() {
    try {
      const response = await fetch(`./i18n/${this.currentLang}.json`);
      this.translations = await response.json();
      this.notifyLangChange();
    } catch (e) {
      console.error('Failed to load translations', e);
    }
  }

  translate(key: string, params?: any): string {
    let val = this.translations[key] || key;
    if (params) {
      Object.keys(params).forEach(k => {
        val = val.split(`{{${k}}}`).join(params[k]);
      });
    }
    return val;
  }

  setLanguage(lang: 'en' | 'es' | 'hi' | 'kn') {
    this.currentLang = lang;
    this.loadTranslations();
  }

  getCurrentLanguage(): string {
    return this.currentLang;
  }

  registerLangCallback(cb: () => void) {
    this.langCallbacks.push(cb);
  }

  unregisterLangCallback(cb: () => void) {
    this.langCallbacks = this.langCallbacks.filter(c => c !== cb);
  }

  notifyLangChange() {
    this.langCallbacks.forEach(cb => cb());
  }
}
