const leadService = require("../services/lead.service");
const { sendConversionEvent } = require("../services/capi.service");
const Lead = require("../models/lead.model");

const getLeads = async (req, res, next) => {
	try {
		const metaUserId = req.user.metaUserId;
		const leads = await leadService.getAllLeads(metaUserId);
		res.json({ success: true, data: leads });
	} catch (err) {
		next(err);
	}
};

const getLead = async (req, res, next) => {
	try {
		const lead = await leadService.getLeadById(
			req.params.id,
			req.user.metaUserId,
		);
		if (!lead) {
			return res
				.status(404)
				.json({ success: false, message: "Lead not found" });
		}
		res.json({ success: true, data: lead });
	} catch (err) {
		next(err);
	}
};

const createLead = async (req, res, next) => {
	try {
		const { metaUserId, page, ...leadData } = req.body;
		const lead = await leadService.createLead({
			...leadData,
			metaUserId: req.user.metaUserId,
			page,
		});
		res.status(201).json({ success: true, data: lead });
	} catch (err) {
		next(err);
	}
};

const updateLeadStatus = async (req, res, next) => {
	try {
		const { status, dealValue, currency } = req.body;
		if (!status) {
			return res
				.status(400)
				.json({ success: false, message: "Status is required" });
		}

		// 1. Update status in MongoDB
		const updateLead = await leadService.updateLeadStatus(
			req.params.id,
			status,
			dealValue,
			currency,
		);

		if (!updateLead) {
			return res
				.status(404)
				.json({ success: false, message: "Lead not Found" });
		}

		// 2. Fetch page-level pixel mapping if available, fallback to user-level
		let targetPixelId = req.user.pixelId || "";
		let targetCapiToken = req.user.capiToken || "";
		if (updateLead.page) {
			const populatedLead = await Lead.findById(updateLead._id).populate(
				"page",
			);
			if (populatedLead?.page?.pixelId) {
				targetPixelId = populatedLead.page.pixelId;
			}
			if (populatedLead?.page?.capiToken) {
				targetCapiToken = populatedLead.page.capiToken;
			}
		}

		// 3. Send conversion event using user's OAuth access token
		if (updateLead.metaLeadId) {
			sendConversionEvent(
				req.user.accessToken,
				updateLead.metaLeadId,
				updateLead.status,
				updateLead.email,
				updateLead.phone,
				updateLead.dealValue,
				updateLead.currency,
				targetPixelId,
				targetCapiToken,
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
