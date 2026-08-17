const Lead = require("../models/lead.model");

const createLead = async (data) => {
	return await Lead.create(data);
};

const updateLeadStatus = async (leadId, status, dealValue, currency) => {
	const allowedStatus = [
		"NEW",
		"CONTACTED",
		"QUALIFIED",
		"SITE_VISIT_SCHEDULED",
		"SITE_VISITED",
		"NEGOTIATION",
		"CLOSED_WON",
		"CLOSED_LOST",
	];

	if (!allowedStatus.includes(status)) {
		const error = new Error("Invalid lead Status");
		error.statusCode = 400;
		throw error;
	}
	const updateData = { status: status };

	if (status === "CLOSED_WON") {
		// Only save the deal value if the deal is actually won
		if (dealValue !== undefined) updateData.dealValue = dealValue;
		if (currency !== undefined) updateData.currency = currency;
	} else {
		updateData.dealValue = null;
	}
	const lead = await Lead.findByIdAndUpdate(leadId, updateData, {
		returnDocument: "after",
		runValidators: true,
	});

	if (!lead) {
		const error = new Error("Lead Not Found");
		error.statusCode = 400;
		throw error;
	}

	return lead;
};

const getAllLeads = async (metaUserId, pageObjectId) => {
	const query = { metaUserId: metaUserId };

	if (pageObjectId) {
		query.page = pageObjectId;
	}

	return await Lead.find(query)
		.populate("page", "name pageId forms")
		.sort({ createdAt: -1 });
};

const getLeadById = async (LeadId, metaUserId) => {
	return await Lead.findOne({ _id: LeadId, metaUserId: metaUserId });
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
