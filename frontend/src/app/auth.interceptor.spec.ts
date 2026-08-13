import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthInterceptor } from './auth.interceptor';
import { AuthService } from './services/auth.service';

describe('AuthInterceptor', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      // We import these testing modules so Angular doesn't crash trying to find real HTTP or Router providers
      imports: [
        HttpClientTestingModule, 
        RouterTestingModule
      ],
      providers: [
        AuthInterceptor,
        AuthService
      ]
    });
  });

  it('should be created', () => {
    const interceptor: AuthInterceptor = TestBed.inject(AuthInterceptor);
    expect(interceptor).toBeTruthy();
  });
});