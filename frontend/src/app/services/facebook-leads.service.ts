import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Lead {
  _id: string;
  metaUserId?: string;
  pageId?: string;
  name: string;
  email: string;
  phone: string;
  property: string;
  source: string;
  status: string;
  metaLeadId?: string;
  createdAt: string;
  pendingStatus?: LeadStatus;
}

export type LeadStatus = 'NEW' | 'CONTACTED' | 'INTERESTED' | 'SITE_VISIT_SCHEDULED' | 'SITE_VISITED' | 'BOOKED' | 'CLOSED';

const API_BASE_URL = 'http://localhost:5000/api';

@Injectable({
  providedIn: 'root'
})
export class FacebookLeadsService {
  private readonly baseUrl = `${API_BASE_URL}`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('app_auth_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // ✅ FIX: Requires pageId and sends it to the backend
  getLeads(pageId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/leads?pageId=${pageId}`, {
      headers: this.getAuthHeaders()
    });
  }

  updateLeadStatus(leadId: string, status: LeadStatus): Observable<any> {
    return this.http.patch(`${this.baseUrl}/leads/${leadId}/status`, { status }, {
      headers: this.getAuthHeaders()
    });
  }
}