import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs'; 
import { environment } from '../../environments/environment'

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

export interface PixelOption {
  id: string;
  name: string;
  adAccountId: string;
  adAccountName: string;
}

@Injectable({
  providedIn: 'root'
})
export class MetaAuthService {

  private readonly baseUrl = `${environment.apiUrl}/meta`;

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

  getPages(): Observable<any> {
    return this.http.get(`${this.baseUrl}/pages`, { headers: this.getAuthHeaders() });
  }

  getPageForms(pageId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/pages/${pageId}/forms`, { headers: this.getAuthHeaders() });
  }

  syncLeads(pageId: string, formId: string): Observable<any> {
    const payload: any = { 
      pageId: pageId, 
      formId: formId 
    };

    return this.http.post(`${this.baseUrl}/sync`, payload, {
      headers: this.getAuthHeaders()
    });
  }

  getUserPixels(): Observable<{ success: boolean; data: PixelOption[] }> {
    return this.http.get(`${this.baseUrl}/pages/pixels`, { headers: this.getAuthHeaders() }) as Observable<{ success: boolean; data: PixelOption[] }>;
  }

  setPagePixel(pageId: string, pixelId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/pages/${pageId}/pixel`, { pixelId }, { headers: this.getAuthHeaders() });
  }
}
