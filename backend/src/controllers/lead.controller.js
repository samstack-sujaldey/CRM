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
		const { status } = req.body;
		if (!status) {
			res.status(400).json({
				success: false,
				message: "Status is required",
			});
		}
		const lead = await leadService.updateLeadStatus(
			req.params.id,
			req.body.status,
		);
		if (!lead) {
			res.status(404).json({
				success: false,
				message: "Lead not Found",
			});
		}

		res.json({
			success: true,
			message: "Lead status updated",
			data: lead,
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
