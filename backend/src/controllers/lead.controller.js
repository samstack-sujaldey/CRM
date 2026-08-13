const leadService = require("../services/lead.service");
const {sendConversionEvent}=require('.././services/capi.service')

const getLeads = async (req, res, next) => {
	try {
        // Extract the logged-in user's ID
        const metaUserId = req.user.metaUserId;

        // Pass the ID to the service
		const leads = await leadService.getAllLeads(metaUserId);
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
			return res.status(404).json({
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

// Inside lead.controller.js

const updateLeadStatus = async (req, res, next) => {
	try {
		const { status, dealValue, currency } = req.body;

		if (!status) {
			return res.status(400).json({
				success: false,
				message: "Status is required",
			});
		}

		// 1. Update status in MongoDB (Optionally update dealValue in DB if your Schema supports it)
		const updateLead = await leadService.updateLeadStatus(
			req.params.id,
			status,
			dealValue, // 👈 Add this line to pass it to the DB
            currency
		);

		if (!updateLead) {
			return res.status(404).json({
				success: false,
				message: "Lead not Found",
			});
		}

		// 2. 🚀 Pass the dealValue and currency to Meta Conversions API
		if (updateLead.metaLeadId) {
			sendConversionEvent(
				req.user.accessToken,
				updateLead.metaLeadId,
				updateLead.status,
				updateLead.email,
				updateLead.phone,
				updateLead.dealValue, // 👈 Pass dealValue
				updateLead.currency   // 👈 Pass currency
			);
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
