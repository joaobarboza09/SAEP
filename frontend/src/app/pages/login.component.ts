import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="login-wrap">
      <form class="card login-card" (ngSubmit)="submit()">
        <div class="login-icon">🐾</div>
        <p class="eyebrow">BEM-VINDO À VETCARE</p>
        <h1>Acesse sua conta</h1>
        <p class="muted">Entre para cuidar da rotina da clínica.</p>
        @if (error) { <div class="alert">{{ error }}</div> }
        <label>E-mail<input type="email" name="email" [(ngModel)]="email" required autocomplete="username"></label>
        <label>Senha<input type="password" name="password" [(ngModel)]="password" required autocomplete="current-password"></label>
        <button class="button button-primary full" [disabled]="loading">{{ loading ? 'Entrando...' : 'Entrar' }}</button>
        <p class="hint">Demonstração: ana&#64;clinica.com / Vet&#64;12345</p>
      </form>
    </section>
  `,
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';
  loading = false;
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  submit(): void {
    this.error = '';
    if (!this.email.trim() || !this.password) {
      this.error = 'Preencha o e-mail e a senha.';
      return;
    }
    this.loading = true;
    this.auth.login(this.email, this.password).subscribe({
      next: () => void this.router.navigate(['/']),
      error: (error: HttpErrorResponse) => {
        this.error = error.error?.error || 'Não foi possível autenticar. Tente novamente.';
        this.loading = false;
      },
    });
  }
}
