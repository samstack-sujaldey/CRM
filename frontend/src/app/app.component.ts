import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FacebookLeadsComponent } from './facebook-leads/facebook-leads.component';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet,FacebookLeadsComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'facebook-lead';
}
