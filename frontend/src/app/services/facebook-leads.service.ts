import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

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
  dealValue?: number;
  currency?: string;

  [key: string]: any;
}

export type LeadStatus = 'NEW' | 'CONTACTED' | 'INTERESTED' | 'SITE_VISIT_SCHEDULED' | 'SITE_VISITED' | 'BOOKED' | 'CLOSED' | 'CLOSED_WON';

@Injectable({
  providedIn: 'root'
})
export class FacebookLeadsService {
  private readonly baseUrl = environment.apiUrl;

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
  

 updateLeadStatus(
    leadId: string, 
    status: LeadStatus, 
    dealValue?: number, 
    currency?: string
  ): Observable<any> {
    
    // 1. Build the payload dynamically
    const payload: any = { status };
    if (dealValue !== undefined) payload.dealValue = dealValue;
    if (currency !== undefined) payload.currency = currency;

    // 2. Send it using your existing URL and headers
    return this.http.patch(`${this.baseUrl}/leads/${leadId}/status`, payload, {
      headers: this.getAuthHeaders()
    });
  }
}