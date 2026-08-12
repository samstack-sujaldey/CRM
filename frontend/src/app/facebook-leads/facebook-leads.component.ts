import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  FacebookLeadsService,
  Lead,
  LeadStatus
} from '../services/facebook-leads.service';
import { MetaAuthService } from '../services/Meta_auth.service';

@Component({
  selector: 'app-facebook-leads',
  standalone: true,

  imports: [
    CommonModule,
    FormsModule,

    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule
  ],

  templateUrl: './facebook-leads.component.html',
  styleUrl: './facebook-leads.component.css'
})
export class FacebookLeadsComponent implements OnInit {

  // All leads received from backend
  leads: Lead[] = [];

  // Search
  searchText = '';

  // Status filter
  selectedStatus: LeadStatus | 'ALL' = 'ALL';

  // Table columns
  displayedColumns: string[] = [
    'lead',
    'phone',
    'campaign',
    'date',
    'status'
  ];

  // Loading
  loading = false;

  // Meta (Facebook) connection state
  metaConnected = false;
  metaConnecting = false;
  metaStatusLoading = true;

  constructor(
    private leadService: FacebookLeadsService,
    private metaAuthService: MetaAuthService,
    private route: ActivatedRoute, // <-- ADD THIS
    private router: Router
  ) {}

  ngOnInit(): void {
    // Check the URL for a token returning from the Facebook OAuth callback
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      
      if (token) {
        // 1. Save the token to log the user in locally
        localStorage.setItem('app_auth_token', token);
        
        // 2. Remove the token from the browser's address bar for security
        this.router.navigate([], { replaceUrl: true });
        
        // 3. Update state
        this.metaConnected = true;
        this.metaStatusLoading = false;
        
        // 4. Now that we are authenticated, fetch the leads
        this.loadLeads();
      } else {
        // Normal page load (they are already logged in or need to log in)
        this.checkMetaStatus();
        
        // Only load leads if they actually have a token saved
        if (localStorage.getItem('app_auth_token')) {
          this.loadLeads();
        }
      }
    });
  }

  // =========================
  // META CONNECTION
  // =========================

  checkMetaStatus(): void {

    this.metaStatusLoading = true;

    this.metaAuthService.getStatus().subscribe({

      next: (response) => {
        this.metaConnected = !!response.connected;
        this.metaStatusLoading = false;
      },

      error: (error: any) => {
        console.error('Error checking Meta connection status:', error);
        this.metaConnected = false;
        this.metaStatusLoading = false;
      }

    });
  }

  connectFacebook(): void {

    if (this.metaConnecting) {
      return;
    }

    this.metaConnecting = true;

    this.metaAuthService.connect()
      .then((redirected) => {
        // If not redirected, the user was already connected -
        // just refresh the status to reflect it in the UI.
        if (!redirected) {
          this.metaConnected = true;
        }
      })
      .catch((error) => {
        console.error('Error starting Meta OAuth:', error);
      })
      .finally(() => {
        this.metaConnecting = false;
      });
  }

  // =========================
  // GET LEADS
  // =========================

  loadLeads(): void {

    this.loading = true;

    this.leadService.getLeads().subscribe({

      next: (response) => {

        if (response.success) {
          this.leads = response.data || [];
        } else {
          this.leads = [];
        }

        this.loading = false;
      },

      error: (error: any) => {

        console.error(
          'Error loading leads:',
          error
        );

        this.leads = [];
        this.loading = false;
      }

    });
  }

  // =========================
  // FILTERED LEADS
  // =========================

  get filteredLeads(): Lead[] {

    const search = this.searchText
      .toLowerCase()
      .trim();

    return this.leads.filter((lead: Lead) => {

      const matchesSearch =
        !search ||
        (lead.name || '')
          .toLowerCase()
          .includes(search) ||

        (lead.email || '')
          .toLowerCase()
          .includes(search) ||

        (lead.phone || '')
          .toLowerCase()
          .includes(search) ||

        (lead.property || '')
          .toLowerCase()
          .includes(search) ||

        (lead.source || '')
          .toLowerCase()
          .includes(search);

      const matchesStatus =
        this.selectedStatus === 'ALL' ||
        lead.status === this.selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }

  // =========================
  // STATISTICS
  // =========================

  get totalLeads(): number {
    return this.leads.length;
  }

  get newLeads(): number {
    return this.leads.filter(
      lead => lead.status === 'NEW'
    ).length;
  }

  get qualifiedLeads(): number {
    return this.leads.filter(
      lead => lead.status === 'INTERESTED'
    ).length;
  }

  get bookings(): number {
    return this.leads.filter(
      lead => lead.status === 'BOOKED'
    ).length;
  }

  // =========================
  // STATUS SELECT
  // =========================

  selectStatus(
    lead: Lead,
    newStatus: LeadStatus
  ): void {

    // Only change temporary value
    lead.pendingStatus = newStatus;
  }

  // =========================
  // CONFIRM STATUS
  // =========================

  confirmStatusChange(lead: Lead): void {

    if (
      !lead.pendingStatus ||
      lead.pendingStatus === lead.status
    ) {
      return;
    }

    const newStatus = lead.pendingStatus;

    this.leadService
      .updateLeadStatus(
        lead._id,
        newStatus
      )
      .subscribe({

        next: (response) => {

          if (response.success) {

            // Update actual status
            lead.status = newStatus;

            // Remove temporary status
            delete lead.pendingStatus;

          }

        },

        error: (error: any) => {

          console.error(
            'Error updating status:',
            error
          );

          // If backend fails,
          // return dropdown to original status
          delete lead.pendingStatus;
        }

      });
  }

  // =========================
  // CANCEL STATUS
  // =========================

  cancelStatusChange(lead: Lead): void {

    // Remove temporary status.
    // Dropdown automatically returns
    // to lead.status.
    delete lead.pendingStatus;
  }

  // =========================
  // SYNC
  // =========================

  syncLeads(): void {

    this.loadLeads();
  }
}