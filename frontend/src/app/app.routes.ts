import { Routes } from '@angular/router';
import { FacebookLeadsComponent } from './facebook-leads/facebook-leads.component'; // Adjust path as needed

export const routes: Routes = [
  // 1. Map the facebook-leads URL to your component
  { path: 'facebook-leads', component: FacebookLeadsComponent },
  
  // 2. Automatically redirect the base URL (localhost:4200) to the dashboard
  { path: '', redirectTo: '/facebook-leads', pathMatch: 'full' },
  
  // 3. Catch-all for any typos in the URL
  { path: '**', redirectTo: '/facebook-leads' }
];