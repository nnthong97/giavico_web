import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { BeverageFormula } from '../models/formulation.model';
import { OllamaFormulationService } from '../data-access/ollama-formulation.service';
import { ThemeService } from '../../../core/theme/theme.service';
import { AppLanguage, LanguageService } from '../../../core/i18n/language.service';

interface GeneratedTextSection {
  title: string;
  paragraphs: string[];
}

@Component({
  selector: 'app-formula-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="detail-container">
      <div class="detail-nav">
        <a routerLink="/" class="back-link">{{ t('backToWorkbench') }}</a>
        <div class="detail-actions">
          <label class="language-select">
            <span>{{ t('language') }}</span>
            <select [value]="languageService.language()" (change)="setLanguage($any($event.target).value)">
              <option value="en">EN</option>
              <option value="vi">VI</option>
              <option value="zh-TW">繁中</option>
            </select>
          </label>
          <button type="button" class="theme-toggle" (click)="toggleTheme()">
            {{ themeService.theme() === 'dark' ? t('lightMode') : t('darkMode') }}
          </button>
        </div>
      </div>

      <ng-container *ngIf="savedFormula$ | async as savedFormula; else missingState">
        <header class="detail-header">
          <div>
            <span class="eyebrow">{{ t('savedFormula') }}</span>
            <h1>{{ savedFormula.name }}</h1>
            <p>{{ savedFormula.summary }}</p>
          </div>
          <div class="header-meta">
            <div class="datetime">{{ savedFormula.savedAt | date:'medium' }}</div>
            <a class="document-link" routerLink="/documents/new" [queryParams]="{ formulaUuid: savedFormula.id, productName: savedFormula.name }">{{ t('createRndDocument') }}</a>
          </div>
        </header>

        <section class="metrics">
          <div>
            <span>{{ t('ingredients') }}</span>
            <strong>{{ savedFormula.formula.ingredients.length }}</strong>
          </div>
          <div>
            <span>{{ t('cost') }}</span>
            <strong>{{ getFormulaTotalCost(savedFormula.formula) | currency:'USD':'symbol':'1.3-3' }}/L</strong>
          </div>
          <div>
            <span>{{ t('massPercentage') }}</span>
            <strong>{{ getFormulaTotalMass(savedFormula.formula) | number:'1.2-2' }}%</strong>
          </div>
        </section>

        <section class="panel">
          <h2>{{ t('ingredients') }}</h2>
          <table>
            <thead>
              <tr>
                <th>{{ t('rawMaterialKey') }}</th>
                <th class="numeric">{{ t('massPercentage') }}</th>
                <th class="numeric">{{ t('costProjection') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of savedFormula.formula.ingredients">
                <td><code>{{ formatRawMaterialKey(item.rawMaterialKey) }}</code></td>
                <td class="numeric">{{ item.massPercentage | number:'1.2-4' }}%</td>
                <td class="numeric">{{ item.costProjection | currency:'USD':'symbol':'1.3-3' }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="panel">
          <h2>{{ t('varianceAnalysis') }}</h2>
          <div class="analysis-report">
            <article *ngFor="let section of formatAnalysisSections(savedFormula.formula.varianceAnalysis)" class="analysis-section">
              <h3>{{ section.title }}</h3>
              <p *ngFor="let paragraph of section.paragraphs">{{ paragraph }}</p>
            </article>
          </div>
        </section>

        <section class="panel" *ngIf="savedFormula.formula.stabilityAlerts.length > 0">
          <h2>{{ t('stabilityAlerts') }}</h2>
          <ul class="alert-report">
            <li *ngFor="let alert of savedFormula.formula.stabilityAlerts">
              <strong *ngIf="getAlertTitle(alert) as alertTitle">{{ alertTitle }}</strong>
              <span>{{ getAlertBody(alert) }}</span>
            </li>
          </ul>
        </section>
      </ng-container>

      <ng-template #missingState>
        <section class="panel missing">
          <h1>{{ t('formulaNotFound') }}</h1>
          <p>{{ t('missingFormulaMessage') }}</p>
        </section>
      </ng-template>
    </div>
  `,
  styles: [`
    .detail-container {
      background: #0f172a;
      box-sizing: border-box;
      color: #e2e8f0;
      font-family: 'Inter', system-ui, sans-serif;
      margin: 0 auto;
      max-width: 800px;
      min-height: 100vh;
      padding: 24px;
      width: 100%;
    }
    .back-link {
      color: #38bdf8;
      display: inline-block;
      font-size: 0.9rem;
      text-decoration: none;
    }
    .back-link:hover {
      text-decoration: underline;
    }
    .detail-nav {
      align-items: center;
      display: flex;
      gap: 16px;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    .detail-actions {
      align-items: center;
      display: flex;
      flex-shrink: 0;
      gap: 10px;
    }
    .language-select {
      align-items: center;
      color: #94a3b8;
      display: inline-flex;
      gap: 8px;
      font-size: 0.84rem;
      font-weight: 700;
    }
    .language-select select {
      background: #0f172a;
      border: 1px solid #475569;
      border-radius: 8px;
      color: #e2e8f0;
      cursor: pointer;
      font-size: 0.84rem;
      font-weight: 700;
      padding: 8px 10px;
    }
    .theme-toggle {
      background: #0f172a;
      border: 1px solid #475569;
      border-radius: 8px;
      color: #e2e8f0;
      cursor: pointer;
      flex-shrink: 0;
      font-size: 0.84rem;
      font-weight: 700;
      padding: 9px 12px;
    }
    .theme-toggle:hover {
      border-color: #38bdf8;
      color: #38bdf8;
    }
    .detail-header {
      align-items: flex-start;
      border-bottom: 1px solid #334155;
      display: flex;
      gap: 20px;
      justify-content: space-between;
      margin-bottom: 24px;
      padding-bottom: 20px;
    }
    .detail-header > div:first-child {
      min-width: 0;
    }
    h1 {
      color: #f8fafc;
      font-size: 2rem;
      margin: 4px 0 8px 0;
      overflow-wrap: anywhere;
    }
    .detail-header p,
    .datetime {
      color: #94a3b8;
      font-size: 0.95rem;
      margin: 0;
      overflow-wrap: anywhere;
    }
    .datetime {
      flex-shrink: 0;
    }
    .header-meta {
      align-items: flex-end;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      gap: 10px;
    }
    .document-link {
      background: #0f8d91;
      border: 1px solid #18a7ab;
      border-radius: 6px;
      color: #fff;
      font-size: 0.82rem;
      font-weight: 700;
      padding: 9px 12px;
      text-decoration: none;
    }
    .eyebrow {
      color: #38bdf8;
      display: block;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .metrics {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      margin-bottom: 24px;
    }
    .metrics div,
    .panel {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      box-sizing: border-box;
      min-width: 0;
      padding: 18px;
    }
    .metrics span {
      color: #94a3b8;
      display: block;
      font-size: 0.8rem;
      margin-bottom: 8px;
    }
    .metrics strong {
      color: #f8fafc;
      font-size: 1.2rem;
    }
    .panel {
      margin-bottom: 18px;
      max-width: 100%;
      overflow: hidden;
    }
    h2 {
      border-bottom: 1px solid #334155;
      color: #f8fafc;
      font-size: 1.1rem;
      margin: 0 0 14px 0;
      padding-bottom: 10px;
    }
    table {
      border-collapse: collapse;
      font-size: 0.9rem;
      table-layout: fixed;
      width: 100%;
    }
    th, td {
      border-bottom: 1px solid #334155;
      overflow-wrap: anywhere;
      padding: 10px;
      text-align: left;
      word-break: break-word;
    }
    th {
      color: #94a3b8;
      font-weight: 600;
    }
    .numeric {
      text-align: right;
    }
    code {
      background: #0f172a;
      border-radius: 4px;
      color: #38bdf8;
      display: inline-block;
      max-width: 100%;
      overflow-wrap: anywhere;
      padding: 2px 6px;
      white-space: normal;
      word-break: break-word;
    }
    .analysis-report {
      display: grid;
      gap: 16px;
      max-width: 100%;
      min-width: 0;
    }
    .analysis-section {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      box-sizing: border-box;
      max-width: 100%;
      min-width: 0;
      overflow: hidden;
      padding: 14px;
    }
    .analysis-section h3 {
      color: #f8fafc;
      font-size: 0.98rem;
      max-width: 100%;
      margin: 0 0 10px 0;
      overflow-wrap: anywhere;
      word-break: break-all;
    }
    .analysis-section p {
      color: #cbd5e1;
      font-size: 0.92rem;
      line-height: 1.6;
      max-width: 100%;
      margin: 0 0 10px 0;
      overflow-wrap: anywhere;
      word-break: break-all;
    }
    .analysis-section p:last-child {
      margin-bottom: 0;
    }
    pre {
      color: #cbd5e1;
      font-family: inherit;
      line-height: 1.5;
      margin: 0;
      max-width: 100%;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
      word-break: break-all;
    }
    ul {
      margin: 0;
      padding-left: 20px;
    }
    li {
      color: #fef08a;
      margin-bottom: 8px;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .alert-report {
      display: grid;
      gap: 10px;
      list-style: none;
      max-width: 100%;
      min-width: 0;
      padding-left: 0;
    }
    .alert-report li {
      background: rgba(234, 179, 8, 0.12);
      border: 1px solid rgba(234, 179, 8, 0.45);
      border-radius: 8px;
      box-sizing: border-box;
      max-width: 100%;
      min-width: 0;
      margin-bottom: 0;
      overflow: hidden;
      padding: 12px;
    }
    .alert-report strong {
      color: #fef08a;
      display: block;
      font-size: 0.9rem;
      margin-bottom: 4px;
      max-width: 100%;
      overflow-wrap: anywhere;
      word-break: break-all;
    }
    .alert-report span {
      color: #fde68a;
      display: block;
      font-size: 0.88rem;
      line-height: 1.5;
      max-width: 100%;
      overflow-wrap: anywhere;
      word-break: break-all;
    }
    .missing {
      text-align: center;
    }
    @media (max-width: 720px) {
      .detail-header,
      .metrics {
        display: block;
      }
      .detail-nav {
        align-items: flex-start;
        flex-direction: column;
      }
      .detail-actions {
        flex-wrap: wrap;
      }
      .metrics div {
        margin-bottom: 12px;
      }
      .datetime {
        margin-top: 12px;
      }
    }
    :host-context(.light-theme) .detail-container {
      background: #f8fafc;
      color: #1e293b;
    }
    :host-context(.light-theme) .detail-header,
    :host-context(.light-theme) h2,
    :host-context(.light-theme) th,
    :host-context(.light-theme) td {
      border-color: #d8e0ea;
    }
    :host-context(.light-theme) .metrics div,
    :host-context(.light-theme) .panel {
      background: #ffffff;
      border-color: #cbd5e1;
    }
    :host-context(.light-theme) .analysis-section,
    :host-context(.light-theme) code,
    :host-context(.light-theme) .theme-toggle,
    :host-context(.light-theme) .language-select select {
      background: #f8fafc;
      border-color: #d8e0ea;
    }
    :host-context(.light-theme) h1,
    :host-context(.light-theme) h2,
    :host-context(.light-theme) .analysis-section h3,
    :host-context(.light-theme) .metrics strong,
    :host-context(.light-theme) .theme-toggle,
    :host-context(.light-theme) .language-select select {
      color: #0f172a;
    }
    :host-context(.light-theme) .detail-header p,
    :host-context(.light-theme) .datetime,
    :host-context(.light-theme) .metrics span,
    :host-context(.light-theme) th {
      color: #64748b;
    }
    :host-context(.light-theme) .analysis-section p,
    :host-context(.light-theme) pre {
      color: #334155;
    }
    :host-context(.light-theme) code {
      color: #0369a1;
    }
    :host-context(.light-theme) .alert-report li {
      background: #fff7ed;
      border-color: #f59e0b;
    }
    :host-context(.light-theme) .alert-report strong,
    :host-context(.light-theme) .alert-report span,
    :host-context(.light-theme) li {
      color: #92400e;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormulaDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly formulationService = inject(OllamaFormulationService);
  public readonly themeService = inject(ThemeService);
  public readonly languageService = inject(LanguageService);

  public readonly savedFormula$ = this.route.paramMap.pipe(
    map((params) => params.get('id') ?? ''),
    switchMap((id) =>
      id
        ? this.formulationService.getSavedFormula(id).pipe(catchError(() => of(null)))
        : of(null)
    )
  );

  public getFormulaTotalCost(formula: BeverageFormula): number {
    return formula.ingredients.reduce((total, item) => total + item.costProjection, 0);
  }

  public getFormulaTotalMass(formula: BeverageFormula): number {
    return formula.ingredients.reduce((total, item) => total + item.massPercentage, 0);
  }

  public formatRawMaterialKey(value: string): string {
    return value
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([A-Za-z])(\()/g, '$1 $2')
      .replace(/(\))([A-Za-z])/g, '$1 $2')
      .replace(/\//g, ' / ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  public toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  public setLanguage(language: AppLanguage): void {
    this.languageService.setLanguage(language);
  }

  public t(key: string): string {
    return this.languageService.translate(key);
  }

  public formatAnalysisSections(value: string): GeneratedTextSection[] {
    const formattedText = this.formatGeneratedText(value)
      .replace(/\b(\d+)\.\s*/g, '\n$1. ')
      .replace(/\b([A-Z][A-Za-z0-9 °°Bx().,/&+-]{4,120}):\s*/g, '\n$1: ')
      .replace(/\n{2,}/g, '\n')
      .trim();
    const lines = formattedText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const sections: GeneratedTextSection[] = [];

    for (const line of lines) {
      const headingMatch = line.match(/^((?:\d+\.\s*)?[A-Z][^:]{3,140}):\s*(.*)$/);

      if (headingMatch) {
        sections.push({
          title: headingMatch[1].trim(),
          paragraphs: headingMatch[2] ? this.splitIntoParagraphs(headingMatch[2]) : [],
        });
      } else if (sections.length > 0) {
        sections[sections.length - 1].paragraphs.push(...this.splitIntoParagraphs(line));
      } else {
        sections.push({
          title: 'Formulation Notes',
          paragraphs: this.splitIntoParagraphs(line),
        });
      }
    }

    return sections.map((section) => ({
      title: section.title,
      paragraphs: section.paragraphs.length > 0 ? section.paragraphs : ['No additional details provided.'],
    }));
  }

  public getAlertTitle(value: string): string {
    const formattedText = this.formatGeneratedText(value);
    const match = formattedText.match(/^([^:]{3,80}):\s*(.*)$/);

    return match ? match[1].trim() : 'Stability Alert';
  }

  public getAlertBody(value: string): string {
    const formattedText = this.formatGeneratedText(value);
    const match = formattedText.match(/^([^:]{3,80}):\s*(.*)$/);

    return match ? match[2].trim() : formattedText;
  }

  private formatGeneratedText(value: string): string {
    return value
      .replace(/\r\n/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\\text\{([^}]+)\}/g, '$1')
      .replace(/\$/g, '')
      .replace(/#{1,6}\s*/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*/g, '')
      .replace(/&/g, ' & ')
      .replace(/([,;:])(?=\S)/g, '$1 ')
      .replace(/([!?])(?=\S)/g, '$1 ')
      .replace(/(^|[^0-9])\.(?=\S)/g, '$1. ')
      .replace(/([0-9])\.(?=[A-Za-z])/g, '$1. ')
      .replace(/(%)(?=[A-Za-z])/g, '$1 ')
      .replace(/([a-z)])(?=[A-Z][a-z])/g, '$1 ')
      .replace(/([)])(?=[a-z])/g, '$1 ')
      .replace(/\s+([,.;:!?])/g, '$1')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private splitIntoParagraphs(value: string): string[] {
    return value
      .replace(/([.!?])\s+(?=[A-Z])/g, '$1\n')
      .split('\n')
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
  }

}
