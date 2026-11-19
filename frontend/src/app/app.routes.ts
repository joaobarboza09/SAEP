import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home.component';
import { LoginComponent } from './pages/login.component';
import { TutorsComponent } from './pages/tutors.component';
import { PetsComponent } from './pages/pets.component';
import { AppointmentsComponent } from './pages/appointments.component';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', component: HomeComponent, canActivate: [authGuard] },
  { path: 'tutores', component: TutorsComponent, canActivate: [authGuard] },
  { path: 'pets', component: PetsComponent, canActivate: [authGuard] },
  { path: 'agendamentos', component: AppointmentsComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
