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

	// =========================
	// LEADS STATE
	// =========================

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
	) {}

	// =========================
	// INIT
	// =========================

	ngOnInit(): void {
		// Read pageId from URL
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

	// =========================
	// SYNC FORM LEADS
	// =========================

	syncFormLeads(formId: string): void {
		this.isLoadingForms = true;

		this.syncMessage = "Syncing leads from Meta...";

		console.log(
			"SENDING TO BACKEND -> Page ID:",
			this.pageId,
			"| Form ID:",
			formId,
		);

		this.metaAuthService.syncLeads(this.pageId, formId).subscribe({
			next: (res: any) => {
				this.syncMessage = `Success! Synced ${res.totalFormMeta} leads.`;

				this.isLoadingForms = false;

				this.loadLeads();
			},

			error: (err) => {
				console.error("Error syncing leads:", err);

				this.syncMessage = `Error: ${
					err.error?.message || "Failed to sync leads."
				}`;

				this.isLoadingForms = false;
			},
		});
	}

	// =========================
	// LEADS LOGIC
	// =========================

	loadLeads(): void {
		this.loading = true;

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

	// =========================
	// CONFIRM STATUS CHANGE
	// =========================

	confirmStatusChange(lead: Lead): void {
		if (!lead.pendingStatus) {
			return;
		}

		// ==========================================
		// CLOSED WON → OPEN DEAL AMOUNT DIALOG
		// ==========================================

		if ((lead.pendingStatus as string) === "CLOSED_WON") {
			const dialogRef = this.dialog.open(DealAmountDialogComponent, {
				width: "400px",
				disableClose: true,
				autoFocus: true,
			});

			dialogRef.afterClosed().subscribe((amount: number | null) => {
				// User cancelled
				if (amount === null || amount === undefined) {
					this.cancelStatusChange(lead);
					return;
				}

				// Validate amount
				if (isNaN(amount) || amount <= 0) {
					this.snackBar.open("Please enter a valid sale amount", "", {
						duration: 2000,
						horizontalPosition: "center",
						verticalPosition: "top",
					});

					this.cancelStatusChange(lead);
					return;
				}

				// Update CLOSED WON
				this.updateLeadStatus(lead, amount, "INR");
			});

			return;
		}

		// ==========================================
		// ALL OTHER STATUS CHANGES
		// ==========================================

		this.updateLeadStatus(lead);
	}

	// =========================
	// UPDATE LEAD STATUS
	// =========================

	updateLeadStatus(lead: Lead, dealValue?: number, currency?: string): void {
		const newStatus = lead.pendingStatus;

		if (!newStatus) {
			return;
		}

		this.leadService
			.updateLeadStatus(lead._id, newStatus, dealValue, currency)
			.subscribe({
				next: () => {
					// Update status
					lead.status = newStatus;

					// Save purchase information
					if (dealValue !== undefined) {
						(lead as any).dealValue = dealValue;

						(lead as any).currency = currency;
					}

					// Clear pending status
					delete lead.pendingStatus;

					// ==========================================
					// SUCCESS POPUP
					// ==========================================

					this.snackBar.open("✓ Status changed successfully", "", {
						duration: 1000,
						horizontalPosition: "center",
						verticalPosition: "top",
					});
				},

				error: (err) => {
					console.error("Failed to update lead:", err);

					this.snackBar.open(
						"✕ Failed to update lead status",
						"Close",
						{
							duration: 2000,
							horizontalPosition: "center",
							verticalPosition: "top",
						},
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
