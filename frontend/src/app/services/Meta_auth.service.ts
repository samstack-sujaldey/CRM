import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs'; // <-- Added 'of' here

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

  private readonly baseUrl = `${API_BASE_URL}/meta`; // Ensure this matches your Node routes!

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('app_auth_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}` 
    });
  }

  getStatus(): Observable<MetaStatusResponse> {
    const token = localStorage.getItem('app_auth_token');
    
    if (!token) {
      // Returns a safe fallback instantly without hitting the backend
      return of({ success: true, connected: false });
    }

    return this.http.get<MetaStatusResponse>(`${this.baseUrl}/status`, {
      headers: this.getAuthHeaders()
    });
  }

  startAuth(force = false): Observable<MetaStartAuthResponse> {
    const url = force ? `${this.baseUrl}?force=true` : this.baseUrl;
    return this.http.get<MetaStartAuthResponse>(url);
  }

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

  // ==========================================
  // NEW METHODS FOR SYNCING
  // ==========================================
  
  getPages(): Observable<any> {
    return this.http.get(`${this.baseUrl}/pages`, { headers: this.getAuthHeaders() });
  }

  getPageForms(pageId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/pages/${pageId}/forms`, { headers: this.getAuthHeaders() });
  }

  syncLeads(pageId: string, formId: string): Observable<any> {
    const body = { pageId, formId };
    return this.http.post(`${this.baseUrl}/sync`, body, { headers: this.getAuthHeaders() });
  }
}