const dotenv = require("dotenv");
dotenv.config();
const crypto = require("crypto");

const META_API_VERSION = process.env.META_API_VERSION || "v26.0";
const DATASET_ID = process.env.META_DATASET_ID;
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN;

const hashData = (value) => {
	if (!value) {
		return null;
	}

	return crypto
		.createHash("sha256")
		.update(value.trim().toLowerCase())
		.digest("hex");
};

const sendLeadEvent = async (lead) => {
	if (!DATASET_ID || !ACCESS_TOKEN) {
		throw new Error("META CAPI environment variables are missing");
	}

	const eventId = `lead-${lead._id}`;

	const payload = {
		data: [
			{
				event_name: "Lead",

				event_time: Math.floor(Date.now() / 1000),

				action_source: "website",

				event_id: eventId,

				user_data: {
					em: lead.email ? [hashData(lead.email)] : undefined,

					ph: lead.phone ? [hashData(lead.phone)] : undefined,
				},
			},
		],
	};

	const url =
		`https://graph.facebook.com/${META_API_VERSION}` +
		`/${DATASET_ID}/events`;

	const response = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${ACCESS_TOKEN}`,
		},
		body: JSON.stringify(payload),
	});

	const result = await response.json();

	if (!response.ok) {
		console.error("Meta CAPI error : ", result);
		const error = new Error(
			result.error?.message || "Meta CAPI request failed",
		);

		throw error;
	}

	return result;
};

module.exports = { sendLeadEvent };
