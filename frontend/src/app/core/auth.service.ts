import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { AuthResponse, User } from './models';

const API_URL = 'http://localhost:3000/api';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly user = signal<User | null>(this.readUser());
  private expiry = Number(sessionStorage.getItem('expiresAt')) || 0;
  private lastActivity = Date.now();

  constructor(private http: HttpClient, private router: Router) {}

  get token(): string | null {
    return sessionStorage.getItem('token');
  }

  get expiresAt(): number {
    return this.expiry;
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_URL}/auth/login`, { email, password }).pipe(
      tap((response) => this.saveSession(response)),
    );
  }

  refresh(): Observable<{ expiresAt: number }> {
    return this.http.post<{ expiresAt: number }>(`${API_URL}/auth/refresh`, {}).pipe(
      tap(({ expiresAt }) => {
        this.expiry = expiresAt;
        sessionStorage.setItem('expiresAt', String(expiresAt));
      }),
    );
  }

  noteActivity(): void {
    this.lastActivity = Date.now();
  }

  maintainSession(): void {
    if (!this.token) return;
    if (Date.now() >= this.expiry) {
      this.clearSession();
      return;
    }
    if (Date.now() - this.lastActivity < 5 * 60 * 1000) {
      this.refresh().subscribe({ error: () => this.clearSession() });
    }
  }

  logout(): void {
    const token = this.token;
    if (token) {
      this.http.post(`${API_URL}/auth/logout`, {}).subscribe({
        complete: () => this.clearSession(),
        error: () => this.clearSession(),
      });
    } else {
      this.clearSession();
    }
  }

  clearSession(): void {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('expiresAt');
    this.expiry = 0;
    this.user.set(null);
    void this.router.navigate(['/login']);
  }

  private saveSession(response: AuthResponse): void {
    sessionStorage.setItem('token', response.token);
    sessionStorage.setItem('user', JSON.stringify(response.user));
    sessionStorage.setItem('expiresAt', String(response.expiresAt));
    this.expiry = response.expiresAt;
    this.lastActivity = Date.now();
    this.user.set(response.user);
  }

  private readUser(): User | null {
    try {
      const user = sessionStorage.getItem('user');
      return user ? JSON.parse(user) as User : null;
    } catch {
      sessionStorage.removeItem('user');
      return null;
    }
  }
}
