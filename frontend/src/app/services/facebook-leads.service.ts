import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'INTERESTED'
  | 'SITE_VISIT_SCHEDULED'
  | 'SITE_VISITED'
  | 'BOOKED'
  | 'CLOSED';

export interface Lead {
  _id: string;
  name: string;
  email: string;
  phone: string;
  property?: string;
  source?: string;
  status: LeadStatus;
  metaLeadId?: string;
  notes?: string;
  siteVisitDate?: string;
  createdAt?: string;
  updatedAt?: string;

  // Frontend-only field
  pendingStatus?: LeadStatus;
}

export interface LeadsResponse {
  success: boolean;
  data: Lead[];
}

export interface LeadResponse {
  success: boolean;
  message?: string;
  data: Lead;
}

@Injectable({
  providedIn: 'root'
})
export class FacebookLeadsService {

  private apiUrl = 'http://localhost:5000/api/leads';

  constructor(private http: HttpClient) {}

  getLeads(): Observable<LeadsResponse> {
    return this.http.get<LeadsResponse>(this.apiUrl);
  }

  getLead(id: string): Observable<LeadResponse> {
    return this.http.get<LeadResponse>(
      `${this.apiUrl}/${id}`
    );
  }

  createLead(lead: Partial<Lead>): Observable<LeadResponse> {
    return this.http.post<LeadResponse>(
      this.apiUrl,
      lead
    );
  }

  updateLeadStatus(
    id: string,
    status: LeadStatus
  ): Observable<LeadResponse> {

    return this.http.patch<LeadResponse>(
      `${this.apiUrl}/${id}/status`,
      { status }
    );
  }
}