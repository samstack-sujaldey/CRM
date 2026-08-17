import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MetaAuthService, PixelOption } from '../services/Meta_auth.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-facebook-pages',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    MatTooltipModule,
    MatSnackBarModule,
  ],
  templateUrl: './facebook-pages.component.html',
  styleUrls: ['./facebook-pages.component.css']
})
export class FacebookPagesComponent implements OnInit {
  pages: any[] = [];
  pixels: PixelOption[] = [];
  isLoading = false;
  isPixelLoading = false;
  metaConnected = false;

  displayedColumns: string[] = ['pageId', 'name', 'pixel', 'actions'];

  constructor(
    private metaAuthService: MetaAuthService,
    private router: Router,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.checkMetaStatus();
  }

  checkMetaStatus(): void {
    this.metaAuthService.getStatus().subscribe({
      next: (response) => {
        this.metaConnected = !!response.connected;
        if (this.metaConnected) {
          this.loadPages();
        }
      },
      error: (err) => console.error('Error checking Meta status:', err)
    });
  }

  connectFacebook(): void {
    this.metaAuthService.connect()
      .then((redirected) => {
        if (!redirected) {
          this.metaConnected = true;
          this.loadPages();
        }
      })
      .catch((error) => console.error('Error connecting Meta:', error));
  }

  loadPages(): void {
    this.isLoading = true;
    this.metaAuthService.getPages().subscribe({
      next: (res) => {
        const responseData = res.data;
        if (Array.isArray(responseData)) {
          this.pages = responseData;
        } else if (responseData && Array.isArray(responseData.data)) {
          this.pages = responseData.data;
        } else {
          this.pages = [];
        }
        if (res.availablePixels && res.availablePixels.length > 0) {
          this.pixels = res.availablePixels;
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error("Error fetching pages", err);
        this.isLoading = false;
      }
    });
  }

  onPixelChange(page: any, event: any): void {
    const selectedPixelId = event.target.value;
    this.metaAuthService.setPagePixel(page.pageId, selectedPixelId).subscribe({
      next: () => {
        this.snackBar.open('Pixel updated successfully', '', {
          duration: 2000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
        });
        this.loadPages();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Failed to update pixel', '', {
          duration: 2000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
        });
      }
    });
  }

  viewLeads(pageId: string): void {
    this.router.navigate([`/facebook-pages/${pageId}/leads`]);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
