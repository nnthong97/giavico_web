import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AppLanguage, LanguageService } from '../../../core/i18n/language.service';
import { ThemeService } from '../../../core/theme/theme.service';

@Component({
  selector: 'app-rnd-document-header',
  standalone: true,
  imports: [RouterModule],
  template: `
    <aside class="document-menu" aria-label="Page management">
      <a routerLink="/" class="brand" aria-label="Giavico R&D Console">
        <span class="brand-mark">G</span>
        <span><strong>Giavico</strong><small>R&D Console</small></span>
      </a>

      <nav class="document-menu-list">
        <a routerLink="/" class="document-menu-item" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
          <span>FM</span>
          {{ t('formulaManagement') }}
        </a>
        <a routerLink="/documents" class="document-menu-item" routerLinkActive="active">
          <span>DC</span>
          {{ t('rndDocuments') }}
        </a>
        <a routerLink="/" class="document-menu-item">
          <span>PG</span>
          {{ t('processGeneral') }}
        </a>
        <a routerLink="/" class="document-menu-item">
          <span>ST</span>
          {{ t('settings') }}
        </a>
        <a routerLink="/" class="document-menu-item">
          <span>AC</span>
          {{ t('account') }}
        </a>
        <a routerLink="/" class="document-menu-item">
          <span>AI</span>
          {{ t('chatbot') }}
        </a>
      </nav>
    </aside>

    <header class="document-header">
      <div>
        <h1>{{ t('rndDocuments') }}</h1>
        <p>{{ t('documentControlSubtitle') }}</p>
      </div>
      <div class="tools">
        <label class="language-select">
          <span>{{ t('language') }}</span>
          <select [value]="languageService.language()" (change)="setLanguage($any($event.target).value)">
            <option value="en">EN</option>
            <option value="vi">VI</option>
            <option value="zh-TW">繁中</option>
          </select>
        </label>
        <button type="button" (click)="themeService.toggleTheme()">
          {{ themeService.theme() === 'dark' ? t('lightMode') : t('darkMode') }}
        </button>
      </div>
    </header>
  `,
  styleUrls: ['../styles/rnd-documents.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RndDocumentHeaderComponent {
  public readonly languageService = inject(LanguageService);
  public readonly themeService = inject(ThemeService);

  public t(key: string): string {
    return this.languageService.translate(key);
  }

  public setLanguage(language: AppLanguage): void {
    this.languageService.setLanguage(language);
  }
}
