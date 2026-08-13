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
        }
      })
    );
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/register`, userData).pipe(
      tap((res: any) => {
        if (res.success && res.token) {
          localStorage.setItem('app_auth_token', res.token);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem('app_auth_token');
  }

  getToken(): string | null {
    return localStorage.getItem('app_auth_token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}