import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../core/api.service';
import { Pet, Tutor } from '../core/models';

@Component({
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <section class="page-heading"><div><p class="eyebrow">CADASTROS</p><h1>Pets</h1><p class="muted">Pacientes e seus respectivos tutores.</p></div></section>
    @if (error) { <div class="alert">{{ error }}</div> }
    @if (notice) { <div class="success">{{ notice }}</div> }
    <section class="card form-card"><h2>Novo pet</h2>
      <form class="form-grid" (ngSubmit)="save()">
        <label>Nome<input name="nome" [(ngModel)]="form.nome" required maxlength="100"></label>
        <label>Espécie<input name="especie" [(ngModel)]="form.especie" required maxlength="60" placeholder="Cachorro, gato..."></label>
        <label>Raça<input name="raca" [(ngModel)]="form.raca" maxlength="100"></label>
        <label>Data de nascimento<input type="date" name="data_nascimento" [(ngModel)]="form.data_nascimento"></label>
        <label>Tutor<select name="tutor_id" [(ngModel)]="form.tutor_id" required><option [ngValue]="undefined" disabled>Selecione um tutor</option>@for (tutor of tutors; track tutor.id) { <option [ngValue]="tutor.id">{{ tutor.nome }}</option> }</select></label>
        <label class="wide">Observações<textarea name="observacoes" [(ngModel)]="form.observacoes" rows="2"></textarea></label>
        <div class="form-actions"><button class="button button-primary" [disabled]="!tutors.length">Cadastrar pet</button></div>
      </form>
    </section>
    <section class="card table-card"><div class="table-heading"><h2>Lista de pets</h2></div>
      <div class="table-scroll"><table><thead><tr><th>Pet</th><th>Espécie</th><th>Raça</th><th>Tutor</th><th>Nascimento</th></tr></thead><tbody>
        @for (pet of pets; track pet.id) { <tr><td>{{ pet.nome }}</td><td>{{ pet.especie }}</td><td>{{ pet.raca || '—' }}</td><td>{{ pet.tutor_nome }}</td><td>{{ pet.data_nascimento ? (pet.data_nascimento | date:'dd/MM/yyyy') : '—' }}</td></tr> }
        @empty { <tr><td colspan="5" class="empty">Nenhum pet cadastrado.</td></tr> }
      </tbody></table></div>
    </section>
  `,
})
export class PetsComponent implements OnInit {
  private readonly api = inject(ApiService);
  tutors: Tutor[] = [];
  pets: Pet[] = [];
  error = '';
  notice = '';
  form: Partial<Pet> = this.emptyForm();

  ngOnInit(): void {
    this.api.getTutors().subscribe({
      next: (tutors) => { this.tutors = tutors; },
      error: (error: HttpErrorResponse) => { this.error = error.error?.error || 'Não foi possível carregar tutores.'; },
    });
    this.loadPets();
  }

  save(): void {
    this.error = '';
    this.notice = '';
    this.api.createPet(this.form).subscribe({
      next: () => {
        this.notice = 'Pet cadastrado com sucesso.';
        this.form = this.emptyForm();
        this.loadPets();
      },
      error: (error: HttpErrorResponse) => { this.error = error.error?.error || 'Não foi possível salvar o pet.'; },
    });
  }

  private loadPets(): void {
    this.api.getPets().subscribe({
      next: (pets) => { this.pets = pets; },
      error: (error: HttpErrorResponse) => { this.error = error.error?.error || 'Não foi possível carregar pets.'; },
    });
  }

  private emptyForm(): Partial<Pet> {
    return { nome: '', especie: '', raca: '', tutor_id: undefined, data_nascimento: null, observacoes: '' };
  }
}
