import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) {}

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/login`, credentials).pipe(
      tap((res: any) => {
        if (res.success && res.token) {
          localStorage.setItem('app_auth_token', res.token);
          
          // 🛑 ADDED: Save the refresh token when they log in!
          if (res.refreshToken) {
            localStorage.setItem('app_refresh_token', res.refreshToken); 
          }
        }
      })
    );
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/register`, userData).pipe(
      tap((res: any) => {
        if (res.success && res.token) {
          localStorage.setItem('app_auth_token', res.token);
          
          // 🛑 ADDED: Save the refresh token when they register!
          if (res.refreshToken) {
            localStorage.setItem('app_refresh_token', res.refreshToken); 
          }
        }
      })
    );
  }

  // 🚀 NEW: This is the method that actually asks the backend for a NEW access token!
  refreshToken(): Observable<any> {
    const refreshToken = localStorage.getItem('app_refresh_token');
    
    // It sends the long-lived refresh token to your Node.js /refresh route
    return this.http.post(`${this.baseUrl}/refresh`, { token: refreshToken }).pipe(
      tap((res: any) => {
        if (res.success && res.accessToken) {
          // It then overwrites the old, expired access token with the brand new one!
          localStorage.setItem('app_auth_token', res.accessToken);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem('app_auth_token');
    // 🛑 ADDED: Make sure to delete the refresh token on logout too
    localStorage.removeItem('app_refresh_token');
  }

  getToken(): string | null {
    return localStorage.getItem('app_auth_token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}