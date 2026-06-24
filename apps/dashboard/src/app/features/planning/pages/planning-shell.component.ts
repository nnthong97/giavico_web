import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterModule, RouterLink, RouterLinkActive } from '@angular/router';
import { AppLanguage, LanguageService } from '../../../core/i18n/language.service';
import { ThemeService } from '../../../core/theme/theme.service';
import { PlanningService } from '../data-access/planning.service';

type ProductLine = 'all' | 'AV' | 'ND' | 'GV';

@Component({
  selector: 'app-planning-shell',
  standalone: true,
  imports: [RouterModule, RouterLink, RouterLinkActive],
  template: `
    <div class="ps-root">
      <!-- ── Sidebar ── -->
      <aside class="ps-sidebar">
        <div class="ps-brand">
          <span class="ps-brand-mark">G</span>
          <div>
            <strong>Giavico</strong>
            <span>生管部 · PLAN</span>
          </div>
        </div>

        <nav class="ps-nav">
          <a routerLink="dashboard" routerLinkActive="active" class="ps-nav-item">
            <span class="ps-nav-icon">📊</span>{{ t('navDashboard') }}
          </a>
          <a routerLink="orders" routerLinkActive="active" class="ps-nav-item">
            <span class="ps-nav-icon">📋</span>{{ t('navOrders') }}
          </a>
          <a routerLink="schedule" routerLinkActive="active" class="ps-nav-item">
            <span class="ps-nav-icon">📅</span>{{ t('navSchedule') }}
          </a>
          <a routerLink="inventory" routerLinkActive="active" class="ps-nav-item">
            <span class="ps-nav-icon">📦</span>{{ t('navInventory') }}
          </a>
          <a routerLink="delivery" routerLinkActive="active" class="ps-nav-item">
            <span class="ps-nav-icon">🚢</span>{{ t('navDelivery') }}
          </a>
        </nav>

        <!-- Product Line Filter -->
        <div class="ps-line-section">
          <span class="ps-section-label">{{ t('productionArea') }}</span>
          <div class="ps-lines">
            @for (line of LINES; track line.key) {
              <button
                type="button"
                class="ps-line-btn"
                [class.active]="svc.selectedLine() === line.key"
                [class.av]="line.key === 'AV'"
                [class.nd]="line.key === 'ND'"
                [class.gv]="line.key === 'GV'"
                (click)="svc.selectedLine.set(line.key)"
              >{{ line.label }}</button>
            }
          </div>
        </div>

        <!-- Controls -->
        <div class="ps-controls">
          <label class="ps-control-label">{{ t('language') }}</label>
          <select class="ps-select" [value]="lang.language()" (change)="setLang($any($event.target).value)">
            <option value="en">EN</option>
            <option value="vi">VI</option>
            <option value="zh-TW">繁中</option>
          </select>
          <button type="button" class="ps-theme-btn" (click)="theme.toggleTheme()">
            {{ theme.theme() === 'dark' ? t('lightMode') : t('darkMode') }}
          </button>
        </div>

        <a routerLink="/" class="ps-back-link">← {{ t('workbenchTitle') }}</a>
      </aside>

      <!-- ── Main ── -->
      <main class="ps-main">
        <header class="ps-header">
          <div>
            <span class="ps-kicker">生管部 · PRODUCTION PLANNING</span>
            <h1>{{ t('planningTitle') }}</h1>
            <p>{{ t('planningSubtitle') }}</p>
          </div>
          @if (svc.selectedLine() !== 'all') {
            <div class="ps-active-line" [class.av]="svc.selectedLine()==='AV'" [class.nd]="svc.selectedLine()==='ND'" [class.gv]="svc.selectedLine()==='GV'">
              {{ svc.selectedLine() }}
            </div>
          }
        </header>
        <div class="ps-content">
          <router-outlet />
        </div>
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; font-family: 'Inter', system-ui, sans-serif; }

    /* ── Layout ── */
    .ps-root {
      display: grid;
      grid-template-columns: 220px minmax(0, 1fr);
      min-height: 100vh;
      background: #0f172a;
      color: #e2e8f0;
    }

    /* ── Sidebar ── */
    .ps-sidebar {
      background: #111827;
      border-right: 1px solid #1e293b;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      position: sticky;
      top: 0;
      height: 100vh;
      overflow-y: auto;
    }

    /* Brand */
    .ps-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      padding-bottom: 16px;
      border-bottom: 1px solid #1e293b;
    }
    .ps-brand-mark {
      width: 36px; height: 36px;
      border-radius: 8px;
      background: linear-gradient(135deg, #0284c7, #4f46e5);
      color: #fff;
      font-weight: 800;
      display: inline-flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .ps-brand strong { display: block; color: #f8fafc; font-size: .94rem; }
    .ps-brand span   { display: block; color: #64748b; font-size: .74rem; margin-top: 2px; }

    /* Nav */
    .ps-nav { display: flex; flex-direction: column; gap: 2px; }
    .ps-nav-item {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 10px;
      border-radius: 8px;
      font-size: .82rem; font-weight: 600;
      color: #94a3b8;
      text-decoration: none;
      transition: background .15s, color .15s;
    }
    .ps-nav-item:hover { background: #1e293b; color: #cbd5e1; }
    .ps-nav-item.active { background: #1e3a5f; color: #60a5fa; }
    .ps-nav-icon { font-size: .82rem; }

    /* Line filter */
    .ps-line-section { display: flex; flex-direction: column; gap: 8px; }
    .ps-section-label { font-size: .7rem; font-weight: 700; letter-spacing: .1em; color: #475569; text-transform: uppercase; }
    .ps-lines { display: flex; flex-wrap: wrap; gap: 6px; }
    .ps-line-btn {
      padding: 4px 12px;
      border-radius: 999px;
      border: 1px solid #334155;
      background: transparent;
      color: #94a3b8;
      font-size: .75rem; font-weight: 700;
      cursor: pointer;
      transition: all .15s;
    }
    .ps-line-btn:hover { border-color: #64748b; color: #cbd5e1; }
    .ps-line-btn.active        { color: #fff; border-color: transparent; }
    .ps-line-btn.active.av     { background: #16a34a; }
    .ps-line-btn.active.nd     { background: #2563eb; }
    .ps-line-btn.active.gv     { background: #ea580c; }
    .ps-line-btn:not(.active)[class*="av"]:hover { color: #4ade80; border-color: #16a34a; }
    .ps-line-btn:not(.active)[class*="nd"]:hover { color: #60a5fa; border-color: #2563eb; }
    .ps-line-btn:not(.active)[class*="gv"]:hover { color: #fb923c; border-color: #ea580c; }

    /* Controls */
    .ps-controls { display: flex; flex-direction: column; gap: 8px; margin-top: auto; }
    .ps-control-label { font-size: .7rem; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: .08em; }
    .ps-select {
      width: 100%; padding: 6px 8px; border-radius: 6px;
      border: 1px solid #334155; background: #1e293b; color: #cbd5e1;
      font-size: .8rem; cursor: pointer;
    }
    .ps-theme-btn {
      width: 100%; padding: 7px 10px; border-radius: 8px;
      border: 1px solid #334155; background: #1e293b; color: #94a3b8;
      font-size: .78rem; font-weight: 600; cursor: pointer;
      transition: background .15s, color .15s;
    }
    .ps-theme-btn:hover { background: #0f172a; color: #cbd5e1; }
    .ps-back-link {
      display: block; font-size: .76rem; color: #475569; text-decoration: none;
      padding: 6px 2px;
    }
    .ps-back-link:hover { color: #94a3b8; }

    /* ── Main area ── */
    .ps-main { display: flex; flex-direction: column; min-height: 100vh; }

    .ps-header {
      padding: 22px 28px 16px;
      background: linear-gradient(135deg, #111827, #17233b);
      border-bottom: 1px solid #1e293b;
      display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
    }
    .ps-kicker { display: block; font-size: .68rem; font-weight: 800; letter-spacing: .14em; color: #3b82f6; margin-bottom: 4px; }
    .ps-header h1 { font-size: 1.4rem; color: #f1f5f9; margin: 0 0 4px; font-weight: 700; }
    .ps-header p  { margin: 0; font-size: .83rem; color: #64748b; }

    .ps-active-line {
      padding: 8px 18px; border-radius: 999px; font-size: .85rem; font-weight: 800;
      color: #fff; flex-shrink: 0; margin-top: 4px;
    }
    .ps-active-line.av { background: #16a34a; }
    .ps-active-line.nd { background: #2563eb; }
    .ps-active-line.gv { background: #ea580c; }

    .ps-content { padding: 22px 24px; flex: 1; }

    /* ── Light theme overrides ── */
    :host-context(.light-theme) .ps-root      { background: #f4f7f5; color: #1a1b1f; }
    :host-context(.light-theme) .ps-sidebar   { background: #fff; border-color: #e2e8f0; }
    :host-context(.light-theme) .ps-brand     { border-color: #e2e8f0; }
    :host-context(.light-theme) .ps-brand strong { color: #1e293b; }
    :host-context(.light-theme) .ps-brand span   { color: #94a3b8; }
    :host-context(.light-theme) .ps-nav-item  { color: #64748b; }
    :host-context(.light-theme) .ps-nav-item:hover  { background: #f1f5f9; color: #1e293b; }
    :host-context(.light-theme) .ps-nav-item.active { background: #dbeafe; color: #1d4ed8; }
    :host-context(.light-theme) .ps-line-btn  { border-color: #cbd5e1; color: #64748b; }
    :host-context(.light-theme) .ps-line-btn:hover { border-color: #94a3b8; color: #1e293b; }
    :host-context(.light-theme) .ps-select    { background: #f8fafc; border-color: #cbd5e1; color: #334155; }
    :host-context(.light-theme) .ps-theme-btn { background: #f8fafc; border-color: #cbd5e1; color: #64748b; }
    :host-context(.light-theme) .ps-theme-btn:hover { background: #f1f5f9; color: #1e293b; }
    :host-context(.light-theme) .ps-header    { background: linear-gradient(135deg, #f8fbff, #eef5ff); border-color: #e2e8f0; }
    :host-context(.light-theme) .ps-header h1 { color: #102f67; }
    :host-context(.light-theme) .ps-header p  { color: #64748b; }
    :host-context(.light-theme) .ps-kicker    { color: #1766c2; }
    :host-context(.light-theme) .ps-back-link { color: #94a3b8; }
    :host-context(.light-theme) .ps-back-link:hover { color: #64748b; }
    :host-context(.light-theme) .ps-section-label { color: #94a3b8; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanningShellComponent {
  readonly lang  = inject(LanguageService);
  readonly theme = inject(ThemeService);
  readonly svc   = inject(PlanningService);

  readonly LINES: { key: 'all' | 'AV' | 'ND' | 'GV'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'AV',  label: 'AV' },
    { key: 'ND',  label: 'ND' },
    { key: 'GV',  label: 'GV' },
  ];

  t(key: string): string { return this.lang.translate(key); }
  setLang(v: AppLanguage): void { this.lang.setLanguage(v); }
}
