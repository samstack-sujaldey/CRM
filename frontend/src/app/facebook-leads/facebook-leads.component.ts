import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { FacebookLeadsService, Lead, LeadStatus } from '../services/facebook-leads.service';
import { MetaAuthService } from '../services/Meta_auth.service';

@Component({
  selector: 'app-facebook-leads',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
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
  styleUrls: ['./facebook-leads.component.css']
})
export class FacebookLeadsComponent implements OnInit {

  pageId: string = '';

  // Forms State
  forms: any[] = [];
  isLoadingForms = false;
  syncMessage = '';
  
  // Leads State
  leads: Lead[] = [];
  searchText = '';
  selectedStatus: LeadStatus | 'ALL' = 'ALL';
  displayedColumns: string[] = ['lead', 'phone', 'campaign', 'date', 'status'];
  loading = false;

  constructor(
    private leadService: FacebookLeadsService,
    private metaAuthService: MetaAuthService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Read the pageId from the URL (e.g. /facebook-pages/12345/leads)
    this.pageId = this.route.snapshot.paramMap.get('pageId') || '';
    
    if (this.pageId) {
      this.loadForms();
      this.loadLeads();
    }
  }

  // =========================
  // FORMS LOGIC
  // =========================

  loadForms(): void {
    this.isLoadingForms = true;
    this.metaAuthService.getPageForms(this.pageId).subscribe({
      next: (res) => {
        const responseData = res.data;
        if (Array.isArray(responseData)) {
          this.forms = responseData;
        } else if (responseData && Array.isArray(responseData.data)) {
          this.forms = responseData.data;
        } else {
          this.forms = [];
        }
        this.isLoadingForms = false;
      },
      error: (err) => {
        console.error("Error loading forms:", err);
        this.isLoadingForms = false;
      }
    });
  }

 syncFormLeads(formId: string): void {
    this.isLoadingForms = true;
    this.syncMessage = "Syncing leads from Meta...";

    console.log("SENDING TO BACKEND -> Page ID:", this.pageId, " | Form ID:", formId);

    // 🛑 VERIFY THIS LINE: Are both pageId and formId being passed?
    this.metaAuthService.syncLeads(this.pageId, formId).subscribe({
      next: (res) => {
        this.syncMessage = `Success! Synced ${res.totalFormMeta} leads.`;
        this.isLoadingForms = false;
        this.loadLeads(); 
      },
      error: (err) => {
        console.error("Error syncing leads:", err);
        this.syncMessage = `Error: ${err.error?.message || "Failed to sync leads."}`; 
        this.isLoadingForms = false;
      }
    });
  }

  // =========================
  // LEADS LOGIC
  // =========================

  loadLeads(): void {
    this.loading = true;
    
    // ✅ FIX: Pass the pageId to the service
    this.leadService.getLeads(this.pageId).subscribe({
      next: (response) => {
        if (response.success) {
          this.leads = response.data || [];
        } else {
          this.leads = [];
        }
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading leads:', error);
        this.leads = [];
        this.loading = false;
      }
    });
  }

  get filteredLeads(): Lead[] {
    const search = this.searchText.toLowerCase().trim();
    return this.leads.filter((lead: Lead) => {
      const matchesSearch =
        !search ||
        (lead.name || '').toLowerCase().includes(search) ||
        (lead.email || '').toLowerCase().includes(search) ||
        (lead.phone || '').toLowerCase().includes(search) ||
        (lead.property || '').toLowerCase().includes(search) ||
        (lead.source || '').toLowerCase().includes(search);

      const matchesStatus = this.selectedStatus === 'ALL' || lead.status === this.selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }

  // =========================
  // STATISTICS
  // =========================
  get totalLeads(): number { return this.leads.length; }
  get newLeads(): number { return this.leads.filter(lead => lead.status === 'NEW').length; }
  get qualifiedLeads(): number { return this.leads.filter(lead => lead.status === 'INTERESTED').length; }
  get bookings(): number { return this.leads.filter(lead => lead.status === 'BOOKED').length; }

  // =========================
  // STATUS SELECT & UPDATE
  // =========================
  selectStatus(lead: Lead, newStatus: LeadStatus): void {
    lead.pendingStatus = newStatus;
  }

  confirmStatusChange(lead: Lead): void {
    if (!lead.pendingStatus || lead.pendingStatus === lead.status) return;

    const newStatus = lead.pendingStatus;
    this.leadService.updateLeadStatus(lead._id, newStatus).subscribe({
      next: (response) => {
        if (response.success) {
          lead.status = newStatus;
          delete lead.pendingStatus;
        }
      },
      error: (error: any) => {
        console.error('Error updating status:', error);
        delete lead.pendingStatus;
      }
    });
  }

  cancelStatusChange(lead: Lead): void {
    delete lead.pendingStatus;
  }
}