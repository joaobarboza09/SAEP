import { Component, HostListener, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    @if (auth.user()) {
      <header class="topbar">
        <a class="brand" routerLink="/">🐾 VetCare</a>
        <nav>
          <a routerLink="/" [routerLinkActiveOptions]="{exact:true}" routerLinkActive="active">Início</a>
          <a routerLink="/tutores" routerLinkActive="active">Tutores</a>
          <a routerLink="/pets" routerLinkActive="active">Pets</a>
          <a routerLink="/agendamentos" routerLinkActive="active">Agendamentos</a>
        </nav>
        <div class="user-area"><span>{{ auth.user()?.nome }}</span><button class="button button-light" (click)="logout()">Sair</button></div>
      </header>
    }
    <main class="page"><router-outlet /></main>
  `,
})
export class AppComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    window.setInterval(() => this.auth.maintainSession(), 60_000);
    this.auth.noteActivity();
  }

  @HostListener('document:mousemove')
  @HostListener('document:keydown')
  @HostListener('document:click')
  recordActivity(): void {
    this.auth.noteActivity();
  }

  logout(): void {
    this.auth.logout();
  }
}
