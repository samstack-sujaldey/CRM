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
			return res.status(400).json({ // ✅ ADD RETURN
				success: false,
				message: "Status is required",
			});
		}
        
        // 1. Wait for your Database to update the status[cite: 5, 6]
		const updateLead = await leadService.updateLeadStatus(
			req.params.id,
			req.body.status,
		);

		if (!updateLead) {
			return res.status(404).json({ // ✅ ADD RETURN
				success: false,
				message: "Lead not Found",
			});
		}

        // 2. 🚀 FIRE CONVERSIONS API IN THE BACKGROUND
        if (updateLead.metaLeadId) {
            sendConversionEvent(
                req.user.accessToken, 
                updateLead.metaLeadId, 
                updateLead.status,
				updateLead.email, // 👈 Pass the email
                updateLead.phone
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
