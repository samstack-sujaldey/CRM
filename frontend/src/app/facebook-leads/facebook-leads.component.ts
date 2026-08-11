import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
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

  constructor(
    private leadService: FacebookLeadsService
  ) {}

  ngOnInit(): void {
    this.loadLeads();
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