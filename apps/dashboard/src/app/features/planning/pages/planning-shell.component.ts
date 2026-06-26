import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterModule, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AppLanguage, LanguageService } from '../../../core/i18n/language.service';
import { ThemeService } from '../../../core/theme/theme.service';
import { PlanningService } from '../data-access/planning.service';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-planning-shell',
  standalone: true,
  imports: [RouterModule, RouterLink, RouterLinkActive, CommonModule],
  template: `
    <div class="planning-app">

      <!-- ── Top header (matches R&D Documents pattern) ── -->
      <header class="planning-header">
        <div class="ph-brand">
          <a routerLink="/" class="ph-brand-link" aria-label="Back to Workbench">
            <span class="ph-brand-mark">G</span>
            <span>
              <strong>Giavico</strong>
              <small>生管部 · Production Planning</small>
            </span>
          </a>
        </div>

        <nav class="ph-nav" role="tablist">
          <a routerLink="dashboard"  routerLinkActive="active" class="ph-tab">📊 {{ t('navDashboard') }}</a>
          <a routerLink="orders"     routerLinkActive="active" class="ph-tab">📋 {{ t('navOrders') }}</a>
          <a routerLink="schedule"   routerLinkActive="active" class="ph-tab">📅 {{ t('navSchedule') }}</a>
          <a routerLink="inventory"  routerLinkActive="active" class="ph-tab">📦 {{ t('navInventory') }}</a>
          <a routerLink="delivery"   routerLinkActive="active" class="ph-tab">🚢 {{ t('navDelivery') }}</a>
        </nav>

        <div class="ph-tools">
          <label class="sr-only">{{ t('language') }}</label>
          <select class="ph-select" [value]="lang.language()" (change)="setLang($any($event.target).value)">
            <option value="en">EN</option>
            <option value="vi">VI</option>
            <option value="zh-TW">繁中</option>
          </select>
          <button type="button" class="ph-btn" (click)="theme.toggleTheme()">
            {{ theme.theme() === 'dark' ? t('lightMode') : t('darkMode') }}
          </button>
          <div class="ph-user-chip" *ngIf="auth.currentUser() as user">
            <span class="ph-user-avatar">{{ userInitials() }}</span>
            <span class="ph-user-name">{{ user.displayName }}</span>
          </div>
          <button type="button" class="ph-btn ph-btn-logout" (click)="onLogout()">
            {{ t('authLogout') }}
          </button>
        </div>
      </header>

      <!-- ── Product line filter bar ── -->
      <div class="ph-line-bar">
        <span class="ph-line-label">{{ t('productionArea') }}:</span>
        @for (line of LINES; track line.key) {
          <button
            type="button"
            class="ph-line-btn"
            [class.active]="svc.selectedLine() === line.key"
            [attr.data-line]="line.key"
            (click)="svc.selectedLine.set(line.key)"
          >{{ line.label }}</button>
        }
        @if (svc.selectedLine() !== 'all') {
          <span class="ph-line-active-badge" [attr.data-line]="svc.selectedLine()">
            {{ svc.selectedLine() }}
          </span>
        }
      </div>

      <!-- ── Page content ── -->
      <main class="ph-content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; font-family: 'Inter', system-ui, sans-serif; }

    /* ── App shell ── */
    .planning-app {
      background: #0b1220;
      color: #dbe5f2;
      min-height: 100vh;
    }

    /* ── Header ── */
    .planning-header {
      position: sticky;
      top: 0;
      z-index: 10;
      background: #111c2e;
      border-bottom: 1px solid #2b3a50;
      display: grid;
      grid-template-columns: minmax(220px, 1fr) auto minmax(220px, 1fr);
      align-items: center;
      gap: 28px;
      min-height: 72px;
      padding: 12px 28px;
    }

    /* Brand */
    .ph-brand-link {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      color: #f8fafc;
    }
    .ph-brand-link:hover .ph-brand-mark { opacity: .85; }
    .ph-brand-mark {
      width: 38px; height: 38px; flex-shrink: 0;
      border-radius: 6px;
      background: linear-gradient(135deg, #0284c7, #4f46e5);
      color: #fff; font-weight: 900;
      display: inline-flex; align-items: center; justify-content: center;
    }
    .ph-brand-link strong { display: block; font-size: .94rem; color: #f8fafc; }
    .ph-brand-link small  { display: block; font-size: .72rem; color: #91a1b8; margin-top: 2px; }

    /* Nav tabs */
    .ph-nav {
      display: flex;
      gap: 4px;
      justify-content: center;
    }
    .ph-tab {
      border-radius: 6px;
      color: #9fb0c6;
      font-size: .84rem;
      font-weight: 700;
      padding: 9px 12px;
      text-decoration: none;
      white-space: nowrap;
      transition: background .15s, color .15s;
    }
    .ph-tab:hover { background: #1b2a40; color: #f8fafc; }
    .ph-tab.active { background: #1b2a40; color: #f8fafc; }

    /* Tools */
    .ph-tools {
      display: flex;
      align-items: center;
      gap: 8px;
      justify-content: flex-end;
    }
    .ph-select, .ph-btn {
      background: #0b1220;
      border: 1px solid #3a4b63;
      border-radius: 6px;
      color: #dbe5f2;
      font: inherit;
      font-size: .83rem;
      padding: 8px 10px;
      cursor: pointer;
    }
    .ph-select:focus, .ph-btn:hover { border-color: #3b82f6; outline: none; }
    .ph-user-chip {
      align-items: center;
      background: #0b1220;
      border: 1px solid #3a4b63;
      border-radius: 999px;
      display: flex;
      gap: 7px;
      max-width: 160px;
      padding: 4px 10px 4px 4px;
    }
    .ph-user-avatar {
      align-items: center;
      background: linear-gradient(135deg, #0284c7, #4f46e5);
      border-radius: 50%;
      color: #fff;
      display: inline-flex;
      flex-shrink: 0;
      font-size: .68rem;
      font-weight: 800;
      height: 24px;
      justify-content: center;
      width: 24px;
    }
    .ph-user-name {
      color: #dbe5f2;
      font-size: .78rem;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .ph-btn-logout { border-color: rgba(248,113,113,.4); color: #fca5a5; }
    .ph-btn-logout:hover { background: rgba(127,29,29,.3); border-color: #ef4444; }

    /* ── Line filter bar ── */
    .ph-line-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 28px;
      background: #0d1525;
      border-bottom: 1px solid #1e2d42;
      flex-wrap: wrap;
    }
    .ph-line-label {
      font-size: .72rem;
      font-weight: 700;
      color: #4b617e;
      text-transform: uppercase;
      letter-spacing: .08em;
      margin-right: 4px;
    }
    .ph-line-btn {
      padding: 4px 14px;
      border-radius: 999px;
      border: 1px solid #2b3a50;
      background: transparent;
      color: #6b839e;
      font-size: .78rem; font-weight: 700;
      cursor: pointer;
      transition: all .15s;
    }
    .ph-line-btn:hover  { border-color: #4b617e; color: #dbe5f2; }
    .ph-line-btn.active { background: #1b2a40; border-color: #3b82f6; color: #93c5fd; }
    .ph-line-btn.active[data-line="AV"] { border-color: #22c55e; color: #86efac; background: #052e16; }
    .ph-line-btn.active[data-line="ND"] { border-color: #3b82f6; color: #93c5fd; background: #1e3a5f; }
    .ph-line-btn.active[data-line="GV"] { border-color: #f97316; color: #fdba74; background: #431407; }

    .ph-line-active-badge {
      font-size: .72rem; font-weight: 800;
      padding: 3px 10px; border-radius: 999px;
      margin-left: 4px;
    }
    .ph-line-active-badge[data-line="AV"] { background: #16a34a; color: #fff; }
    .ph-line-active-badge[data-line="ND"] { background: #2563eb; color: #fff; }
    .ph-line-active-badge[data-line="GV"] { background: #ea580c; color: #fff; }

    /* ── Content ── */
    .ph-content {
      margin: 0 auto;
      max-width: 1320px;
      padding: 32px 28px 64px;
    }

    /* ── Light theme ── */
    :host-context(.light-theme) .planning-app   { background: #f4f7fb; color: #1a2636; }
    :host-context(.light-theme) .planning-header { background: #fff; border-color: #dde4ef; }
    :host-context(.light-theme) .ph-brand-link  { color: #1e293b; }
    :host-context(.light-theme) .ph-brand-link small { color: #64748b; }
    :host-context(.light-theme) .ph-tab         { color: #64748b; }
    :host-context(.light-theme) .ph-tab:hover, :host-context(.light-theme) .ph-tab.active { background: #f1f5f9; color: #1e293b; }
    :host-context(.light-theme) .ph-select,
    :host-context(.light-theme) .ph-btn         { background: #f8fafc; border-color: #cbd5e1; color: #334155; }
    :host-context(.light-theme) .ph-line-bar    { background: #f1f5f9; border-color: #dde4ef; }
    :host-context(.light-theme) .ph-line-label  { color: #94a3b8; }
    :host-context(.light-theme) .ph-line-btn    { border-color: #e2e8f0; color: #64748b; }
    :host-context(.light-theme) .ph-line-btn:hover { border-color: #94a3b8; color: #1e293b; }
    :host-context(.light-theme) .ph-line-btn.active { background: #dbeafe; border-color: #3b82f6; color: #1d4ed8; }
    :host-context(.light-theme) .ph-user-chip { background: #f8fafc; border-color: #cbd5e1; }
    :host-context(.light-theme) .ph-user-name { color: #334155; }
    :host-context(.light-theme) .ph-btn-logout { border-color: rgba(220,38,38,.3); color: #dc2626; }
    :host-context(.light-theme) .ph-btn-logout:hover { background: rgba(254,226,226,.5); border-color: #ef4444; }

    /* Accessibility */
    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanningShellComponent {
  readonly lang  = inject(LanguageService);
  readonly theme = inject(ThemeService);
  readonly svc   = inject(PlanningService);
  readonly auth  = inject(AuthService);
  private readonly router = inject(Router);

  readonly LINES: { key: 'all' | 'AV' | 'ND' | 'GV'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'AV',  label: 'AV – Nha Đam' },
    { key: 'ND',  label: 'ND – Thạch Dừa' },
    { key: 'GV',  label: 'GV – Nước Trái Cây' },
  ];

  t(key: string): string { return this.lang.translate(key); }
  setLang(v: AppLanguage): void { this.lang.setLanguage(v); }

  onLogout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  userInitials(): string {
    const name = this.auth.currentUser()?.displayName ?? '';
    if (!name) return 'G';
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  }
}
