import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, RouterModule } from "@angular/router";
import { FormsModule } from "@angular/forms";

import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatTableModule } from "@angular/material/table";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { DealAmountDialogComponent } from "./deal-amount-dialog.component";

import {
	FacebookLeadsService,
	Lead,
	LeadStatus,
} from "../services/facebook-leads.service";

import { MetaAuthService } from "../services/Meta_auth.service";
import { AuthService } from "../services/auth.service";
import { Router } from "@angular/router";

@Component({
	selector: "app-facebook-leads",
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
		MatTooltipModule,
		MatDialogModule,
		MatSnackBarModule,
	],

	templateUrl: "./facebook-leads.component.html",
	styleUrls: ["./facebook-leads.component.css"],
})
export class FacebookLeadsComponent implements OnInit {
	// =========================
	// PAGE
	// =========================

	pageId: string = "";
	pageName: string = "Facebook Page";

	// =========================
	// FORMS STATE
	// =========================

	forms: any[] = [];
	isLoadingForms = false;
	syncMessage = "";

	// Leads State
	leads: Lead[] = [];

	searchText = "";

	selectedStatus: LeadStatus | "ALL" = "ALL";

	displayedColumns: string[] = ["lead", "phone", "date", "status"];

	loading = false;

	// =========================
	// CONSTRUCTOR
	// =========================

	constructor(
		private leadService: FacebookLeadsService,
		private metaAuthService: MetaAuthService,
		private route: ActivatedRoute,
		private dialog: MatDialog,
		private snackBar: MatSnackBar,
		private authService: AuthService,
		private router: Router
	) {}

	logout(): void {
		this.authService.logout();
		this.router.navigate(['/login']);
	}

	// =========================
	// INIT
	// =========================

	ngOnInit(): void {
		// Read the pageId from the URL (e.g. /facebook-pages/12345/leads)
		this.pageId = this.route.snapshot.paramMap.get("pageId") || "";

		if (this.pageId) {
			this.loadPageDetails();

			this.loadForms();

			this.loadLeads();
		}
	}

	// =========================
	// PAGE DETAILS
	// =========================

	loadPageDetails(): void {
		this.metaAuthService.getPages().subscribe({
			next: (res: any) => {
				console.log("Pages from DB:", res);

				const pages = res?.data || [];

				const currentPage = pages.find(
					(page: any) =>
						String(page.pageId || page.id || page._id) ===
						String(this.pageId),
				);

				if (currentPage) {
					this.pageName =
						currentPage.name ||
						currentPage.pageName ||
						"Facebook Page";

					console.log("Current Page Name:", this.pageName);
				} else {
					console.warn("Page not found for pageId:", this.pageId);
				}
			},

			error: (err) => {
				console.error("Error loading page from DB:", err);
			},
		});
	}

	// =========================
	// FORMS LOGIC
	// =========================

	loadForms(): void {
		this.isLoadingForms = true;

		this.metaAuthService.getPageForms(this.pageId).subscribe({
			next: (res: any) => {
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

				this.forms = [];

				this.isLoadingForms = false;
			},
		});
	}

	syncFormLeads(formId: string): void {
		this.isLoadingForms = true;

		this.syncMessage = "Syncing leads from Meta...";

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
			},
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
				console.error("Error loading leads:", error);
				this.leads = [];
				this.loading = false;
			},
		});
	}

	// =========================
	// SEARCH + FILTER
	// =========================

	get filteredLeads(): Lead[] {
		const search = this.searchText.toLowerCase().trim();

		return this.leads.filter((lead: Lead) => {
			const matchesSearch =
				!search ||
				(lead.name || "").toLowerCase().includes(search) ||
				(lead.email || "").toLowerCase().includes(search) ||
				(lead.phone || "").toLowerCase().includes(search) ||
				(lead.source || "").toLowerCase().includes(search);

			const matchesStatus =
				this.selectedStatus === "ALL" ||
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
		return this.leads.filter((lead) => lead.status === "NEW").length;
	}

	get qualifiedLeads(): number {
		return this.leads.filter((lead) => lead.status === "QUALIFIED").length;
	}

	get bookings(): number {
		return this.leads.filter((lead) => lead.status === "CLOSED_WON").length;
	}

	// =========================
	// STATUS SELECT
	// =========================

	selectStatus(lead: Lead, newStatus: LeadStatus): void {
		lead.pendingStatus = newStatus;
	}

	// Inside facebook-leads.component.ts
confirmStatusChange(lead: Lead): void {
  if (!lead.pendingStatus) return;

  // ==========================================
  // CLOSED WON
  // ==========================================

  if (lead.pendingStatus === "CLOSED_WON") {

    const dialogRef = this.dialog.open(DealAmountDialogComponent, {
      width: "400px",
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {

      // User cancelled the dialog
      if (result === undefined || result === null) {
        this.cancelStatusChange(lead);
        return;
      }

      const dealValue = Number(result);

      // Validate amount
      if (isNaN(dealValue) || dealValue <= 0) {

        this.snackBar.open(
          "⚠ Invalid amount. Please enter a valid sale amount.",
          "Close",
          {
            duration: 2500,
            horizontalPosition: "center",
            verticalPosition: "top",
          }
        );

        this.cancelStatusChange(lead);
        return;
      }

      const currency = "INR";

      this.leadService
        .updateLeadStatus(
          lead._id,
          "CLOSED_WON",
          dealValue,
          currency
        )
        .subscribe({

          next: () => {

            lead.status = "CLOSED_WON";
            lead.dealValue = dealValue;
            lead.currency = currency;

            delete lead.pendingStatus;

            this.snackBar.open(
              "✓ Deal closed successfully",
              "",
              {
                duration: 1000,
                horizontalPosition: "center",
                verticalPosition: "top",
              }
            );
          },

          error: (err) => {

            console.error(
              "Failed to update lead:",
              err
            );

            this.snackBar.open(
              "✕ Failed to close deal",
              "Close",
              {
                duration: 2000,
                horizontalPosition: "center",
                verticalPosition: "top",
              }
            );

            this.cancelStatusChange(lead);
          },
        });
    });

    return;
  }

  // ==========================================
  // NORMAL STATUS UPDATE
  // ==========================================

  this.leadService
    .updateLeadStatus(
      lead._id,
      lead.pendingStatus
    )
    .subscribe({

      next: () => {

        lead.status = lead.pendingStatus!;

        delete lead.pendingStatus;

        this.snackBar.open(
          "✓ Status changed successfully",
          "",
          {
            duration: 1000,
            horizontalPosition: "center",
            verticalPosition: "top",
          }
        );
      },

      error: (err) => {

        console.error(
          "Failed to update lead:",
          err
        );

        this.snackBar.open(
          "✕ Failed to update lead status",
          "Close",
          {
            duration: 2000,
            horizontalPosition: "center",
            verticalPosition: "top",
          }
        );

        this.cancelStatusChange(lead);
      },
    });
}
	// =========================
	// CANCEL STATUS CHANGE
	// =========================

	cancelStatusChange(lead: Lead): void {
		delete lead.pendingStatus;
	}
}
