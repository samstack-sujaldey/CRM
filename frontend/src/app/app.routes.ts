import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { FacebookPagesComponent } from './facebook-pages/facebook-pages.component';
import { FacebookLeadsComponent } from './facebook-leads/facebook-leads.component';
import { authGuard } from './auth.guard'; // <-- Import your new guard

export const routes: Routes = [
  // Public Route
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },

  // Protected Routes (Notice the canActivate array!)
  { 
    path: 'facebook-pages', 
    component: FacebookPagesComponent,
    canActivate: [authGuard] 
  },
  { 
    path: 'facebook-pages/:pageId/leads', 
    component: FacebookLeadsComponent,
    canActivate: [authGuard] 
  },
  
  // Catch-all redirects to login
  { path: '**', redirectTo: 'login' }
];