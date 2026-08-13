import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  MatDialogRef,
  MatDialogModule
} from '@angular/material/dialog';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-deal-amount-dialog',
  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],

  template: `
    <h2 mat-dialog-title>
      🎉 Deal Closed
    </h2>

    <mat-dialog-content>

      <p>
        Please enter the final sale amount.
      </p>

      <mat-form-field
        appearance="outline"
        style="width: 100%;">

        <mat-label>
          Sale Amount
        </mat-label>

        <input
          matInput
          type="number"
          [(ngModel)]="amount"
          min="1"
          placeholder="Enter amount">

        <span matTextPrefix>₹&nbsp;</span>

      </mat-form-field>

    </mat-dialog-content>

    <mat-dialog-actions align="end">

      <button
        mat-button
        (click)="cancel()">

        Cancel

      </button>

      <button
        mat-raised-button
        color="primary"
        [disabled]="!amount || amount <= 0"
        (click)="confirm()">

        Confirm

      </button>

    </mat-dialog-actions>
  `
})
export class DealAmountDialogComponent {

  amount: number | null = null;

  constructor(
    private dialogRef:
      MatDialogRef<DealAmountDialogComponent>
  ) {}

  confirm(): void {

    if (
      this.amount === null ||
      this.amount <= 0
    ) {
      return;
    }

    this.dialogRef.close(this.amount);
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}