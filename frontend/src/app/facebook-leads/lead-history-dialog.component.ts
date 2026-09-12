import { Component, Inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-lead-history-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, DatePipe],
  template: `
    <h2 mat-dialog-title>History: {{ data.name }}</h2>
    <mat-dialog-content>
      <!-- Show this if there is no history -->
      <div
        *ngIf="data.history.length === 0"
        style="padding: 16px 0; color: #6b7280;"
      >
        No action history recorded yet.
      </div>

      <!-- Show the timeline if history exists -->
      <ul
        style="list-style: none; padding: 0; margin: 0;"
        *ngIf="data.history.length > 0"
      >
        <li
          *ngFor="let item of data.history"
          style="margin-bottom: 16px; border-left: 3px solid #1976d2; padding-left: 12px;"
        >
          <div style="font-weight: 500; color: #374151;">{{ item.action }}</div>
          <div style="font-size: 13px; color: #6b7280; margin-top: 4px;">
            {{ item.timestamp | date: 'MMM d, y, h:mm a' }}
          </div>
        </li>
      </ul>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
})
export class LeadHistoryDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { name: string; history: any[] },
  ) {}
}
