const Lead = require("../models/lead.model");

const createLead = async (data) => {
	return await Lead.create(data);
};

const updateLeadStatus = async (LeadId, status) => {
	const lead = await Lead.findByIdAndUpdate(
		LeadId,
		{ status },
		{ new: true, runValidators: true },
	);
	return lead;
};

const getAllLeads = async () => {
	return await Lead.find().sort({ createdAt: -1 });
};

const getLeadById = async (LeadId) => {
	return await Lead.findById(LeadId);
};

module.exports = {
	createLead,
	updateLeadStatus,
	getAllLeads,
	getLeadById,
};
