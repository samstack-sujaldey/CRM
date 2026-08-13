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

const updateBooking = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { bookingAmount, currency = "INR" } = req.body;

		if (bookingAmount === undefined) {
			return res.status(400).json({
				success: false,
				message: "bookingAmount is required",
			});
		}

		const result = await leadService.updateBooking(
			id,
			Number(bookingAmount),
			currency.toUpperCase(),
		);

		const conversionFailed = result.conversion.status === "FAILED";

		return res.status(conversionFailed ? 207 : 200).json({
			success: !conversionFailed,
			message: conversionFailed
				? "Booking saved, but Meta conversion event failed"
				: "Booking updated and conversion event sent successfully",
			data: result.lead,
			conversion: {
				status: result.conversion.status,
				eventName: result.conversion.eventName,
				eventId: result.conversion.eventId,
				attempts: result.conversion.attempts,
				error: result.conversion.error || null,
			},
		});
	} catch (error) {
		next(error);
	}
};

module.exports = {
	getLeads,
	getLead,
	createLead,
	updateLeadStatus,
	updateBooking,
};
