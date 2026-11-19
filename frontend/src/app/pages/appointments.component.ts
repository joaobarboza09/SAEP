import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../core/api.service';
import { Appointment, Pet, Tutor } from '../core/models';

@Component({
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <section class="page-heading"><div><p class="eyebrow">ATENDIMENTO</p><h1>Agendamentos</h1><p class="muted">Consultas organizadas por data e horário.</p></div></section>
    @if (error) { <div class="alert">{{ error }}</div> }
    @if (notice) { <div class="success">{{ notice }}</div> }
    <section class="card form-card"><h2>Novo agendamento</h2>
      <form class="form-grid" (ngSubmit)="save()">
        <label>Tutor<select name="tutor_id" [(ngModel)]="form.tutor_id" (ngModelChange)="selectTutor($event)" required><option [ngValue]="undefined" disabled>Selecione um tutor</option>@for (tutor of tutors; track tutor.id) { <option [ngValue]="tutor.id">{{ tutor.nome }}</option> }</select></label>
        <label>Pet<select name="pet_id" [(ngModel)]="form.pet_id" required><option [ngValue]="undefined" disabled>Selecione um pet</option>@for (pet of availablePets; track pet.id) { <option [ngValue]="pet.id">{{ pet.nome }}</option> }</select></label>
        <label>Data e hora<input type="datetime-local" name="data_agendamento" [(ngModel)]="form.data_agendamento" required></label>
        <label>Motivo<input name="motivo" [(ngModel)]="form.motivo" required maxlength="255"></label>
        <div class="form-actions"><button class="button button-primary" [disabled]="!pets.length">Agendar consulta</button></div>
      </form>
    </section>
    <section class="card table-card"><div class="table-heading"><h2>Agenda</h2></div>
      <div class="table-scroll"><table><thead><tr><th>Data e hora</th><th>Pet</th><th>Tutor</th><th>Motivo</th><th>Alterar data</th></tr></thead><tbody>
        @for (item of appointments; track item.id) { <tr><td>{{ item.data_agendamento | date:'dd/MM/yyyy HH:mm' }}</td><td>{{ item.pet_nome }}</td><td>{{ item.tutor_nome }}</td><td>{{ item.motivo }}</td><td><form class="inline-edit" (ngSubmit)="updateDate(item)"><input type="datetime-local" [name]="'date-' + item.id" [(ngModel)]="editDates[item.id]" required><button class="button button-light small">Salvar</button></form></td></tr> }
        @empty { <tr><td colspan="5" class="empty">Nenhum agendamento cadastrado.</td></tr> }
      </tbody></table></div>
    </section>
  `,
})
export class AppointmentsComponent implements OnInit {
  private readonly api = inject(ApiService);
  tutors: Tutor[] = [];
  pets: Pet[] = [];
  appointments: Appointment[] = [];
  availablePets: Pet[] = [];
  editDates: Record<number, string> = {};
  error = '';
  notice = '';
  form: Partial<Appointment> = this.emptyForm();

  ngOnInit(): void {
    this.api.getTutors().subscribe({
      next: (tutors) => { this.tutors = tutors; },
      error: (error: HttpErrorResponse) => { this.error = error.error?.error || 'Não foi possível carregar tutores.'; },
    });
    this.api.getPets().subscribe({
      next: (pets) => { this.pets = pets; this.selectTutor(this.form.tutor_id); },
      error: (error: HttpErrorResponse) => { this.error = error.error?.error || 'Não foi possível carregar pets.'; },
    });
    this.loadAppointments();
  }

  selectTutor(tutorId: number | undefined): void {
    this.availablePets = this.pets.filter((pet) => pet.tutor_id === Number(tutorId));
    if (!this.availablePets.some((pet) => pet.id === this.form.pet_id)) this.form.pet_id = undefined;
  }

  save(): void {
    this.error = '';
    this.notice = '';
    this.api.createAppointment(this.form).subscribe({
      next: () => {
        this.notice = 'Agendamento criado com sucesso.';
        this.form = this.emptyForm();
        this.availablePets = [];
        this.loadAppointments();
      },
      error: (error: HttpErrorResponse) => { this.error = error.error?.error || 'Não foi possível criar o agendamento.'; },
    });
  }

  updateDate(item: Appointment): void {
    const date = this.editDates[item.id];
    if (!date) return;
    this.error = '';
    this.notice = '';
    this.api.updateAppointment(item.id, date).subscribe({
      next: () => {
        this.notice = 'Data do agendamento atualizada.';
        this.loadAppointments();
      },
      error: (error: HttpErrorResponse) => { this.error = error.error?.error || 'Não foi possível atualizar a data.'; },
    });
  }

  private loadAppointments(): void {
    this.api.getAppointments().subscribe({
      next: (appointments) => {
        this.appointments = appointments;
        this.editDates = Object.fromEntries(appointments.map((item) => [item.id, item.data_agendamento]));
      },
      error: (error: HttpErrorResponse) => { this.error = error.error?.error || 'Não foi possível carregar agendamentos.'; },
    });
  }

  private emptyForm(): Partial<Appointment> {
    return { tutor_id: undefined, pet_id: undefined, data_agendamento: '', motivo: '' };
  }
}
