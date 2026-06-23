import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AppLanguage, LanguageService } from '../../../core/i18n/language.service';
import { ThemeService } from '../../../core/theme/theme.service';

@Component({
  selector: 'app-rnd-document-header',
  standalone: true,
  imports: [RouterModule],
  template: `
    <header class="document-header">
      <a routerLink="/documents" class="brand" aria-label="R&D document management">
        <span class="brand-mark">G</span>
        <span><strong>Giavico</strong><small>R&D Document Control</small></span>
      </a>
      <nav>
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">{{ t('formulaManagement') }}</a>
        <a routerLink="/documents" routerLinkActive="active">{{ t('rndDocuments') }}</a>
      </nav>
      <div class="tools">
        <label>
          <span class="sr-only">{{ t('language') }}</span>
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
