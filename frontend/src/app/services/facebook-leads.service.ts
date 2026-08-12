import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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

  private apiUrl = 'http://localhost:5000/api/leads'; // Ensure this matches your backend

  constructor(private http: HttpClient) {}

  // ==========================================
  // Injects the JWT token into your requests
  // ==========================================
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('app_auth_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

 getLeads(pageId: string): Observable<any> {
  return this.http.get<any>(
    `${this.apiUrl}?pageId=${pageId}`,
    {
      headers: this.getAuthHeaders()
    }
  );
}

  getLead(id: string): Observable<LeadResponse> {
    return this.http.get<LeadResponse>(`${this.apiUrl}/${id}`, { headers: this.getAuthHeaders() });
  }

  createLead(lead: Partial<Lead>): Observable<LeadResponse> {
    return this.http.post<LeadResponse>(this.apiUrl, lead, { headers: this.getAuthHeaders() });
  }

  updateLeadStatus(id: string, status: LeadStatus): Observable<LeadResponse> {
    return this.http.patch<LeadResponse>(
      `${this.apiUrl}/${id}/status`,
      { status },
      { headers: this.getAuthHeaders() }
    );
  }
}