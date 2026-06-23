import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

type AppTheme = 'dark' | 'light';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly storageKey = 'giavico-theme';

  public readonly theme = signal<AppTheme>(this.getInitialTheme());

  constructor() {
    this.applyTheme(this.theme());
  }

  public toggleTheme(): void {
    this.setTheme(this.theme() === 'dark' ? 'light' : 'dark');
  }

  private setTheme(theme: AppTheme): void {
    this.theme.set(theme);
    try {
      this.document.defaultView?.localStorage.setItem(this.storageKey, theme);
    } catch {
      // Storage can be unavailable in private/SSR-like contexts.
    }
    this.applyTheme(theme);
  }

  private getInitialTheme(): AppTheme {
    let savedTheme: string | null | undefined;

    try {
      savedTheme = this.document.defaultView?.localStorage.getItem(this.storageKey);
    } catch {
      savedTheme = null;
    }

    return savedTheme === 'light' ? 'light' : 'dark';
  }

  private applyTheme(theme: AppTheme): void {
    const root = this.document.documentElement;

    root.classList.toggle('light-theme', theme === 'light');
    root.classList.toggle('dark-theme', theme === 'dark');
    root.style.colorScheme = theme;
  }
}
