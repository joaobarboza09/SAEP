import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../core/api.service';
import { Tutor } from '../core/models';

@Component({
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="page-heading"><div><p class="eyebrow">CADASTROS</p><h1>Tutores</h1><p class="muted">Gerencie os responsáveis pelos pacientes.</p></div></section>
    @if (error) { <div class="alert">{{ error }}</div> }
    @if (notice) { <div class="success">{{ notice }}</div> }
    <section class="card form-card">
      <h2>{{ editing ? 'Editar tutor' : 'Novo tutor' }}</h2>
      <form class="form-grid" (ngSubmit)="save()">
        <label>Nome<input name="nome" [(ngModel)]="form.nome" required maxlength="120"></label>
        <label>E-mail<input type="email" name="email" [(ngModel)]="form.email" required maxlength="180"></label>
        <label>Telefone<input name="telefone" [(ngModel)]="form.telefone" required maxlength="30"></label>
        <label>CPF (11 dígitos)<input name="cpf" [(ngModel)]="form.cpf" required maxlength="14" placeholder="000.000.000-00"></label>
        <div class="form-actions"><button class="button button-primary">{{ editing ? 'Salvar alterações' : 'Cadastrar tutor' }}</button>@if (editing) { <button type="button" class="button button-light" (click)="cancelEdit()">Cancelar</button> }</div>
      </form>
    </section>
    <section class="card table-card">
      <div class="table-heading"><h2>Lista de tutores</h2><form class="search" (ngSubmit)="search()"><input name="term" [(ngModel)]="term" placeholder="Buscar por nome, e-mail, telefone ou CPF"><button class="button button-primary">Buscar</button></form></div>
      <div class="table-scroll"><table><thead><tr><th>Nome</th><th>E-mail</th><th>Telefone</th><th>CPF</th><th></th></tr></thead><tbody>
        @for (tutor of tutors; track tutor.id) { <tr><td>{{ tutor.nome }}</td><td>{{ tutor.email }}</td><td>{{ tutor.telefone }}</td><td>{{ maskCpf(tutor.cpf) }}</td><td><button class="button button-light small" (click)="edit(tutor)">Editar</button></td></tr> }
        @empty { <tr><td colspan="5" class="empty">Nenhum tutor encontrado.</td></tr> }
      </tbody></table></div>
    </section>
  `,
})
export class TutorsComponent implements OnInit {
  private readonly api = inject(ApiService);
  tutors: Tutor[] = [];
  term = '';
  error = '';
  notice = '';
  editing = false;
  form: Partial<Tutor> = this.emptyForm();

  ngOnInit(): void { this.load(); }

  load(search = ''): void {
    this.api.getTutors(search).subscribe({
      next: (tutors) => { this.tutors = tutors; this.error = ''; },
      error: (error: HttpErrorResponse) => { this.error = error.error?.error || 'Não foi possível carregar tutores.'; },
    });
  }

  search(): void { this.load(this.term.trim()); }

  save(): void {
    this.error = '';
    this.notice = '';
    this.api.saveTutor(this.form).subscribe({
      next: () => {
        this.notice = this.editing ? 'Tutor atualizado com sucesso.' : 'Tutor cadastrado com sucesso.';
        this.cancelEdit();
        this.load(this.term.trim());
      },
      error: (error: HttpErrorResponse) => { this.error = error.error?.error || 'Não foi possível salvar o tutor.'; },
    });
  }

  edit(tutor: Tutor): void {
    this.form = { ...tutor };
    this.editing = true;
    this.notice = '';
    this.error = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.editing = false;
    this.form = this.emptyForm();
  }

  maskCpf(cpf: string): string {
    const digits = cpf.replace(/\D/g, '');
    return digits.length === 11
      ? `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
      : cpf;
  }

  private emptyForm(): Partial<Tutor> { return { nome: '', email: '', telefone: '', cpf: '' }; }
}
