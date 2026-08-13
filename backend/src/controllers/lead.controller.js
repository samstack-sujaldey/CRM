const leadService = require("../services/lead.service");

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
		const result = await leadService.updateLeadStatus(
			req.params.id,
			req.body.status,
		);

		res.status(200).json({
			success: true,
			message: "Lead status updated successfully",
			data: result.lead,
			capi: result.capi,
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
