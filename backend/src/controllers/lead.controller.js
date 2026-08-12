const leadService = require("../services/lead.service");

const getLeads = async (req, res, next) => {
	try {
		const { pageId } = req.query;

		if (!pageId) {
			return res.status(400).json({
				success: false,
				message: "pageId is required",
			});
		}

		const leads = await leadService.getAllLeads(pageId);

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
		if (!updateLead) {
			res.status(404).json({
				success: false,
				message: "Lead not Found",
			});
		}

		res.status(200).json({
			success: true,
			message: "Lead status updated successfully",
			data: updateLead,
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
