const Lead = require("../models/lead.model");
const ConversionEvent = require("../models/conversion-event.model");

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

const updateBooking = async (leadId, bookingAmount, currency = "INR") => {
	const lead = await Lead.findById(leadId);

	if (!lead) {
		throw new Error("Lead not found");
	}

	if (!Number.isFinite(bookingAmount) || bookingAmount <= 0) {
		throw new Error("bookingAmount must be greater than 0");
	}

	if (!/^[A-Z]{3}$/.test(currency)) {
		throw new Error("currency must be a valid 3-letter currency code");
	}

	// -----------------------------------------
	// 1. Update booking information
	// -----------------------------------------

	lead.bookingAmount = bookingAmount;
	lead.currency = currency;
	lead.status = "BOOKED";

	await lead.save();

	// -----------------------------------------
	// 2. Create/find the Purchase conversion event
	// -----------------------------------------

	const eventId = `purchase_${lead._id}`;

	let conversionEvent = await ConversionEvent.findOne({
		eventId,
	});

	// -----------------------------------------
	// 3. Already successfully sent?
	// -----------------------------------------

	if (conversionEvent?.status === "SUCCESS") {
		return {
			lead,
			conversion: conversionEvent,
		};
	}

	// -----------------------------------------
	// 4. Create pending event if it doesn't exist
	// -----------------------------------------

	if (!conversionEvent) {
		conversionEvent = await ConversionEvent.create({
			leadId: lead._id,
			eventName: "Purchase",
			eventId,
			status: "PENDING",
		});
	}

	// -----------------------------------------
	// 5. Try sending CAPI
	// -----------------------------------------

	try {
		conversionEvent.attempts += 1;
		conversionEvent.lastAttemptAt = new Date();

		await conversionEvent.save();

		const capiResponse = await sendConversionEvent({
			lead,
			eventName: "Purchase",
			custom_data: {
				value: bookingAmount,
				currency,
			},
			eventId,
		});

		// -----------------------------------------
		// 6. CAPI succeeded
		// -----------------------------------------

		conversionEvent.status = "SUCCESS";
		conversionEvent.sentAt = new Date();
		conversionEvent.response = capiResponse;
		conversionEvent.error = undefined;

		await conversionEvent.save();

		return {
			lead,
			conversion: conversionEvent,
		};
	} catch (error) {
		// -----------------------------------------
		// 7. CAPI failed
		// -----------------------------------------

		conversionEvent.status = "FAILED";
		conversionEvent.error = {
			message: error.message,
			stack: error.stack,
		};

		await conversionEvent.save();

		return {
			lead,
			conversion: conversionEvent,
		};
	}
};

module.exports = {
	createLead,
	updateLeadStatus,
	getAllLeads,
	getLeadById,
	createLeadIfNotExists,
	updateBooking,
};
