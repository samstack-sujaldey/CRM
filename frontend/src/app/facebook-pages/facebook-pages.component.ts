import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MetaAuthService } from '../services/Meta_auth.service';

@Component({
  selector: 'app-facebook-pages',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    MatTooltipModule
  ],
  templateUrl: './facebook-pages.component.html',
  styleUrls: ['./facebook-pages.component.css']
})
export class FacebookPagesComponent implements OnInit {
  pages: any[] = [];
  isLoading = false;
  metaConnected = false;

  displayedColumns: string[] = ['pageId', 'name', 'actions'];

  constructor(
    private metaAuthService: MetaAuthService,
    private router: Router
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
        this.isLoading = false;
      },
      error: (err) => {
        console.error("Error fetching pages", err);
        this.isLoading = false;
      }
    });
  }

  viewLeads(pageId: string): void {
   this.router.navigate([`/facebook-pages/${pageId}/leads`]);
  }
}