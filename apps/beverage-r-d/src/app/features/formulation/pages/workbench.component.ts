import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { FormulationActions } from '../state/formulation.actions';
import {
  selectBeverageFormula,
  selectFormulationLoading,
  selectFormulationError,
  selectFormulationInput,
  selectSavedFormulas,
  selectSavedFormulasError,
  selectStreamingResponse,
} from '../state/formulation.selectors';
import { BeverageFormula, FormulationInput, SavedBeverageFormula } from '../models/formulation.model';
import { ThemeService } from '../../../core/theme/theme.service';
import { ProcessGeneralComponent } from '../../process-general/pages/process-general.component';
import { OllamaFormulationService } from '../data-access/ollama-formulation.service';
import { AppLanguage, LanguageService } from '../../../core/i18n/language.service';

type StreamStepStatus = 'done' | 'active' | 'waiting';

interface StreamTimelineStep {
  title: string;
  detail: string;
  status: StreamStepStatus;
}

interface GeneratedTextSection {
  title: string;
  paragraphs: string[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface FormattedChatLine {
  kind: 'heading' | 'paragraph' | 'bullet';
  text: string;
}

const DEFAULT_CHAT_MESSAGES: ChatMessage[] = [
  {
    role: 'assistant',
    content: 'Hi. Ask me about Brix targets, acidification, ingredient compatibility, cost projection, or saved formula decisions.',
  },
];

@Component({
  selector: 'app-formulator-workbench',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ProcessGeneralComponent],
  template: `
    <div class="workbench-container">
      <div class="page-shell">
        <aside class="management-menu" aria-label="Page management">
          <div class="menu-brand">
            <span class="brand-mark">G</span>
            <div>
              <strong>Giavico</strong>
              <span>R&D Console</span>
            </div>
          </div>
          <nav class="menu-list">
            <button
              type="button"
              class="menu-item"
              [class.active]="activeMenu() === 'Formula management'"
              (click)="setActiveMenu('Formula management')"
            >
              <span>FM</span>
              {{ t('formulaManagement') }}
            </button>
            <a routerLink="/documents" class="menu-item">
              <span>DC</span>
              {{ t('rndDocuments') }}
            </a>
            <button
              type="button"
              class="menu-item"
              [class.active]="activeMenu() === 'Process general'"
              (click)="setActiveMenu('Process general')"
            >
              <span>PG</span>
              {{ t('processGeneral') }}
            </button>
            <button
              type="button"
              class="menu-item"
              [class.active]="activeMenu() === 'Settings'"
              (click)="setActiveMenu('Settings')"
            >
              <span>ST</span>
              {{ t('settings') }}
            </button>
            <button
              type="button"
              class="menu-item"
              [class.active]="activeMenu() === 'Account'"
              (click)="setActiveMenu('Account')"
            >
              <span>AC</span>
              {{ t('account') }}
            </button>
            <button
              type="button"
              class="menu-item"
              [class.active]="activeMenu() === 'Chatbot'"
              (click)="setActiveMenu('Chatbot')"
            >
              <span>AI</span>
              {{ t('chatbot') }}
            </button>
            <button
              type="button"
              class="menu-item"
              [class.active]="activeMenu() === 'Reports'"
              (click)="setActiveMenu('Reports')"
            >
              <span>RP</span>
              {{ t('reports') }}
            </button>
            <button
              type="button"
              class="menu-item"
              [class.active]="activeMenu() === 'Help'"
              (click)="setActiveMenu('Help')"
            >
              <span>HP</span>
              {{ t('help') }}
            </button>
          </nav>
        </aside>

        <main class="page-main">
          <header class="header">
            <div>
              <h1>{{ activeMenu() === 'Process general' ? t('processGeneral') : t('workbenchTitle') }}</h1>
              <p class="subtitle">{{ activeMenu() === 'Process general' ? t('processGeneralSubtitle') : t('workbenchSubtitle') }}</p>
            </div>
            <div class="header-actions">
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
          </header>

          <ng-container *ngIf="activeMenu() === 'Formula management'; else utilityPanel">
          <div class="workbench-layout">
        <!-- Formulation Request Form Panel -->
        <section class="form-panel card">
          <h2>{{ t('targetMatrix') }}</h2>
          <form [formGroup]="form" (ngSubmit)="onGenerate()">
            <!-- Target Parameters -->
            <fieldset>
              <legend>{{ t('targetParameters') }}</legend>

              <div class="form-group">
                <label for="drinkName">{{ t('drinkName') }}</label>
                <input id="drinkName" type="text" formControlName="drinkName" />
              </div>
              
              <div class="form-group">
                <label for="marketDestination">{{ t('marketDestination') }}</label>
                <input id="marketDestination" type="text" formControlName="marketDestination" />
              </div>

              <div class="form-group">
                <label for="targetBrix">{{ t('targetBrix') }}</label>
                <input id="targetBrix" type="number" step="0.1" formControlName="targetBrix" />
              </div>

              <div class="form-group checkbox">
                <input id="isAcidified" type="checkbox" formControlName="isAcidified" />
                <label for="isAcidified">Requires Acidification (pH < 4.6)</label>
              </div>

              <div class="form-group">
                <label for="regionalRestrictions">Regional Regulatory Restrictions (comma separated)</label>
                <input id="regionalRestrictions" type="text" formControlName="regionalRestrictions" placeholder="e.g. FDA, EFSA, No Artificial Color" />
              </div>
            </fieldset>

            <!-- Operational Constraints -->
            <fieldset>
              <legend>{{ t('operationalConstraints') }}</legend>

              <div class="form-group">
                <label for="productionArea">{{ t('productionArea') }}</label>
                <input id="productionArea" type="text" formControlName="productionArea" />
              </div>

              <div class="form-group">
                <label for="customerSpecification">{{ t('customerSpecification') }}</label>
                <textarea id="customerSpecification" rows="3" formControlName="customerSpecification"></textarea>
              </div>

              <div class="form-group">
                <label for="baselineBOM">{{ t('baselineBom') }}</label>
                <input id="baselineBOM" type="text" formControlName="baselineBOM" />
              </div>
            </fieldset>

            <button type="submit" [disabled]="loading$ | async" class="btn-generate">
              <span *ngIf="loading$ | async; else idleText">
                {{ editingFormulaId() ? t('regeneratingFormula') : t('generatingFormula') }}
              </span>
              <ng-template #idleText>
                {{ editingFormulaId() ? t('regenerate') : t('generateFormula') }}
              </ng-template>
            </button>
          </form>
        </section>

        <!-- Presentational Workbench Canvas (Unidirectional Flow) -->
        <section class="canvas-panel card">
          <h2>{{ t('outputTitle') }}</h2>

          <!-- Dynamic States: Loading, Error, Content -->
          <div *ngIf="loading$ | async" class="loading-state">
            <div class="spinner"></div>
            <p>The system is calculating material ratios and safety parameters...</p>
          </div>

          <div *ngIf="showStreamingTimeline$ | async" class="data-block stream-block">
              <h3>{{ t('liveFormulaStream') }}</h3>
              <ol class="stream-timeline">
                <li
                  *ngFor="let step of streamingTimeline$ | async"
                  class="stream-step"
                  [class.is-done]="step.status === 'done'"
                  [class.is-active]="step.status === 'active'"
                  [class.is-waiting]="step.status === 'waiting'"
                >
                  <span class="stream-marker"></span>
                  <div class="stream-copy">
                    <div class="stream-title-row">
                      <strong>{{ step.title }}</strong>
                      <span>{{ getStepStatusLabel(step.status) }}</span>
                    </div>
                    <p>{{ step.detail }}</p>
                  </div>
                </li>
              </ol>
          </div>

          <div *ngIf="error$ | async as error" class="error-alert">
            <span class="error-title">{{ t('aiProcessingError') }}</span>
            <p>{{ error }}</p>
          </div>

          <div *ngIf="formula$ | async as formula; else emptyState" class="formula-data-view">
            <div class="output-toolbar">
              <div>
                <span class="eyebrow">{{ t('currentFormula') }}</span>
                <p>{{ editingFormulaId() ? t('reviewRegenerated') : t('reviewGenerated') }}</p>
              </div>
              <button type="button" class="btn-save" (click)="onSaveFormula(formula)">
                {{ editingFormulaId() ? t('update') : t('save') }}
              </button>
            </div>

            <!-- Ingredients Matrix Table -->
            <div class="data-block">
              <h3>{{ t('ingredientsMatrix') }}</h3>
              <table>
                <thead>
                  <tr>
                    <th>{{ t('rawMaterialKey') }}</th>
                    <th class="numeric">{{ t('massPercentage') }} (%)</th>
                    <th class="numeric">{{ t('costProjection') }} ($/L)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of formula.ingredients">
                    <td><code>{{ formatRawMaterialKey(item.rawMaterialKey) }}</code></td>
                    <td class="numeric">{{ item.massPercentage | number:'1.2-4' }}%</td>
                    <td class="numeric">{{ item.costProjection | currency:'USD':'symbol':'1.3-3' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Variance Analysis markdown display -->
            <div class="data-block">
              <h3>{{ t('varianceAnalysis') }}</h3>
              <div class="analysis-report">
                <article *ngFor="let section of formatAnalysisSections(formula.varianceAnalysis)" class="analysis-section">
                  <h4>{{ section.title }}</h4>
                  <p *ngFor="let paragraph of section.paragraphs">{{ paragraph }}</p>
                </article>
              </div>
            </div>

            <!-- Stability Alerts Array -->
            <div class="data-block" *ngIf="formula.stabilityAlerts.length > 0">
              <h3>{{ t('stabilityAlerts') }}</h3>
              <ul class="alerts-list">
                <li *ngFor="let alert of formula.stabilityAlerts" class="alert-item">
                  <span class="alert-icon">⚠️</span>
                  <span class="alert-msg">
                    <strong>{{ getAlertTitle(alert) }}</strong>
                    <span>{{ getAlertBody(alert) }}</span>
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div class="saved-formulas-block">
            <div class="saved-header">
              <h3>{{ t('savedFormulas') }}</h3>
              <span class="saved-count">{{ (savedFormulas$ | async)?.length || 0 }}</span>
            </div>

            <p *ngIf="savedFormulasError$ | async as savedFormulasError" class="saved-warning">
              {{ savedFormulasError }}
            </p>

            <ng-container *ngIf="savedFormulas$ | async as savedFormulas">
              <ul *ngIf="savedFormulas.length > 0; else noSavedFormulas" class="saved-formulas-list">
                <li *ngFor="let saved of savedFormulas">
                  <div class="saved-formula-item">
                    <a class="saved-formula-link" [routerLink]="['/formulas', saved.id]">
                      <div class="saved-primary">
                        <strong>{{ saved.name }}</strong>
                        <span *ngIf="editingFormulaId() === saved.id" class="edit-badge">{{ t('editingInTargetMatrix') }}</span>
                        <span class="saved-summary">{{ saved.summary }}</span>
                        <span>{{ saved.savedAt | date:'medium' }}</span>
                      </div>
                      <div class="saved-meta">
                        <span>{{ saved.formula.ingredients.length }} ingredients</span>
                        <span>{{ getFormulaTotalCost(saved.formula) | currency:'USD':'symbol':'1.3-3' }}/L</span>
                        <span>{{ getFormulaTotalMass(saved.formula) | number:'1.2-2' }}%</span>
                      </div>
                    </a>
                    <div class="saved-actions">
                      <ng-container *ngIf="editingFormulaId() === saved.id; else savedActionButtons">
                        <button type="button" class="btn-small" (click)="onCancelEditFormula()">
                          {{ t('cancel') }}
                        </button>
                      </ng-container>
                      <ng-template #savedActionButtons>
                        <button type="button" class="btn-small" (click)="onStartEditFormula(saved)">
                          {{ t('edit') }}
                        </button>
                        <button type="button" class="btn-small danger" (click)="onDeleteSavedFormula(saved.id)">
                          {{ t('delete') }}
                        </button>
                      </ng-template>
                    </div>
                  </div>
                </li>
              </ul>
            </ng-container>

            <ng-template #noSavedFormulas>
              <p class="saved-empty">{{ t('noSavedFormulas') }}</p>
            </ng-template>
          </div>

          <ng-template #emptyState>
            <div *ngIf="!(loading$ | async)" class="empty-state">
              <p>{{ t('emptyOutput') }}</p>
            </div>
          </ng-template>
        </section>
          </div>
          </ng-container>

          <ng-template #utilityPanel>
            <app-process-general *ngIf="activeMenu() === 'Process general'; else utilityContent" />
          </ng-template>

          <ng-template #utilityContent>
            <section *ngIf="activeMenu() === 'Chatbot'; else placeholderPanel" class="chatbot-panel card">
              <div class="section-heading">
                <div>
                  <h2>{{ t('chatbot') }}</h2>
                  <p>Ask Ollama about beverage formulation, stability, Brix, cost, or process constraints.</p>
                </div>
              </div>

              <div class="chat-window">
                <div *ngFor="let message of chatMessages()" class="chat-message" [class.user]="message.role === 'user'">
                  <strong>{{ message.role === 'user' ? 'You' : 'Giavico AI' }}</strong>
                  <div class="chat-copy">
                    <ng-container *ngFor="let line of formatChatMessageLines(message.content || 'Thinking...')">
                      <div *ngIf="line.kind === 'heading'" class="chat-heading">{{ line.text }}</div>
                      <div *ngIf="line.kind === 'bullet'" class="chat-bullet">
                        <span></span>
                        <p>{{ line.text }}</p>
                      </div>
                      <p *ngIf="line.kind === 'paragraph'">{{ line.text }}</p>
                    </ng-container>
                  </div>
                </div>
              </div>

              <div class="chat-form">
                <label for="chatMessage">{{ t('message') }}</label>
                <textarea
                  id="chatMessage"
                  rows="4"
                  [value]="chatDraft()"
                  (input)="chatDraft.set($any($event.target).value)"
                  placeholder="Ask about acidification, ingredient compatibility, cost projection..."
                ></textarea>
                <button type="button" class="btn-generate" [disabled]="chatLoading() || !chatDraft().trim()" (click)="onSendChatMessage()">
                  {{ chatLoading() ? t('sending') : t('sendToOllama') }}
                </button>
              </div>
            </section>
          </ng-template>

          <ng-template #placeholderPanel>
            <section class="placeholder-panel card">
              <h2>{{ activeMenu() }}</h2>
              <p>{{ t('placeholderReady').replace('{menu}', activeMenuLabel()) }}</p>
            </section>
          </ng-template>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .workbench-container {
      font-family: 'Inter', system-ui, sans-serif;
      margin: 0 auto;
      padding: 24px;
      color: #e2e8f0;
      background: #0f172a;
      min-height: 100vh;
    }
    .page-shell {
      display: grid;
      gap: 24px;
      grid-template-columns: 240px minmax(0, 1fr);
      margin: 0 auto;
      max-width: 1680px;
    }
    .page-main {
      min-width: 0;
    }
    .management-menu {
      align-self: start;
      background: #111827;
      border: 1px solid #334155;
      border-radius: 12px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.28);
      padding: 16px;
      position: sticky;
      top: 24px;
    }
    .menu-brand {
      align-items: center;
      border-bottom: 1px solid #334155;
      display: flex;
      gap: 12px;
      margin-bottom: 14px;
      padding-bottom: 14px;
    }
    .brand-mark {
      align-items: center;
      background: linear-gradient(135deg, #0284c7 0%, #4f46e5 100%);
      border-radius: 8px;
      color: #ffffff;
      display: inline-flex;
      flex-shrink: 0;
      font-weight: 800;
      height: 36px;
      justify-content: center;
      width: 36px;
    }
    .menu-brand strong,
    .menu-brand span {
      display: block;
    }
    .menu-brand strong {
      color: #f8fafc;
      font-size: 0.96rem;
    }
    .menu-brand span {
      color: #94a3b8;
      font-size: 0.78rem;
      margin-top: 2px;
    }
    .menu-list {
      display: grid;
      gap: 8px;
    }
    .menu-item {
      align-items: center;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 8px;
      color: #cbd5e1;
      cursor: pointer;
      display: flex;
      gap: 10px;
      font-size: 0.88rem;
      font-weight: 700;
      padding: 10px;
      text-align: left;
      width: 100%;
    }
    .menu-item:hover,
    .menu-item.active {
      background: #0f172a;
      border-color: #334155;
      color: #f8fafc;
    }
    .menu-item.active {
      border-color: #38bdf8;
      box-shadow: inset 3px 0 0 #38bdf8;
    }
    .menu-item span {
      align-items: center;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 6px;
      color: #38bdf8;
      display: inline-flex;
      flex-shrink: 0;
      font-size: 0.68rem;
      font-weight: 800;
      height: 28px;
      justify-content: center;
      width: 32px;
    }
    .header {
      align-items: center;
      margin-bottom: 32px;
      border-bottom: 1px solid #1e293b;
      display: flex;
      gap: 16px;
      justify-content: space-between;
      padding-bottom: 16px;
    }
    .header h1 {
      margin: 0;
      font-size: 2.2rem;
      background: linear-gradient(135deg, #38bdf8 0%, #818cf8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle {
      color: #94a3b8;
      margin: 4px 0 0 0;
      font-size: 0.95rem;
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
    .header-actions {
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
    .section-heading p,
    .placeholder-panel p {
      color: #94a3b8;
      font-size: 0.9rem;
      margin: -8px 0 18px 0;
    }
    .chatbot-panel,
    .placeholder-panel {
      max-width: 800px;
    }
    .chat-window {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      display: grid;
      gap: 12px;
      margin-bottom: 16px;
      max-height: 520px;
      min-height: 260px;
      overflow-y: auto;
      padding: 14px;
    }
    .chat-message {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      max-width: 78%;
      padding: 12px;
    }
    .chat-message.user {
      justify-self: end;
      background: #075985;
      border-color: #0ea5e9;
    }
    .chat-message strong {
      color: #f8fafc;
      display: block;
      font-size: 0.82rem;
      margin-bottom: 6px;
    }
    .chat-copy {
      display: grid;
      gap: 9px;
    }
    .chat-copy p,
    .chat-bullet p {
      color: #cbd5e1;
      line-height: 1.5;
      margin: 0;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .chat-heading {
      color: #f8fafc;
      font-size: 0.92rem;
      font-weight: 800;
      line-height: 1.35;
      margin-top: 4px;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .chat-heading:first-child {
      margin-top: 0;
    }
    .chat-bullet {
      display: grid;
      gap: 8px;
      grid-template-columns: 8px minmax(0, 1fr);
    }
    .chat-bullet span {
      background: #38bdf8;
      border-radius: 999px;
      height: 5px;
      margin-top: 9px;
      width: 5px;
    }
    .chat-form {
      display: grid;
      gap: 10px;
    }
    .chat-form label {
      color: #94a3b8;
      font-size: 0.85rem;
    }
    .workbench-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 800px);
      gap: 32px;
    }
    .canvas-panel {
      justify-self: start;
      max-width: 800px;
      width: 100%;
    }
    @media (max-width: 1024px) {
      .page-shell {
        grid-template-columns: 1fr;
      }
      .management-menu {
        position: static;
      }
      .menu-list {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      .workbench-layout {
        grid-template-columns: 1fr;
      }
      .canvas-panel {
        justify-self: stretch;
      }
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
    }
    h2 {
      margin-top: 0;
      font-size: 1.3rem;
      color: #f8fafc;
      border-bottom: 1px solid #334155;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    fieldset {
      border: 1px solid #475569;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
      background: #0f172a;
    }
    legend {
      padding: 0 8px;
      font-weight: 600;
      font-size: 0.85rem;
      color: #38bdf8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      margin-bottom: 14px;
    }
    .form-group.checkbox {
      flex-direction: row;
      align-items: center;
      gap: 8px;
      margin-top: 10px;
    }
    .form-group label {
      font-size: 0.85rem;
      color: #94a3b8;
      margin-bottom: 6px;
    }
    input[type="text"], input[type="number"], textarea {
      background: #1e293b;
      border: 1px solid #475569;
      border-radius: 6px;
      padding: 8px 12px;
      color: #f8fafc;
      font-size: 0.9rem;
    }
    input[type="text"]:focus, input[type="number"]:focus, textarea:focus {
      outline: none;
      border-color: #38bdf8;
      box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
    }
    .btn-generate {
      width: 100%;
      background: linear-gradient(135deg, #0284c7 0%, #4f46e5 100%);
      color: #ffffff;
      border: none;
      padding: 12px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s ease;
    }
    .btn-generate:hover {
      opacity: 0.95;
    }
    .btn-generate:disabled {
      background: #475569;
      cursor: not-allowed;
    }
    .output-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 14px 16px;
      margin-bottom: 24px;
    }
    .output-toolbar p {
      margin: 4px 0 0 0;
      color: #94a3b8;
      font-size: 0.85rem;
    }
    .eyebrow {
      color: #38bdf8;
      display: block;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .btn-save {
      background: #16a34a;
      border: none;
      border-radius: 8px;
      color: #ffffff;
      cursor: pointer;
      font-weight: 700;
      min-width: 96px;
      padding: 10px 16px;
      transition: background 0.2s ease;
    }
    .btn-save:hover {
      background: #15803d;
    }
    .loading-state {
      text-align: center;
      padding: 40px;
    }
    .spinner {
      border: 4px solid rgba(255, 255, 255, 0.1);
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border-left-color: #38bdf8;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px auto;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .error-alert {
      background: #7f1d1d;
      border: 1px solid #f87171;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
    }
    .error-title {
      font-weight: 700;
      color: #fca5a5;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 0.9rem;
    }
    th, td {
      text-align: left;
      padding: 10px;
      border-bottom: 1px solid #334155;
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
      padding: 2px 6px;
      border-radius: 4px;
      color: #38bdf8;
    }
    .data-block {
      margin-bottom: 24px;
    }
    .stream-block {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 16px;
    }
    .stream-timeline {
      display: grid;
      gap: 0;
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .stream-step {
      display: grid;
      gap: 12px;
      grid-template-columns: 20px minmax(0, 1fr);
      min-height: 64px;
      position: relative;
    }
    .stream-step::before {
      background: #334155;
      bottom: 0;
      content: '';
      left: 9px;
      position: absolute;
      top: 20px;
      width: 2px;
    }
    .stream-step:last-child::before {
      display: none;
    }
    .stream-marker {
      background: #1e293b;
      border: 2px solid #475569;
      border-radius: 999px;
      height: 18px;
      margin-top: 3px;
      position: relative;
      width: 18px;
      z-index: 1;
    }
    .stream-copy {
      padding-bottom: 18px;
    }
    .stream-title-row {
      align-items: center;
      display: flex;
      gap: 12px;
      justify-content: space-between;
    }
    .stream-title-row strong {
      color: #f8fafc;
      font-size: 0.92rem;
    }
    .stream-title-row span {
      border: 1px solid #475569;
      border-radius: 999px;
      color: #94a3b8;
      flex-shrink: 0;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 3px 8px;
      text-transform: uppercase;
    }
    .stream-copy p {
      color: #94a3b8;
      font-size: 0.84rem;
      line-height: 1.45;
      margin: 6px 0 0 0;
    }
    .stream-step.is-done .stream-marker {
      background: #16a34a;
      border-color: #86efac;
      box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.14);
    }
    .stream-step.is-done::before {
      background: #16a34a;
    }
    .stream-step.is-done .stream-title-row span {
      border-color: rgba(134, 239, 172, 0.35);
      color: #86efac;
    }
    .stream-step.is-active .stream-marker {
      animation: pulse-marker 1.4s ease-in-out infinite;
      background: #38bdf8;
      border-color: #bae6fd;
      box-shadow: 0 0 0 5px rgba(56, 189, 248, 0.16);
    }
    .stream-step.is-active .stream-title-row span {
      border-color: rgba(56, 189, 248, 0.45);
      color: #7dd3fc;
    }
    @keyframes pulse-marker {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.16); }
    }
    .saved-formulas-block {
      border-top: 1px solid #334155;
      margin-top: 28px;
      padding-top: 24px;
    }
    .saved-header {
      align-items: center;
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }
    .saved-header h3 {
      margin: 0;
    }
    .saved-count {
      align-items: center;
      background: #0f172a;
      border: 1px solid #475569;
      border-radius: 999px;
      color: #cbd5e1;
      display: inline-flex;
      font-size: 0.8rem;
      font-weight: 700;
      justify-content: center;
      min-width: 32px;
      padding: 4px 10px;
    }
    .saved-formulas-list {
      display: grid;
      gap: 10px;
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .saved-formula-item {
      align-items: center;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      color: inherit;
      display: flex;
      gap: 16px;
      justify-content: space-between;
      padding: 12px 14px;
      transition: border-color 0.2s ease, background 0.2s ease;
    }
    .saved-formula-item:hover {
      background: #111c31;
      border-color: #38bdf8;
    }
    .saved-formula-link {
      align-items: center;
      color: inherit;
      display: flex;
      flex: 1;
      gap: 16px;
      justify-content: space-between;
      min-width: 0;
      text-decoration: none;
    }
    .saved-formula-item strong {
      color: #f8fafc;
      display: block;
      font-size: 0.92rem;
    }
    .saved-formula-item span {
      color: #94a3b8;
      display: block;
      font-size: 0.8rem;
      margin-top: 4px;
    }
    .saved-primary {
      min-width: 0;
    }
    .saved-summary {
      color: #cbd5e1;
      line-height: 1.4;
      max-width: 48ch;
    }
    .saved-meta {
      align-items: flex-end;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
    }
    .saved-actions {
      display: flex;
      flex-shrink: 0;
      gap: 8px;
    }
    .btn-small {
      background: #1e293b;
      border: 1px solid #475569;
      border-radius: 6px;
      color: #e2e8f0;
      cursor: pointer;
      font-size: 0.78rem;
      font-weight: 700;
      padding: 7px 10px;
    }
    .btn-small:hover {
      border-color: #38bdf8;
      color: #38bdf8;
    }
    .btn-small.primary {
      background: #0284c7;
      border-color: #0284c7;
      color: #ffffff;
    }
    .btn-small.danger {
      border-color: rgba(248, 113, 113, 0.55);
      color: #fca5a5;
    }
    .edit-badge {
      color: #38bdf8;
      font-weight: 700;
    }
    .saved-empty {
      color: #64748b;
      font-size: 0.9rem;
      margin: 0;
    }
    .saved-warning {
      background: rgba(234, 179, 8, 0.12);
      border: 1px solid rgba(234, 179, 8, 0.45);
      border-radius: 8px;
      color: #fef08a;
      font-size: 0.84rem;
      line-height: 1.4;
      margin: 0 0 12px 0;
      padding: 10px 12px;
    }
    h3 {
      font-size: 1.1rem;
      color: #f8fafc;
      margin-bottom: 12px;
    }
    .variance-text {
      background: #0f172a;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid #334155;
    }
    .analysis-report {
      display: grid;
      gap: 12px;
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
    .analysis-section h4 {
      color: #f8fafc;
      font-size: 0.96rem;
      margin: 0 0 10px 0;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .analysis-section p {
      color: #cbd5e1;
      font-size: 0.9rem;
      line-height: 1.6;
      margin: 0 0 10px 0;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .analysis-section p:last-child {
      margin-bottom: 0;
    }
    .markdown-content {
      white-space: pre-wrap;
      font-family: inherit;
      margin: 0;
      color: #cbd5e1;
      font-size: 0.9rem;
      line-height: 1.5;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .alerts-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .alert-item {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      background: rgba(234, 179, 8, 0.15);
      border: 1px solid #eab308;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 8px;
    }
    .alert-icon {
      font-size: 1.1rem;
    }
    .alert-msg {
      color: #fef08a;
      font-size: 0.85rem;
      min-width: 0;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .alert-msg strong,
    .alert-msg span {
      display: block;
      max-width: 100%;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .alert-msg strong {
      margin-bottom: 4px;
    }
    .empty-state {
      text-align: center;
      color: #64748b;
      padding: 60px 20px;
      font-style: italic;
    }
    @media (max-width: 640px) {
      .header {
        align-items: flex-start;
        flex-direction: column;
      }
      .header-actions {
        flex-wrap: wrap;
      }
      .menu-list {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .saved-formula-link,
      .saved-formula-item,
      .output-toolbar {
        align-items: stretch;
        flex-direction: column;
      }
      .saved-meta {
        align-items: flex-start;
      }
      .saved-actions {
        width: 100%;
      }
      .saved-actions .btn-small {
        flex: 1;
      }
    }
    :host-context(.light-theme) .workbench-container {
      background: #f8fafc;
      color: #1e293b;
    }
    :host-context(.light-theme) .management-menu {
      background: #ffffff;
      border-color: #cbd5e1;
    }
    :host-context(.light-theme) .menu-brand {
      border-bottom-color: #d8e0ea;
    }
    :host-context(.light-theme) .menu-brand strong,
    :host-context(.light-theme) .menu-item:hover,
    :host-context(.light-theme) .menu-item.active {
      color: #0f172a;
    }
    :host-context(.light-theme) .menu-brand span,
    :host-context(.light-theme) .menu-item {
      color: #64748b;
    }
    :host-context(.light-theme) .menu-item:hover,
    :host-context(.light-theme) .menu-item.active {
      background: #f8fafc;
      border-color: #d8e0ea;
    }
    :host-context(.light-theme) .menu-item.active {
      border-color: #0284c7;
      box-shadow: inset 3px 0 0 #0284c7;
    }
    :host-context(.light-theme) .menu-item span {
      background: #e0f2fe;
      border-color: #bae6fd;
      color: #0369a1;
    }
    :host-context(.light-theme) .header {
      border-bottom-color: #d8e0ea;
    }
    :host-context(.light-theme) .subtitle,
    :host-context(.light-theme) .section-heading p,
    :host-context(.light-theme) .placeholder-panel p,
    :host-context(.light-theme) .chat-form label,
    :host-context(.light-theme) .form-group label,
    :host-context(.light-theme) .output-toolbar p,
    :host-context(.light-theme) .stream-copy p,
    :host-context(.light-theme) .saved-formula-item span,
    :host-context(.light-theme) .saved-empty,
    :host-context(.light-theme) th {
      color: #64748b;
    }
    :host-context(.light-theme) .card,
    :host-context(.light-theme) input[type="text"],
    :host-context(.light-theme) input[type="number"],
    :host-context(.light-theme) textarea {
      background: #ffffff;
      border-color: #cbd5e1;
      color: #0f172a;
    }
    :host-context(.light-theme) fieldset,
    :host-context(.light-theme) .output-toolbar,
    :host-context(.light-theme) .stream-block,
    :host-context(.light-theme) .chat-window,
    :host-context(.light-theme) .analysis-section,
    :host-context(.light-theme) .saved-formula-item,
    :host-context(.light-theme) .saved-count,
    :host-context(.light-theme) .variance-text,
    :host-context(.light-theme) .theme-toggle,
    :host-context(.light-theme) .language-select select {
      background: #f8fafc;
      border-color: #d8e0ea;
    }
    :host-context(.light-theme) .chat-message {
      background: #ffffff;
      border-color: #d8e0ea;
    }
    :host-context(.light-theme) .chat-message.user {
      background: #e0f2fe;
      border-color: #7dd3fc;
    }
    :host-context(.light-theme) .chat-message strong {
      color: #0f172a;
    }
    :host-context(.light-theme) .chat-message p {
      color: #334155;
    }
    :host-context(.light-theme) .chat-heading {
      color: #0f172a;
    }
    :host-context(.light-theme) .chat-bullet span {
      background: #0284c7;
    }
    :host-context(.light-theme) h2,
    :host-context(.light-theme) h3,
    :host-context(.light-theme) .analysis-section h4,
    :host-context(.light-theme) .stream-title-row strong,
    :host-context(.light-theme) .saved-formula-item strong,
    :host-context(.light-theme) .metrics strong,
    :host-context(.light-theme) .theme-toggle,
    :host-context(.light-theme) .language-select select {
      color: #0f172a;
    }
    :host-context(.light-theme) h2,
    :host-context(.light-theme) th,
    :host-context(.light-theme) td,
    :host-context(.light-theme) .saved-formulas-block {
      border-color: #d8e0ea;
    }
    :host-context(.light-theme) code {
      background: #e0f2fe;
      color: #0369a1;
    }
    :host-context(.light-theme) .analysis-section p,
    :host-context(.light-theme) .markdown-content {
      color: #334155;
    }
    :host-context(.light-theme) .saved-formula-item:hover {
      background: #eff6ff;
      border-color: #0284c7;
    }
    :host-context(.light-theme) .btn-small {
      background: #ffffff;
      border-color: #cbd5e1;
      color: #334155;
    }
    :host-context(.light-theme) .btn-small.primary {
      background: #0284c7;
      border-color: #0284c7;
      color: #ffffff;
    }
    :host-context(.light-theme) .btn-small.danger {
      border-color: #fca5a5;
      color: #b91c1c;
    }
    :host-context(.light-theme) .stream-step::before {
      background: #cbd5e1;
    }
    :host-context(.light-theme) .stream-marker {
      background: #ffffff;
      border-color: #94a3b8;
    }
    :host-context(.light-theme) .empty-state {
      color: #64748b;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormulatorWorkbenchComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly ollamaService = inject(OllamaFormulationService);
  public readonly themeService = inject(ThemeService);
  public readonly languageService = inject(LanguageService);

  // Expose selectors using Angular's async pipe in the template
  public readonly formula$ = this.store.select(selectBeverageFormula);
  public readonly loading$ = this.store.select(selectFormulationLoading);
  public readonly error$ = this.store.select(selectFormulationError);
  public readonly savedFormulas$ = this.store.select(selectSavedFormulas);
  public readonly savedFormulasError$ = this.store.select(selectSavedFormulasError);
  public readonly streamingResponse$ = this.store.select(selectStreamingResponse);
  public readonly streamingTimeline$ = combineLatest([
    this.streamingResponse$,
    this.formula$,
    this.loading$,
  ]).pipe(
    map(([streamingResponse, formula, loading]) =>
      this.buildStreamingTimeline(streamingResponse, formula, loading)
    )
  );
  public readonly showStreamingTimeline$ = this.streamingTimeline$.pipe(
    map((timeline) => timeline.length > 0)
  );
  public readonly activeMenu = signal('Formula management');
  public readonly chatDraft = signal('');
  public readonly chatLoading = signal(false);
  public readonly chatMessages = signal<ChatMessage[]>(DEFAULT_CHAT_MESSAGES);
  public readonly editingFormulaId = signal<string | null>(null);
  private readonly generatedInput = this.store.selectSignal(selectFormulationInput);

  // Form definition matching FormulationInput
  public readonly form = this.fb.group({
    drinkName: ['Yuzu Black Tea'],
    marketDestination: ['APAC - Japan Region'],
    targetBrix: [11.2],
    isAcidified: [true],
    regionalRestrictions: ['Preservative-free, Natural flavor only'],
    productionArea: ['Factory Line 4B - High-shear mixing tank'],
    customerSpecification: ['High acidity black tea base formulation, low viscosity'],
    baselineBOM: ['BOM-REF-TEA-0982'],
  });

  public ngOnInit(): void {
    this.store.dispatch(FormulationActions.loadSavedFormulas());
    this.loadChatHistory();
  }

  public onGenerate(): void {
    const input = this.buildFormulationInput();

    // Dispatch the Request action to trigger the Effect
    this.store.dispatch(
      FormulationActions.requestAIGeneration({
        input,
        // Optional: include standard mock baseline context to pass to the model
        historicalData: `Baseline Formula Key: BOM-REF-TEA-0982
- Ingredients: Water (85.5%), High Fructose Corn Syrup (11.0%), Tea Extract (2.5%), Citric Acid (0.8%), Natural Flavor (0.2%)
- Brix Reference: 11.0 °Bx
- pH Reference: 4.1 (Acidified)`,
      })
    );
  }

  public onSaveFormula(formula: BeverageFormula): void {
    const editingId = this.editingFormulaId();
    const input = this.generatedInput() ?? this.buildFormulationInput();

    if (editingId) {
      this.store.dispatch(
        FormulationActions.updateSavedFormula({
          id: editingId,
          input,
          formula,
        })
      );
      this.onCancelEditFormula();
      return;
    }

    this.store.dispatch(
      FormulationActions.saveFormula({
        input,
        formula,
      })
    );
  }

  public onStartEditFormula(savedFormula: SavedBeverageFormula): void {
    this.editingFormulaId.set(savedFormula.id);
    this.patchFormFromSavedFormula(savedFormula);
  }

  public onCancelEditFormula(): void {
    this.editingFormulaId.set(null);
  }

  public onDeleteSavedFormula(id: string): void {
    if (!confirm(this.t('deleteConfirm'))) {
      return;
    }

    this.store.dispatch(FormulationActions.deleteSavedFormula({ id }));
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

  public setActiveMenu(menuItem: string): void {
    this.activeMenu.set(menuItem);
  }

  public activeMenuLabel(): string {
    const menuTranslations: Record<string, string> = {
      'Formula management': this.t('formulaManagement'),
      'Process general': this.t('processGeneral'),
      Settings: this.t('settings'),
      Account: this.t('account'),
      Chatbot: this.t('chatbot'),
      Reports: this.t('reports'),
      Help: this.t('help'),
    };

    return menuTranslations[this.activeMenu()] ?? this.activeMenu();
  }

  public onSendChatMessage(): void {
    this.activeMenu.set('Chatbot');
    const message = this.chatDraft().trim();

    if (!message || this.chatLoading()) {
      return;
    }

    this.updateChatMessages((messages) => [...messages, { role: 'user', content: message }]);
    this.chatDraft.set('');
    this.chatLoading.set(true);
    const assistantIndex = this.chatMessages().length;
    this.updateChatMessages((messages) => [...messages, {
      role: 'assistant',
      content: '',
    }]);

    this.ollamaService.chatStream(message).subscribe({
      next: (event) => {
        this.activeMenu.set('Chatbot');
        this.updateChatMessages((messages) =>
          messages.map((chatMessage, index) =>
            index === assistantIndex
              ? {
                  ...chatMessage,
                  content: event.type === 'progress' ? event.partialResponse : event.response,
                }
              : chatMessage
          )
        );
        if (event.type === 'complete') {
          this.chatLoading.set(false);
        }
      },
      error: (error: any) => {
        this.activeMenu.set('Chatbot');
        const errorMessage = error?.error?.message ?? error?.message ?? 'Unable to reach Ollama through chat-ai-service.';
        this.updateChatMessages((messages) =>
          messages.map((chatMessage, index) =>
            index === assistantIndex
              ? {
                  ...chatMessage,
                  content: errorMessage,
                }
              : chatMessage
          )
        );
        this.chatLoading.set(false);
      },
    });
  }

  public getFormulaSummary(formula: BeverageFormula): string {
    const ingredientNames = formula.ingredients
      .slice(0, 3)
      .map((item) => item.rawMaterialKey)
      .join(', ');
    const suffix = formula.ingredients.length > 3 ? ` +${formula.ingredients.length - 3} more` : '';

    return ingredientNames
      ? `${ingredientNames}${suffix}`
      : 'No ingredient summary available';
  }

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

  public getStepStatusLabel(status: StreamStepStatus): string {
    if (status === 'done') {
      return 'Done';
    }

    if (status === 'active') {
      return 'In progress';
    }

    return 'Waiting';
  }

  public formatAnalysisSections(value: string): GeneratedTextSection[] {
    const formattedText = this.formatGeneratedText(value)
      .replace(/(^|\s)(\d+)\.\s+(?=[A-Z])/g, '\n$2. ')
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

  public formatChatMessageLines(value: string): FormattedChatLine[] {
    const normalizedText = value
      .replace(/\r\n/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/#{1,6}\s*/g, '\n')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*\*\*/g, '')
      .replace(/^\s*[-*]\s+/gm, '- ')
      .replace(/\s+[-*]\s+(?=[A-Za-z0-9])/g, '\n- ')
      .replace(/\s+(\d+\.\s+)/g, '\n$1')
      .replace(/([,;:!?])(?=\S)/g, '$1 ')
      .replace(/([a-z)])(?=[A-Z][a-z])/g, '$1 ')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const lines = normalizedText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    return lines.length > 0
      ? lines.map((line) => this.toFormattedChatLine(line))
      : [{ kind: 'paragraph', text: 'Thinking...' }];
  }

  private toFormattedChatLine(line: string): FormattedChatLine {
    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      return { kind: 'bullet', text: bulletMatch[1].trim() };
    }

    const numberedMatch = line.match(/^(\d+\.)\s+(.+)$/);
    if (numberedMatch) {
      return { kind: 'bullet', text: `${numberedMatch[1]} ${numberedMatch[2].trim()}` };
    }

    const isHeading = line.length <= 80 && (
      line.endsWith(':') ||
      /^[A-Z][A-Za-z0-9 &/()-]+$/.test(line)
    );

    return {
      kind: isHeading ? 'heading' : 'paragraph',
      text: line.replace(/\s{2,}/g, ' '),
    };
  }

  private buildFormulationInput(): FormulationInput {
    const rawVal = this.form.getRawValue();

    return {
      ...rawVal,
      regionalRestrictions: rawVal.regionalRestrictions
        ? rawVal.regionalRestrictions.split(',').map((s) => s.trim())
        : [],
    };
  }

  private updateChatMessages(updater: (messages: ChatMessage[]) => ChatMessage[]): void {
    this.chatMessages.update((messages) => updater(messages));
  }

  private loadChatHistory(): void {
    this.ollamaService.listChatMessages().subscribe({
      next: (messages) => {
        this.chatMessages.set(messages.length > 0
          ? messages.map((message) => ({ role: message.role, content: message.content }))
          : DEFAULT_CHAT_MESSAGES);
      },
      error: () => {
        this.chatMessages.set(DEFAULT_CHAT_MESSAGES);
      },
    });
  }

  private patchFormFromSavedFormula(savedFormula: SavedBeverageFormula): void {
    const input = savedFormula.input;

    this.form.patchValue({
      drinkName: input?.drinkName ?? savedFormula.name,
      marketDestination: input?.marketDestination ?? '',
      targetBrix: input?.targetBrix ?? 0,
      isAcidified: input?.isAcidified ?? false,
      regionalRestrictions: input?.regionalRestrictions?.join(', ') ?? '',
      productionArea: input?.productionArea ?? '',
      customerSpecification: input?.customerSpecification ?? '',
      baselineBOM: input?.baselineBOM ?? '',
    });
  }

  private buildStreamingTimeline(
    streamingResponse: string,
    formula: BeverageFormula | null,
    loading: boolean
  ): StreamTimelineStep[] {
    if (!loading && !streamingResponse && !formula) {
      return [];
    }

    const ingredientCount = formula?.ingredients.length
      ?? this.countStreamMatches(streamingResponse, /"rawMaterialKey"\s*:/g);
    const massPercentageCount = formula?.ingredients.length
      ?? this.countStreamMatches(streamingResponse, /"massPercentage"\s*:/g);
    const costProjectionCount = formula?.ingredients.length
      ?? this.countStreamMatches(streamingResponse, /"costProjection"\s*:/g);
    const hasVarianceAnalysis = !!formula?.varianceAnalysis || streamingResponse.includes('"varianceAnalysis"');
    const hasStabilityAlerts = !!formula || streamingResponse.includes('"stabilityAlerts"');
    const appearsComplete = !!formula;
    const steps = [
      {
        title: 'Preparing formulation brief',
        detail: 'Reading target parameters, restrictions, baseline BOM, and production constraints.',
        complete: streamingResponse.length > 0 || !!formula,
      },
      {
        title: 'Selecting ingredient matrix',
        detail: ingredientCount > 0
          ? `${ingredientCount} ingredient${ingredientCount === 1 ? '' : 's'} identified for the candidate formula.`
          : 'Waiting for the first ingredient recommendation.',
        complete: ingredientCount > 0,
      },
      {
        title: 'Balancing mass percentages',
        detail: massPercentageCount > 0
          ? `${massPercentageCount} mass percentage value${massPercentageCount === 1 ? '' : 's'} streamed into the formula.`
          : 'Waiting for mass percentage allocation.',
        complete: massPercentageCount > 0 && massPercentageCount >= ingredientCount && ingredientCount > 0,
      },
      {
        title: 'Estimating cost projection',
        detail: costProjectionCount > 0
          ? `${costProjectionCount} cost projection value${costProjectionCount === 1 ? '' : 's'} received.`
          : 'Waiting for cost projection values.',
        complete: costProjectionCount > 0 && costProjectionCount >= ingredientCount && ingredientCount > 0,
      },
      {
        title: 'Writing variance analysis',
        detail: hasVarianceAnalysis
          ? 'Variance and sensory impact analysis is being drafted.'
          : 'Waiting for comparison against the baseline BOM.',
        complete: hasVarianceAnalysis,
      },
      {
        title: 'Checking stability and compliance',
        detail: hasStabilityAlerts
          ? 'Stability and compliance alerts section is available.'
          : 'Waiting for safety and regulatory checks.',
        complete: hasStabilityAlerts,
      },
      {
        title: 'Finalizing formula output',
        detail: appearsComplete
          ? 'Structured formula output is complete and ready for the final table.'
          : 'Waiting for the server to finish the structured formula.',
        complete: appearsComplete,
      },
    ];
    const activeIndex = steps.findIndex((step) => !step.complete);

    return steps.map((step, index) => ({
      title: step.title,
      detail: step.detail,
      status: step.complete ? 'done' : index === activeIndex ? 'active' : 'waiting',
    }));
  }

  private countStreamMatches(value: string, pattern: RegExp): number {
    return value.match(pattern)?.length ?? 0;
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
      .replace(/([.!?])\s+(?=[A-Z0-9])/g, '$1\n')
      .split('\n')
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
  }

 
}
