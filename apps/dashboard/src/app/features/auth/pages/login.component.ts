import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ThemeService } from '../../../core/theme/theme.service';
import { LanguageService, AppLanguage } from '../../../core/i18n/language.service';

type AuthTab = 'login' | 'register';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="auth-page">
      <!-- Background grid -->
      <div class="bg-grid" aria-hidden="true"></div>
      <div class="bg-glow" aria-hidden="true"></div>

      <!-- Top-right controls -->
      <div class="top-controls">
        <select
          class="ctrl-select"
          [value]="langService.language()"
          (change)="setLanguage($any($event.target).value)"
          aria-label="Language"
        >
          <option value="en">EN</option>
          <option value="vi">VI</option>
          <option value="zh-TW">繁中</option>
        </select>
        <button type="button" class="ctrl-btn" (click)="themeService.toggleTheme()">
          {{ themeService.theme() === 'dark' ? '☀' : '☾' }}
        </button>
      </div>

      <!-- Auth card -->
      <div class="auth-card" role="main">
        <!-- Logo -->
        <div class="logo-block">
          <div class="logo-mark" aria-hidden="true">
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="48" height="48">
              <defs>
                <linearGradient id="gv-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#0284c7"/>
                  <stop offset="100%" stop-color="#4f46e5"/>
                </linearGradient>
              </defs>
              <!-- Rounded square base -->
              <rect width="48" height="48" rx="12" fill="url(#gv-grad)"/>
              <!-- G letterform -->
              <path
                d="M30 17.5H24C20.134 17.5 17 20.634 17 24.5C17 28.366 20.134 31.5 24 31.5H30V24.5H25.5V27H27.5V29H24C21.515 29 19.5 26.985 19.5 24.5C19.5 22.015 21.515 20 24 20H30V17.5Z"
                fill="white"
              />
            </svg>
          </div>
          <div class="logo-text">
            <span class="logo-name">GIAVICO</span>
            <span class="logo-sub">{{ t('authSystemSubtitle') }}</span>
          </div>
        </div>

        <!-- Tab bar -->
        <div class="tab-bar" role="tablist">
          <button
            type="button"
            class="tab-btn"
            role="tab"
            [class.active]="activeTab() === 'login'"
            [attr.aria-selected]="activeTab() === 'login'"
            (click)="switchTab('login')"
          >{{ t('authLogin') }}</button>
          <button
            type="button"
            class="tab-btn"
            role="tab"
            [class.active]="activeTab() === 'register'"
            [attr.aria-selected]="activeTab() === 'register'"
            (click)="switchTab('register')"
          >{{ t('authRegister') }}</button>
        </div>

        <!-- LOGIN FORM -->
        <form
          *ngIf="activeTab() === 'login'"
          [formGroup]="loginForm"
          (ngSubmit)="onLogin()"
          class="auth-form"
          novalidate
        >
          <div class="field">
            <label for="login-email">{{ t('authEmail') }}</label>
            <input
              id="login-email"
              type="email"
              formControlName="email"
              [placeholder]="t('authEmailPlaceholder')"
              autocomplete="email"
              [class.has-error]="loginEmailTouched && loginForm.controls.email.invalid"
            />
            <span
              class="field-error"
              *ngIf="loginEmailTouched && loginForm.controls.email.hasError('required')"
            >{{ t('authEmailRequired') }}</span>
            <span
              class="field-error"
              *ngIf="loginEmailTouched && loginForm.controls.email.hasError('email')"
            >{{ t('authEmailInvalid') }}</span>
          </div>

          <div class="field">
            <label for="login-pw">{{ t('authPassword') }}</label>
            <div class="pw-wrap">
              <input
                id="login-pw"
                [type]="showLoginPw() ? 'text' : 'password'"
                formControlName="password"
                [placeholder]="t('authPasswordPlaceholder')"
                autocomplete="current-password"
                [class.has-error]="loginPwTouched && loginForm.controls.password.invalid"
              />
              <button
                type="button"
                class="pw-toggle"
                (click)="showLoginPw.set(!showLoginPw())"
                [attr.aria-label]="showLoginPw() ? t('authHidePassword') : t('authShowPassword')"
              >{{ showLoginPw() ? '🙈' : '👁' }}</button>
            </div>
            <span
              class="field-error"
              *ngIf="loginPwTouched && loginForm.controls.password.hasError('required')"
            >{{ t('authPasswordRequired') }}</span>
          </div>

          <div class="field-error server-error" *ngIf="loginError()">
            {{ loginErrorMessage() }}
          </div>

          <button
            type="submit"
            class="btn-submit"
            [disabled]="loading()"
            (click)="markLoginTouched()"
          >
            <span class="spinner" *ngIf="loading()"></span>
            {{ loading() ? t('authLoggingIn') : t('authLoginBtn') }}
          </button>

          <p class="switch-hint">
            {{ t('authNoAccount') }}
            <button type="button" class="link-btn" (click)="switchTab('register')">
              {{ t('authRegister') }}
            </button>
          </p>
        </form>

        <!-- REGISTER FORM -->
        <form
          *ngIf="activeTab() === 'register'"
          [formGroup]="registerForm"
          (ngSubmit)="onRegister()"
          class="auth-form"
          novalidate
        >
          <div class="field">
            <label for="reg-name">{{ t('authDisplayName') }}</label>
            <input
              id="reg-name"
              type="text"
              formControlName="displayName"
              [placeholder]="t('authDisplayNamePlaceholder')"
              autocomplete="name"
              [class.has-error]="regNameTouched && registerForm.controls.displayName.invalid"
            />
            <span
              class="field-error"
              *ngIf="regNameTouched && registerForm.controls.displayName.hasError('required')"
            >{{ t('authNameRequired') }}</span>
          </div>

          <div class="field">
            <label for="reg-email">{{ t('authEmail') }}</label>
            <input
              id="reg-email"
              type="email"
              formControlName="email"
              [placeholder]="t('authEmailPlaceholder')"
              autocomplete="email"
              [class.has-error]="regEmailTouched && registerForm.controls.email.invalid"
            />
            <span
              class="field-error"
              *ngIf="regEmailTouched && registerForm.controls.email.hasError('required')"
            >{{ t('authEmailRequired') }}</span>
            <span
              class="field-error"
              *ngIf="regEmailTouched && registerForm.controls.email.hasError('email')"
            >{{ t('authEmailInvalid') }}</span>
          </div>

          <div class="field">
            <label for="reg-pw">{{ t('authPassword') }}</label>
            <div class="pw-wrap">
              <input
                id="reg-pw"
                [type]="showRegPw() ? 'text' : 'password'"
                formControlName="password"
                [placeholder]="t('authPasswordMinLength')"
                autocomplete="new-password"
                [class.has-error]="regPwTouched && registerForm.controls.password.invalid"
              />
              <button
                type="button"
                class="pw-toggle"
                (click)="showRegPw.set(!showRegPw())"
                [attr.aria-label]="showRegPw() ? t('authHidePassword') : t('authShowPassword')"
              >{{ showRegPw() ? '🙈' : '👁' }}</button>
            </div>
            <span
              class="field-error"
              *ngIf="regPwTouched && registerForm.controls.password.hasError('required')"
            >{{ t('authPasswordRequired') }}</span>
            <span
              class="field-error"
              *ngIf="regPwTouched && registerForm.controls.password.hasError('minlength')"
            >{{ t('authPasswordMin') }}</span>
          </div>

          <div class="field">
            <label for="reg-confirm">{{ t('authConfirmPassword') }}</label>
            <div class="pw-wrap">
              <input
                id="reg-confirm"
                [type]="showRegConfirm() ? 'text' : 'password'"
                formControlName="confirmPassword"
                [placeholder]="t('authConfirmPasswordPlaceholder')"
                autocomplete="new-password"
                [class.has-error]="regConfirmTouched && (registerForm.controls.confirmPassword.invalid || passwordMismatch())"
              />
              <button
                type="button"
                class="pw-toggle"
                (click)="showRegConfirm.set(!showRegConfirm())"
                [attr.aria-label]="showRegConfirm() ? t('authHidePassword') : t('authShowPassword')"
              >{{ showRegConfirm() ? '🙈' : '👁' }}</button>
            </div>
            <span class="field-error" *ngIf="regConfirmTouched && passwordMismatch()">
              {{ t('authPasswordMismatch') }}
            </span>
          </div>

          <div class="field-error server-error" *ngIf="registerError()">
            {{ registerErrorMessage() }}
          </div>

          <button
            type="submit"
            class="btn-submit"
            [disabled]="loading()"
            (click)="markRegisterTouched()"
          >
            <span class="spinner" *ngIf="loading()"></span>
            {{ loading() ? t('authRegistering') : t('authRegisterBtn') }}
          </button>

          <p class="switch-hint">
            {{ t('authHaveAccount') }}
            <button type="button" class="link-btn" (click)="switchTab('login')">
              {{ t('authLogin') }}
            </button>
          </p>
        </form>

        <!-- Footer badges -->
        <div class="card-footer">
          <span class="badge">生管部</span>
          <span class="badge">AI System</span>
          <span class="badge">v2026</span>
        </div>
      </div>

      <!-- Bottom tagline -->
      <p class="page-tagline">
        Hệ thống Quản lý Sản xuất &nbsp;·&nbsp; 生管部 AI Software System
      </p>
    </div>
  `,
  styles: [`
    /* ─── Page shell ─── */
    .auth-page {
      align-items: center;
      background: #0b1220;
      display: flex;
      flex-direction: column;
      font-family: 'Inter', system-ui, sans-serif;
      justify-content: center;
      min-height: 100vh;
      padding: 24px 16px 48px;
      position: relative;
      overflow: hidden;
    }

    /* ─── Decorative background ─── */
    .bg-grid {
      background-image:
        linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px);
      background-size: 40px 40px;
      inset: 0;
      pointer-events: none;
      position: absolute;
    }
    .bg-glow {
      background: radial-gradient(ellipse 600px 400px at 50% 0%, rgba(2,132,199,0.12) 0%, transparent 70%);
      inset: 0;
      pointer-events: none;
      position: absolute;
    }

    /* ─── Top controls ─── */
    .top-controls {
      align-items: center;
      display: flex;
      gap: 8px;
      position: absolute;
      right: 20px;
      top: 20px;
      z-index: 10;
    }
    .ctrl-select,
    .ctrl-btn {
      background: rgba(17, 28, 46, 0.9);
      border: 1px solid #2b3a50;
      border-radius: 8px;
      color: #94a3b8;
      cursor: pointer;
      font-size: 0.82rem;
      font-weight: 700;
      padding: 7px 10px;
    }
    .ctrl-select:hover,
    .ctrl-btn:hover {
      border-color: #38bdf8;
      color: #38bdf8;
    }

    /* ─── Auth card ─── */
    .auth-card {
      background: #111c2e;
      border: 1px solid #2b3a50;
      border-radius: 20px;
      box-shadow:
        0 0 0 1px rgba(59,130,246,0.06),
        0 24px 64px rgba(0,0,0,0.55),
        0 8px 24px rgba(0,0,0,0.3);
      max-width: 440px;
      padding: 36px 36px 28px;
      position: relative;
      width: 100%;
      z-index: 1;
    }

    /* ─── Logo ─── */
    .logo-block {
      align-items: center;
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 28px;
      text-align: center;
    }
    .logo-mark {
      filter: drop-shadow(0 4px 12px rgba(2,132,199,0.4));
    }
    .logo-name {
      background: linear-gradient(135deg, #38bdf8 0%, #818cf8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      display: block;
      font-size: 1.8rem;
      font-weight: 900;
      letter-spacing: 0.12em;
      line-height: 1;
    }
    .logo-sub {
      color: #64748b;
      display: block;
      font-size: 0.75rem;
      font-weight: 500;
      letter-spacing: 0.04em;
      margin-top: 4px;
      text-transform: uppercase;
    }

    /* ─── Tab bar ─── */
    .tab-bar {
      background: #0b1220;
      border: 1px solid #2b3a50;
      border-radius: 10px;
      display: flex;
      margin-bottom: 24px;
      padding: 3px;
    }
    .tab-btn {
      background: transparent;
      border: none;
      border-radius: 8px;
      color: #64748b;
      cursor: pointer;
      flex: 1;
      font-size: 0.9rem;
      font-weight: 700;
      padding: 10px;
      transition: all 0.18s ease;
    }
    .tab-btn:hover {
      color: #94a3b8;
    }
    .tab-btn.active {
      background: #1e3a5f;
      border: 1px solid #3b82f6;
      color: #93c5fd;
      box-shadow: 0 2px 8px rgba(59,130,246,0.2);
    }

    /* ─── Form ─── */
    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .field label {
      color: #94a3b8;
      font-size: 0.83rem;
      font-weight: 600;
      letter-spacing: 0.01em;
    }
    .field input {
      background: #0b1220;
      border: 1px solid #2b3a50;
      border-radius: 9px;
      color: #f1f5f9;
      font-size: 0.93rem;
      padding: 11px 14px;
      transition: border-color 0.18s, box-shadow 0.18s;
      width: 100%;
    }
    .field input:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59,130,246,0.18);
      outline: none;
    }
    .field input.has-error {
      border-color: #ef4444;
    }
    .field input::placeholder {
      color: #3d5068;
    }

    /* ─── Password toggle ─── */
    .pw-wrap {
      position: relative;
    }
    .pw-wrap input {
      padding-right: 44px;
    }
    .pw-toggle {
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 1rem;
      line-height: 1;
      padding: 0;
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
    }

    /* ─── Errors ─── */
    .field-error {
      color: #f87171;
      font-size: 0.79rem;
      font-weight: 500;
      line-height: 1.4;
    }
    .server-error {
      background: rgba(127,29,29,0.35);
      border: 1px solid rgba(248,113,113,0.45);
      border-radius: 8px;
      padding: 10px 12px;
    }

    /* ─── Submit button ─── */
    .btn-submit {
      align-items: center;
      background: linear-gradient(135deg, #0284c7 0%, #4f46e5 100%);
      border: none;
      border-radius: 10px;
      color: #ffffff;
      cursor: pointer;
      display: flex;
      font-size: 0.95rem;
      font-weight: 700;
      gap: 8px;
      justify-content: center;
      margin-top: 4px;
      padding: 13px;
      transition: opacity 0.18s, transform 0.1s;
      width: 100%;
    }
    .btn-submit:hover:not(:disabled) {
      opacity: 0.92;
      transform: translateY(-1px);
    }
    .btn-submit:active:not(:disabled) {
      transform: translateY(0);
    }
    .btn-submit:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }

    /* ─── Spinner ─── */
    .spinner {
      animation: spin 0.85s linear infinite;
      border: 2px solid rgba(255,255,255,0.25);
      border-left-color: #fff;
      border-radius: 50%;
      display: inline-block;
      height: 16px;
      width: 16px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* ─── Switch hint ─── */
    .switch-hint {
      color: #64748b;
      font-size: 0.84rem;
      margin: 0;
      text-align: center;
    }
    .link-btn {
      background: none;
      border: none;
      color: #38bdf8;
      cursor: pointer;
      font-size: inherit;
      font-weight: 700;
      padding: 0 2px;
    }
    .link-btn:hover {
      color: #7dd3fc;
    }

    /* ─── Card footer ─── */
    .card-footer {
      border-top: 1px solid #1e2d40;
      display: flex;
      gap: 6px;
      justify-content: center;
      margin-top: 24px;
      padding-top: 20px;
    }
    .badge {
      background: #0f1f35;
      border: 1px solid #1e3a5f;
      border-radius: 999px;
      color: #475569;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      padding: 3px 10px;
    }

    /* ─── Page tagline ─── */
    .page-tagline {
      color: #2b3a50;
      font-size: 0.78rem;
      font-weight: 500;
      margin-top: 20px;
      text-align: center;
      z-index: 1;
    }

    /* ─── Light theme ─── */
    :host-context(.light-theme) .auth-page {
      background: #f0f4f8;
    }
    :host-context(.light-theme) .bg-grid {
      background-image:
        linear-gradient(rgba(2,132,199,0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(2,132,199,0.05) 1px, transparent 1px);
    }
    :host-context(.light-theme) .bg-glow {
      background: radial-gradient(ellipse 600px 400px at 50% 0%, rgba(2,132,199,0.07) 0%, transparent 70%);
    }
    :host-context(.light-theme) .auth-card {
      background: #ffffff;
      border-color: #d1dce8;
      box-shadow: 0 8px 32px rgba(15,23,42,0.08), 0 2px 8px rgba(15,23,42,0.04);
    }
    :host-context(.light-theme) .tab-bar {
      background: #f1f5f9;
      border-color: #d1dce8;
    }
    :host-context(.light-theme) .tab-btn {
      color: #94a3b8;
    }
    :host-context(.light-theme) .tab-btn.active {
      background: #eff6ff;
      border-color: #93c5fd;
      color: #1d4ed8;
    }
    :host-context(.light-theme) .field label {
      color: #475569;
    }
    :host-context(.light-theme) .field input {
      background: #f8fafc;
      border-color: #cbd5e1;
      color: #0f172a;
    }
    :host-context(.light-theme) .field input::placeholder {
      color: #94a3b8;
    }
    :host-context(.light-theme) .field input:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
    }
    :host-context(.light-theme) .logo-sub {
      color: #94a3b8;
    }
    :host-context(.light-theme) .switch-hint {
      color: #94a3b8;
    }
    :host-context(.light-theme) .card-footer {
      border-top-color: #e2e8f0;
    }
    :host-context(.light-theme) .badge {
      background: #f1f5f9;
      border-color: #cbd5e1;
      color: #94a3b8;
    }
    :host-context(.light-theme) .page-tagline {
      color: #94a3b8;
    }
    :host-context(.light-theme) .ctrl-select,
    :host-context(.light-theme) .ctrl-btn {
      background: rgba(255,255,255,0.9);
      border-color: #d1dce8;
      color: #475569;
    }
    :host-context(.light-theme) .ctrl-select:hover,
    :host-context(.light-theme) .ctrl-btn:hover {
      border-color: #3b82f6;
      color: #1d4ed8;
    }

    /* ─── Responsive ─── */
    @media (max-width: 480px) {
      .auth-card {
        padding: 28px 20px 22px;
      }
      .logo-name {
        font-size: 1.5rem;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);
  public readonly themeService = inject(ThemeService);
  public readonly langService = inject(LanguageService);

  public readonly activeTab = signal<AuthTab>('login');
  public readonly loading = signal(false);
  public readonly loginError = signal(false);
  public readonly registerError = signal(false);
  public readonly loginErrorCode = signal('');
  public readonly registerErrorCode = signal('');
  public readonly showLoginPw = signal(false);
  public readonly showRegPw = signal(false);
  public readonly showRegConfirm = signal(false);

  public loginEmailTouched = false;
  public loginPwTouched = false;
  public regNameTouched = false;
  public regEmailTouched = false;
  public regPwTouched = false;
  public regConfirmTouched = false;

  public readonly loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  public readonly registerForm = this.fb.group({
    displayName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
  });

  public readonly passwordMismatch = computed(() => {
    const pw = this.registerForm.controls.password.value;
    const confirm = this.registerForm.controls.confirmPassword.value;
    return this.regConfirmTouched && pw !== confirm;
  });

  public readonly loginErrorMessage = computed(() => {
    const code = this.loginErrorCode();
    if (code === 'EMAIL_NOT_FOUND') return this.t('authErrEmailNotFound');
    if (code === 'WRONG_PASSWORD') return this.t('authErrWrongPassword');
    return this.t('authErrGeneric');
  });

  public readonly registerErrorMessage = computed(() => {
    const code = this.registerErrorCode();
    if (code === 'EMAIL_EXISTS') return this.t('authErrEmailExists');
    return this.t('authErrGeneric');
  });

  public t(key: string): string {
    return this.langService.translate(key);
  }

  public setLanguage(lang: AppLanguage): void {
    this.langService.setLanguage(lang);
  }

  public switchTab(tab: AuthTab): void {
    this.activeTab.set(tab);
    this.loginError.set(false);
    this.registerError.set(false);
  }

  public markLoginTouched(): void {
    this.loginEmailTouched = true;
    this.loginPwTouched = true;
    this.loginForm.markAllAsTouched();
  }

  public markRegisterTouched(): void {
    this.regNameTouched = true;
    this.regEmailTouched = true;
    this.regPwTouched = true;
    this.regConfirmTouched = true;
    this.registerForm.markAllAsTouched();
  }

  public onLogin(): void {
    this.markLoginTouched();
    if (this.loginForm.invalid) return;

    const { email, password } = this.loginForm.getRawValue();
    this.loading.set(true);
    this.loginError.set(false);

    this.authService.login(email, password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/']);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.loginErrorCode.set(err.message);
        this.loginError.set(true);
      },
    });
  }

  public onRegister(): void {
    this.markRegisterTouched();
    if (this.registerForm.invalid) return;

    const { email, password, confirmPassword, displayName } = this.registerForm.getRawValue();
    if (password !== confirmPassword) return;

    this.loading.set(true);
    this.registerError.set(false);

    this.authService.register(email, password, displayName).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/']);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.registerErrorCode.set(err.message);
        this.registerError.set(true);
      },
    });
  }
}
