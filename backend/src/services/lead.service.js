const Lead = require("../models/lead.model");

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

const getAllLeads = async () => {
	return await Lead.find().sort({ createdAt: -1 });
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
