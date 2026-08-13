const Lead = require("../models/lead.model");
const {
	sendConversionEvent,
	getEventNameForStatus,
} = require("./capi.service");

const createLead = async (data) => {
	return await Lead.create(data);
};

const updateLeadStatus = async (id, newStatus) => {
	const lead = await Lead.findById(id);

	if (!lead) {
		throw new Error("Lead not found");
	}

	const oldStatus = lead.status;

	if (oldStatus == newStatus) {
		return { lead, capi: null };
	}

	lead.status = newStatus;

	await lead.save();

	const eventName = getEventNameForStatus(newStatus);

	let capiResult = null;

	if (eventName) {
		try {
			capiResult = await sendConversionEvent({
				lead,
				eventName,
				eventId: `${lead._id}-${newStatus}-${Date.now()}`,
			});

			console.log(`CAPI event sent: ${eventName} for lead ${lead._id}`);
		} catch (error) {
			console.error("========== CAPI ERROR ==========");
			console.error("Message:", error.message);
			console.error("Stack:", error.stack);
			console.error("================================");
		}
	}

	return { lead, capi: capiResult };
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
