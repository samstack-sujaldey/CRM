const leadService = require("../services/lead.service");
const capiService = require("../services/capi.service");

const getLeads = async (req, res, next) => {
	try {
		const leads = await leadService.getAllLeads();
		res.json({
			success: true,
			data: leads,
		});
	} catch (err) {
		next(err);
	}
};

const getLead = async (req, res, next) => {
	try {
		const lead = await leadService.getLeadById(req.params.id);

		if (!lead) {
			res.status(404).json({
				success: false,
				message: "Lead not found",
			});
		}

		res.json({
			success: true,
			data: lead,
		});
	} catch (err) {
		next(err);
	}
};

const createLead = async (req, res, next) => {
	try {
		const lead = await leadService.createLead(req.body);
		res.status(201).json({
			success: true,
			data: lead,
		});
	} catch (err) {
		next(err);
	}
};

const updateLeadStatus = async (req, res, next) => {
	try {
		if (!req.body.status) {
			res.status(400).json({
				success: false,
				message: "Status is required",
			});
		}
		const updateLead = await leadService.updateLeadStatus(
			req.params.id,
			req.body.status,
		);

		let capiResult = null;

		if (req.body.status === "SITE_VISITED") {
			const eventId = `lead_${updateLead._id}_${status}`;

			capiResult = await capiService.sendConversionEvent({
				eventName: "Lead",
				eventId,
				email: updateLead.email,
				phone: updateLead.phone,
				customData: {
					status: updateLead.status,
					lead_id: updateLead._id.toString(),
					source: updateLead.source,
				},
			});
		}

		res.status(200).json({
			success: true,
			message: "Lead status updated successfully",
			data: updateLead,
			capi: capiResult,
		});
	} catch (err) {
		next(err);
	}
};

module.exports = {
	getLeads,
	getLead,
	createLead,
	updateLeadStatus,
};
