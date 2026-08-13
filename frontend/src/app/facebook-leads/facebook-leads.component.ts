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
  searchTerm = '';

  // Status filter
  selectedStatus = 'ALL';

  filteredForms: any[] = [];
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

  // =========================
  // PAGE & FORM SYNC STATE
  // =========================
  pages: any[] = [];
  forms: any[] = [];
  selectedPageId: string = '';
  selectedFormId: string = '';
  pageLeadsData: any = null;
  loadingPageLeads = false;
  syncMessage: string = '';

  constructor(
    private leadService: FacebookLeadsService,
    private metaAuthService: MetaAuthService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

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

        // 4. Now that we are authenticated, fetch the leads and pages
        this.loadPages();
      } else {
        // Normal page load (they are already logged in or need to log in)
        this.checkMetaStatus();

        // Only load leads if they actually have a token saved
        if (localStorage.getItem('app_auth_token')) {
          this.loadPages();
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

        if (this.metaConnected) {
          this.loadPages();
        }
      },
      error: (error: any) => {
        console.error('Error checking Meta connection status:', error);
        this.metaConnected = false;
        this.metaStatusLoading = false;
      }
    });
  }

  showPageLeads(page: any): void {

  this.selectedPageId = page.pageId;

  this.loadingPageLeads = true;
  this.pageLeadsData = null;

  // Reset filters when changing page
  this.searchTerm = '';
  this.selectedStatus = 'ALL';

  this.leadService.getLeads(page.pageId).subscribe({

    next: (response) => {

      if (response.success) {

        this.pageLeadsData = response.data;

        this.applyFilters();
      }

      this.loadingPageLeads = false;
    },

    error: (error) => {

      console.error(
        'Error loading page leads:',
        error
      );

      this.pageLeadsData = null;
      this.filteredForms = [];

      this.loadingPageLeads = false;
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
          this.loadPages();
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
  // PAGES & FORMS SYNC LOGIC
  // =========================

  loadPages(): void {
    this.metaAuthService.getPages().subscribe({
      next: (res) => {
        this.pages = res.data || [];
      },
      error: (err) => {
        console.error("Error loading Facebook pages:", err);
      }
    });
  }

  onPageSelect(event: any): void {
    this.selectedPageId = event.target?.value || event;
    this.forms = [];
    this.selectedFormId = '';
    this.syncMessage = '';

    if (this.selectedPageId) {
      this.metaAuthService.getPageForms(this.selectedPageId).subscribe({
        next: (res) => {
          // Meta graphs typically nest form array inside data.data
          this.forms = res.data?.data || res.data || [];
        },
        error: (err) => {
          console.error("Error loading lead forms:", err);
        }
      });
    }
  }

  onFormSelect(event: any): void {
    this.selectedFormId = event.target?.value || event;
    this.syncMessage = '';
  }

  // =========================
  // GET LEADS
  // =========================

  loadLeads(): void {
    if (!this.selectedPageId) {
      this.leads = [];
      return;
    }

    this.loading = true;

    this.leadService.getLeads(this.selectedPageId).subscribe({
      next: (response) => {
        if (response.success) {
          this.pageLeadsData = response.data;
        } else {
          this.pageLeadsData = null;
        }

        this.loading = false;
      },

      error: (error: any) => {
        console.error('Error loading page leads:', error);
        this.pageLeadsData = null;
        this.loading = false;
      }
    });
  }
  // =========================
  // FILTERED LEADS
  // =========================

 applyFilters(): void {
  if (!this.pageLeadsData) {
    this.filteredForms = [];
    return;
  }

  const search = this.searchTerm.trim().toLowerCase();

  this.filteredForms = this.pageLeadsData.forms
    .map((form: any) => {

      const filteredLeads = form.leads.filter((lead: any) => {

        // Search filter
        const matchesSearch =
          !search ||
          (lead.name || '').toLowerCase().includes(search) ||
          (lead.email || '').toLowerCase().includes(search) ||
          (lead.phone || '').toLowerCase().includes(search) ||
          (lead.leadId || '').toLowerCase().includes(search);

        // Status filter
        const matchesStatus =
          this.selectedStatus === 'ALL' ||
          lead.status === this.selectedStatus;

        return matchesSearch && matchesStatus;
      });

      return {
        ...form,
        leads: filteredLeads
      };
    })
    .filter((form: any) => form.leads.length > 0);
}


  // =========================
  // STATISTICS
  // =========================

get totalLeads(): number {
  if (!this.pageLeadsData?.forms) {
    return 0;
  }

  return this.pageLeadsData.forms.reduce(
    (total: number, form: any) =>
      total + (form.leads?.length || 0),
    0
  );
}


get newLeads(): number {
  if (!this.pageLeadsData?.forms) {
    return 0;
  }

  return this.pageLeadsData.forms.reduce(
    (total: number, form: any) =>
      total +
      (form.leads || []).filter(
        (lead: any) => lead.status === 'NEW'
      ).length,
    0
  );
}


get qualifiedLeads(): number {
  if (!this.pageLeadsData?.forms) {
    return 0;
  }

  return this.pageLeadsData.forms.reduce(
    (total: number, form: any) =>
      total +
      (form.leads || []).filter(
        (lead: any) => lead.status === 'INTERESTED'
      ).length,
    0
  );
}


get bookings(): number {
  if (!this.pageLeadsData?.forms) {
    return 0;
  }

  return this.pageLeadsData.forms.reduce(
    (total: number, form: any) =>
      total +
      (form.leads || []).filter(
        (lead: any) => lead.status === 'BOOKED'
      ).length,
    0
  );
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

    if (!lead.mongoLeadId) {
      console.error('MongoDB lead ID not found');
      delete lead.pendingStatus;
      return;
    }

    const newStatus = lead.pendingStatus;

    this.leadService
      .updateLeadStatus(
        lead.mongoLeadId,
        newStatus
      )
      .subscribe({

        next: (response) => {

          if (response.success) {

            // Update UI
            lead.status = newStatus;

            // Remove temporary value
            delete lead.pendingStatus;

          }

        },

        error: (error: any) => {

          console.error(
            'Error updating lead status:',
            error
          );

          // Revert dropdown
          delete lead.pendingStatus;

        }

      });
  }

  // =========================
  // CANCEL STATUS
  // =========================

  cancelStatusChange(lead: Lead): void {
    // Remove temporary status. Dropdown automatically returns to lead.status.
    delete lead.pendingStatus;
  }

  // =========================
  // SYNC FROM META DATABASE ROUTE
  // =========================

 syncLeads(): void {
  console.log('SYNC BUTTON CLICKED');

  this.loading = true;
  this.syncMessage = 'Syncing all leads from Meta...';

  this.leadService.syncAllMetaLeads().subscribe({
    next: (res) => {
      console.log('SYNC SUCCESS:', res);

      this.loading = false;

      this.syncMessage =
        `Success! Fetched ${res.data.totalFetched} leads. ` +
        `Created ${res.data.totalCreated} new leads. ` +
        `${res.data.totalExisting} already existed.`;

      // Refresh currently selected page
      if (this.selectedPageId) {
        this.loadLeads();
      }
    },

    error: (err) => {
      console.error('Error syncing leads from Meta:', err);

      this.loading = false;

      this.syncMessage =
        err?.error?.message ||
        'Failed to sync leads from Meta.';
    }
  });
}
}