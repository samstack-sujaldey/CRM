import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MetaAuthService } from '../services/Meta_auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  errorMessage: string = '';
  isConnecting: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private metaAuthService: MetaAuthService
  ) {}

  ngOnInit(): void {
    // Check the URL for parameters sent back from your backend's OAuth callback
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      const error = params['error'];

      if (token) {
        // 1. Success! Save the token to local storage
        localStorage.setItem('app_auth_token', token);
        // 2. Redirect the user to the pages screen
        this.router.navigate(['/facebook-pages']);
      } else if (error) {
        // 3. Authentication failed
        this.errorMessage = 'Authentication failed. Please ensure you granted all necessary permissions to Meta.';
      } else {
        // Optional: If they already have a token in storage, auto-redirect them
        const existingToken = localStorage.getItem('app_auth_token');
        if (existingToken) {
          this.router.navigate(['/facebook-pages']);
        }
      }
    });
  }

  connectFacebook(): void {
    this.isConnecting = true;
    this.errorMessage = '';
    
    // Calls your backend GET /api/meta to get the Facebook OAuth URL
    this.metaAuthService.connect().then(redirected => {
      if (!redirected) {
        this.isConnecting = false;
        this.errorMessage = 'Failed to initiate Facebook connection.';
      }
    }).catch(err => {
      console.error(err);
      this.isConnecting = false;
      this.errorMessage = 'Server error. Could not connect to Meta.';
    });
  }
}