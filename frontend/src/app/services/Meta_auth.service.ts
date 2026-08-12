import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

// Set this to your actual API base URL (e.g. 'http://localhost:5000/api'
// or 'https://api.yourapp.com/api')
const API_BASE_URL = 'http://localhost:5000/api';

export interface MetaStartAuthResponse {
  success: boolean;
  alreadyConnected: boolean;
  authUrl?: string;
  message?: string;
  metaUserId?: string;
}

export interface MetaStatusResponse {
  success: boolean;
  connected: boolean;
  metaUserId?: string | null;
  expiresAt?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class MetaAuthService {

  private readonly baseUrl = `${API_BASE_URL}/meta`;

  constructor(private http: HttpClient) {}

  // ==========================================
  // Helper function to attach the token
  // ==========================================
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('app_auth_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}` // Injects the token to pass your authMiddleware
    });
  }

  // Checks whether the current user already has a valid Meta connection.
  // Safe to call anytime - never triggers the OAuth flow itself.
  getStatus(): Observable<MetaStatusResponse> {
    const token = localStorage.getItem('app_auth_token');
    
    // If there is no token, don't even bother asking the backend
    if (!token) {
      import('rxjs').then(({ of }) => {}); // Ensure 'of' is imported at the top if using this
      // Return a fake "not connected" response immediately
      // Alternatively, just import { of } from 'rxjs'; at the top of your file
      // return of({ success: true, connected: false });
    }

    return this.http.get<MetaStatusResponse>(`${this.baseUrl}/status`, {
      headers: this.getAuthHeaders()
    });
  }

  // Asks the backend to either confirm an existing connection or hand back
  // a Facebook authUrl to redirect the user to. Pass force=true to make the
  // user re-consent even if a valid connection already exists.
  startAuth(force = false): Observable<MetaStartAuthResponse> {
    const url = force ? `${this.baseUrl}?force=true` : this.baseUrl;
    // No headers needed here, as the user isn't logged in until after this flow completes
    return this.http.get<MetaStartAuthResponse>(url);
  }

  // Convenience helper: calls startAuth() and, if not already connected,
  // navigates the browser to Facebook. Returns true if a redirect happened.
  connect(force = false): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.startAuth(force).subscribe({
        next: (response) => {
          if (response.alreadyConnected) {
            resolve(false);
            return;
          }
          if (response.authUrl) {
            window.location.href = response.authUrl;
            resolve(true);
          } else {
            reject(new Error('No authUrl returned from server'));
          }
        },
        error: (err) => reject(err)
      });
    });
  }
}