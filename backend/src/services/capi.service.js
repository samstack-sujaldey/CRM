const dotenv = require("dotenv");
dotenv.config();
const crypto = require("crypto");

const META_API_VERSION = process.env.META_API_VERSION || "v26.0";
const META_DATASET_ID = process.env.META_DATASET_ID;
const META_CAPI_ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN;

function hash(value) {
	if (!value) return null;

	return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeEmail(email) {
	if (!email) return null;

	return email.trim().toLowerCase();
}

function normalizePhone(phone) {
	if (!phone) return null;

	// Keep digits only.
	return phone.replace(/\D/g, "");
}

function getEventNameForStatus(status) {
	const eventMap = {
		CONTACTED: "Contact",
		INTERESTED: "Lead",
		SITE_VISIT_SCHEDULED: "Schedule",
		SITE_VISITED: "SiteVisit",
		BOOKED: "Purchase",
		CLOSED: "Closed",
	};

	return eventMap[status] || null;
}

/**
 * Send a real conversion event to Meta CAPI.
 */
async function sendConversionEvent({ lead, eventName, eventId }) {
	if (!META_DATASET_ID) {
		throw new Error("META_DATASET_ID is missing");
	}

	if (!META_CAPI_ACCESS_TOKEN) {
		throw new Error("META_CAPI_ACCESS_TOKEN is missing");
	}

	const userData = {};

	const email = normalizeEmail(lead.email);
	const phone = normalizePhone(lead.phone);

	if (email) {
		userData.em = [hash(email)];
	}

	if (phone) {
		userData.ph = [hash(phone)];
	}

	// We need at least one customer identifier for useful matching.
	if (!userData.em && !userData.ph) {
		throw new Error(`Lead ${lead._id} has neither email nor phone`);
	}

	const event = {
		event_name: eventName,
		event_time: Math.floor(Date.now() / 1000),
		action_source: "system_generated",
		event_id: eventId,
		user_data: userData,
	};

	if (eventName === "Purchase") {
		event.custom_data = {
			currency: "INR",
			value: 0,
		};
	}

	const payload = {
		data: [event],
	};

	const url =
		`https://graph.facebook.com/${META_API_VERSION}/` +
		`${META_DATASET_ID}/events`;

	const response = await fetch(url, {
		method: "POST",

		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${META_CAPI_ACCESS_TOKEN}`,
		},

		body: JSON.stringify(payload),
	});

	const result = await response.json();

	if (!response.ok) {
		console.error("Meta CAPI error:", result);

		throw new Error(result?.error?.message || "Meta CAPI request failed");
	}

	console.log("Meta CAPI response:", result);

	return result;
}

module.exports = {
	sendConversionEvent,
	getEventNameForStatus,
};
