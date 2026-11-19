import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.token && auth.expiresAt > Date.now()
    ? true
    : inject(Router).createUrlTree(['/login']);
};
