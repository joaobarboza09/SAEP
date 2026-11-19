export interface User {
  id: number;
  nome: string;
  email: string;
}

export interface Tutor {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
}

export interface Pet {
  id: number;
  tutor_id: number;
  tutor_nome?: string;
  nome: string;
  especie: string;
  raca: string;
  data_nascimento: string | null;
  observacoes: string | null;
}

export interface Appointment {
  id: number;
  tutor_id: number;
  pet_id: number;
  tutor_nome: string;
  pet_nome: string;
  data_agendamento: string;
  motivo: string;
  observacoes: string | null;
}

export interface AuthResponse {
  token: string;
  expiresAt: number;
  user: User;
}
