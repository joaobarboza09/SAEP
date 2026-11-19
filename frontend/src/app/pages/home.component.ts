import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="welcome">
      <p class="eyebrow">PAINEL DA CLÍNICA</p>
      <h1>Olá, {{ auth.user()?.nome }} 👋</h1>
      <p class="muted">Tudo pronto para cuidar dos pacientes de hoje.</p>
    </section>
    <section class="module-grid">
      <a class="module-card" routerLink="/tutores"><span class="module-icon">👩‍👧</span><h2>Tutores</h2><p>Cadastre, consulte e atualize os dados dos tutores.</p><span class="link-label">Acessar tutores →</span></a>
      <a class="module-card" routerLink="/pets"><span class="module-icon">🐶</span><h2>Pets</h2><p>Consulte os pacientes e cadastre novos pets.</p><span class="link-label">Acessar pets →</span></a>
      <a class="module-card" routerLink="/agendamentos"><span class="module-icon">📅</span><h2>Agendamentos</h2><p>Organize consultas, retornos e atendimentos.</p><span class="link-label">Acessar agenda →</span></a>
    </section>
  `,
})
export class HomeComponent {
  readonly auth = inject(AuthService);
}
