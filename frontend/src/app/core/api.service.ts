import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Appointment, Pet, Tutor } from './models';

const API_URL = 'http://localhost:3000/api';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  getTutors(search = ''): Observable<Tutor[]> {
    const params = search ? new HttpParams().set('busca', search) : undefined;
    return this.http.get<Tutor[]>(`${API_URL}/tutores`, { params });
  }

  saveTutor(tutor: Partial<Tutor>): Observable<Tutor> {
    return tutor.id
      ? this.http.put<Tutor>(`${API_URL}/tutores/${tutor.id}`, tutor)
      : this.http.post<Tutor>(`${API_URL}/tutores`, tutor);
  }

  getPets(): Observable<Pet[]> {
    return this.http.get<Pet[]>(`${API_URL}/pets`);
  }

  createPet(pet: Partial<Pet>): Observable<Pet> {
    return this.http.post<Pet>(`${API_URL}/pets`, pet);
  }

  getAppointments(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${API_URL}/agendamentos`);
  }

  createAppointment(appointment: Partial<Appointment>): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${API_URL}/agendamentos`, appointment);
  }

  updateAppointment(id: number, data_agendamento: string): Observable<Appointment> {
    return this.http.put<Appointment>(`${API_URL}/agendamentos/${id}`, { data_agendamento });
  }
}
