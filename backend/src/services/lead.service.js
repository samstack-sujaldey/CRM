const Lead = require("../models/lead.model");
const Page = require("../models/page.model");
const metaService = require("./meta.service");

const createLead = async (data) => {
	return await Lead.create(data);
};

const updateLeadStatus = async (leadId, status) => {
	const allowedStatus = [
		"NEW",
		"CONTACTED",
		"INTERESTED",
		"SITE_VISIT_SCHEDULED",
		"SITE_VISITED",
		"BOOKED",
		"CLOSED",
	];

	if (!allowedStatus.includes(status)) {
		const error = new Error("Invalid lead Status");
		error.statusCode = 400;
		throw error;
	}
	const lead = await Lead.findByIdAndUpdate(
		leadId,
		{ status: status },
		{ new: true, runValidators: true },
	);

	if (!lead) {
		const error = new Error("Lead Not Found");
		error.statusCode = 400;
		throw error;
	}

	return lead;
};

const getAllLeads = async (pageId) => {
	if (!pageId) {
		const error = new Error("pageId is required");
		error.statusCode = 400;
		throw error;
	}

	// 1. Find the selected page in our database
	const page = await Page.findOne({ pageId });

	if (!page) {
		const error = new Error("Page not found");
		error.statusCode = 404;
		throw error;
	}

	// 2. Get the Page Access Token
	const pageAccessToken = page.accessToken;

	// 3. Get all forms belonging to this page
	const formsResponse = await metaService.getPageForms(
		pageId,
		pageAccessToken
	);

	const forms = formsResponse.data || [];

	// 4. Fetch leads for every form
	const formsWithLeads = await Promise.all(
		forms.map(async (form) => {
			try {
				const leadsResponse = await metaService.getFormLeads(
					form.id,
					pageAccessToken
				);

				const leads = await Promise.all(
					(leadsResponse.data || []).map(async (metaLead) => {

						const fieldData = {};

						(metaLead.field_data || []).forEach((field) => {
							fieldData[field.name] = field.values?.[0] || "";
						});

						// Find existing MongoDB lead
						let existingLead = await Lead.findOne({
							metaLeadId: metaLead.id,
						});

						// If this Meta lead does not exist in MongoDB,
						// create it so we can store its CRM status.
						if (!existingLead) {
							existingLead = await Lead.create({
								name: fieldData.full_name || "Unknown",
								email: fieldData.email || "",
								phone: fieldData.phone_number || "",
								source: "META",
								metaLeadId: metaLead.id,
								status: "NEW",
							});
						}

						return {
							leadId: metaLead.id,
							mongoLeadId: existingLead._id,

							createdTime: metaLead.created_time,

							name: fieldData.full_name || "",
							email: fieldData.email || "",
							phone: fieldData.phone_number || "",

							status: existingLead.status,

							fields: fieldData,
						};
					})
				);

				return {
					formId: form.id,
					formName: form.name || "Unnamed Form",
					leads,
				};
			} catch (error) {
				console.error(
					`Failed to fetch leads for form ${form.id}:`,
					error.message
				);

				return {
					formId: form.id,
					formName: form.name || "Unnamed Form",
					leads: [],
					error: "Failed to fetch leads for this form",
				};
			}
		})
	);

	// 5. Return page + forms + leads
	return {
		pageId: page.pageId,
		pageName: page.name,
		forms: formsWithLeads,
	};
};

const getLeadById = async (LeadId) => {
	return await Lead.findById(LeadId);
};

const createLeadIfNotExists = async (leadData) => {
	const existingLead = await Lead.findOne({
		metaLeadId: leadData.metaLeadId,
	});

	if (existingLead) {
		return {
			created: false,
			lead: existingLead,
		};
	}

	const lead = await Lead.create(leadData);
	return {
		created: true,
		lead: lead,
	};
};

module.exports = {
	createLead,
	updateLeadStatus,
	getAllLeads,
	getLeadById,
	createLeadIfNotExists,
};
