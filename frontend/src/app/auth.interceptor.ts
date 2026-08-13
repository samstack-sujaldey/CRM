import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, switchMap, catchError, filter, take } from 'rxjs';
import { AuthService } from './services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor(private authService: AuthService, private router: Router) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    
    // 1. Attach the current access token to every outgoing request
    request = this.addToken(request, this.authService.getToken());

    // 2. Pass it to the next handler and watch for errors
    return next.handle(request).pipe(
      catchError(error => {
        // 3. If the backend says the token is expired (401)
        if (error instanceof HttpErrorResponse && error.status === 401) {
          return this.handle401Error(request, next);
        }
        
        // If it's any other error (like 404 or 500), just let it fail normally
        return throwError(() => error);
      })
    );
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler) {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      // Call the refresh token method we just added to AuthService
      return this.authService.refreshToken().pipe(
        switchMap((response: any) => {
          this.isRefreshing = false;
          
          // Send the new token to anyone waiting in the queue
          this.refreshTokenSubject.next(response.accessToken);
          
          // Retry the original request that failed, but with the NEW token
          return next.handle(this.addToken(request, response.accessToken));
        }),
        catchError((err) => {
          // If the Refresh Token itself is ALSO expired, force a hard logout
          this.isRefreshing = false;
          this.authService.logout();
          this.router.navigate(['/login']);
          return throwError(() => err);
        })
      );
    } else {
      // If a refresh is already in progress, queue up this request and wait for the new token
      return this.refreshTokenSubject.pipe(
        filter(token => token != null),
        take(1),
        switchMap(jwt => {
          return next.handle(this.addToken(request, jwt));
        })
      );
    }
  }

  // Helper method to clone the request and inject the Bearer token
  private addToken(request: HttpRequest<any>, token: string | null) {
    if (token) {
      return request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
    return request;
  }
}