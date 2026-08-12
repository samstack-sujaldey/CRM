import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  
  // 1. Check if the token exists in local storage
  const token = localStorage.getItem('app_auth_token');

  if (token) {
    // 2. Token exists! Let the user enter the route.
    return true;
  } else {
    // 3. No token! Kick them back to the login page.
    router.navigate(['/login']);
    return false;
  }
};