import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterModule, RouterLink, RouterLinkActive } from '@angular/router';
import { AppLanguage, LanguageService } from '../../../core/i18n/language.service';

@Component({
  selector: 'app-planning-shell',
  standalone: true,
  imports: [RouterModule, RouterLink, RouterLinkActive],
  template: `
    <div class="planning-shell">
      <header class="planning-header">
        <div class="planning-title">
          <span class="planning-kicker">生管部 · PRODUCTION PLANNING</span>
          <h2>{{ t('planningTitle') }}</h2>
          <p>{{ t('planningSubtitle') }}</p>
        </div>
        <div class="line-badges">
          <span class="badge av">AV</span>
          <span class="badge nd">ND</span>
          <span class="badge gv">GV</span>
        </div>
      </header>

      <nav class="planning-nav" role="tablist">
        <a routerLink="dashboard" routerLinkActive="active" class="nav-tab">
          <span class="nav-icon">📊</span>{{ t('navDashboard') }}
        </a>
        <a routerLink="orders" routerLinkActive="active" class="nav-tab">
          <span class="nav-icon">📋</span>{{ t('navOrders') }}
        </a>
        <a routerLink="schedule" routerLinkActive="active" class="nav-tab">
          <span class="nav-icon">📅</span>{{ t('navSchedule') }}
        </a>
        <a routerLink="inventory" routerLinkActive="active" class="nav-tab">
          <span class="nav-icon">📦</span>{{ t('navInventory') }}
        </a>
        <a routerLink="delivery" routerLinkActive="active" class="nav-tab">
          <span class="nav-icon">🚢</span>{{ t('navDelivery') }}
        </a>
      </nav>

      <main class="planning-content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .planning-shell { background: var(--shell-bg, #fff); border: 1px solid var(--shell-border, #dbe4ef); border-radius: 16px; box-shadow: 0 14px 35px rgba(15,23,42,.08); overflow: hidden; color: var(--shell-text, #17233b); }
    .planning-header { align-items: flex-start; background: linear-gradient(135deg, var(--header-bg1, #f8fbff), var(--header-bg2, #eef5ff)); border-bottom: 1px solid var(--shell-border, #dbe4ef); display: flex; gap: 24px; justify-content: space-between; padding: 22px 28px; }
    .planning-kicker { color: #1766c2; font-size: .71rem; font-weight: 800; letter-spacing: .13em; display: block; }
    h2 { color: var(--heading-color, #102f67); font-size: 1.5rem; margin: 5px 0 5px; }
    .planning-header p { color: var(--muted, #5c6b82); margin: 0; font-size: .88rem; }
    .line-badges { display: flex; gap: 6px; align-items: flex-start; padding-top: 4px; }
    .badge { border-radius: 999px; font-size: .72rem; font-weight: 700; padding: 4px 10px; color: #fff; }
    .av { background: #22c55e; } .nd { background: #3b82f6; } .gv { background: #f97316; }
    .planning-nav { display: flex; gap: 2px; padding: 10px 16px; background: var(--nav-bg, #f7faff); border-bottom: 1px solid var(--shell-border, #dbe4ef); overflow-x: auto; }
    .nav-tab { align-items: center; border-radius: 8px; color: var(--tab-color, #5c6b82); display: flex; font-size: .8rem; font-weight: 600; gap: 6px; padding: 7px 14px; text-decoration: none; transition: background .15s, color .15s; white-space: nowrap; }
    .nav-tab:hover { background: var(--tab-hover-bg, #e6effc); color: #1766c2; }
    .nav-tab.active { background: #1766c2; color: #fff; }
    .nav-icon { font-size: .85rem; }
    .planning-content { padding: 20px 24px; min-height: 500px; }

    :host-context(.dark-theme) .planning-shell { background: #111827; border-color: #334155; color: #e2e8f0; }
    :host-context(.dark-theme) .planning-header { background: linear-gradient(135deg, #111827, #17233b); border-color: #334155; }
    :host-context(.dark-theme) h2 { color: #f1f5f9; }
    :host-context(.dark-theme) .planning-header p { color: #aebcd0; }
    :host-context(.dark-theme) .planning-nav { background: #0f172a; border-color: #334155; }
    :host-context(.dark-theme) .nav-tab { color: #aebcd0; }
    :host-context(.dark-theme) .nav-tab:hover { background: #1e293b; color: #93c5fd; }
    :host-context(.dark-theme) .nav-tab.active { background: #1766c2; color: #fff; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanningShellComponent {
  private readonly lang = inject(LanguageService);
  t(key: string): string { return this.lang.translate(key); }
}
