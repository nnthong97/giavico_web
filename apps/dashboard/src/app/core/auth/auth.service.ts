import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { GIAVICO_API_DOMAINS } from '../config/giavico-api-domains';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'manager' | 'viewer';
  createdAt: string;
}

interface StoredUser {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  role: 'admin' | 'manager' | 'viewer';
  createdAt: string;
}

interface ApiAuthResponse {
  token: string;
  user: AuthUser;
}

const STORAGE_TOKEN_KEY = 'giavico-auth-token';
const STORAGE_USER_KEY = 'giavico-auth-user';
const STORAGE_USERS_KEY = 'giavico-users-db';

function simpleHash(value: string): string {
  return btoa(encodeURIComponent(value + 'giavico_salt_2026'));
}

function generateId(): string {
  return `usr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly _user = signal<AuthUser | null>(this.loadPersistedUser());
  public readonly currentUser = this._user.asReadonly();
  public readonly isAuthenticated = computed(() => this._user() !== null);

  private loadPersistedUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(STORAGE_USER_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  }

  public login(email: string, password: string): Observable<AuthUser> {
    return this.http
      .post<ApiAuthResponse>(`${GIAVICO_API_DOMAINS.auth}/login`, { email, password })
      .pipe(
        tap((res) => this.persistSession(res.token, res.user)),
        map((res) => res.user),
        catchError(() => this.loginMock(email, password))
      );
  }

  public register(email: string, password: string, displayName: string): Observable<AuthUser> {
    return this.http
      .post<ApiAuthResponse>(`${GIAVICO_API_DOMAINS.auth}/register`, { email, password, displayName })
      .pipe(
        tap((res) => this.persistSession(res.token, res.user)),
        map((res) => res.user),
        catchError(() => this.registerMock(email, password, displayName))
      );
  }

  public logout(): void {
    this._user.set(null);
    try {
      localStorage.removeItem(STORAGE_TOKEN_KEY);
      localStorage.removeItem(STORAGE_USER_KEY);
    } catch { /* noop */ }
  }

  public getToken(): string | null {
    try {
      return localStorage.getItem(STORAGE_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  private persistSession(token: string, user: AuthUser): void {
    this._user.set(user);
    try {
      localStorage.setItem(STORAGE_TOKEN_KEY, token);
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
    } catch { /* noop */ }
  }

  private loginMock(email: string, password: string): Observable<AuthUser> {
    const users = this.loadUsersDb();
    const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!found) {
      return throwError(() => new Error('EMAIL_NOT_FOUND'));
    }
    if (found.passwordHash !== simpleHash(password)) {
      return throwError(() => new Error('WRONG_PASSWORD'));
    }
    const user: AuthUser = { id: found.id, email: found.email, displayName: found.displayName, role: found.role, createdAt: found.createdAt };
    this.persistSession(`mock_token_${found.id}`, user);
    return of(user);
  }

  private registerMock(email: string, password: string, displayName: string): Observable<AuthUser> {
    const users = this.loadUsersDb();
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return throwError(() => new Error('EMAIL_EXISTS'));
    }
    const newUser: StoredUser = {
      id: generateId(),
      email,
      displayName,
      passwordHash: simpleHash(password),
      role: 'viewer',
      createdAt: new Date().toISOString(),
    };
    this.saveUsersDb([...users, newUser]);
    const user: AuthUser = { id: newUser.id, email: newUser.email, displayName: newUser.displayName, role: newUser.role, createdAt: newUser.createdAt };
    this.persistSession(`mock_token_${newUser.id}`, user);
    return of(user);
  }

  private loadUsersDb(): StoredUser[] {
    try {
      const raw = localStorage.getItem(STORAGE_USERS_KEY);
      return raw ? (JSON.parse(raw) as StoredUser[]) : [];
    } catch {
      return [];
    }
  }

  private saveUsersDb(users: StoredUser[]): void {
    try {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
    } catch { /* noop */ }
  }
}
