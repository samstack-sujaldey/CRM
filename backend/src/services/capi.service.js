const axios = require("axios");
const axiosRetry = require("axios-retry").default;
const crypto = require("crypto");

const capiClient = axios.create();
axiosRetry(capiClient, {
	retries: 3,
	retryDelay: axiosRetry.exponentialDelay,
	retryCondition: (error) => {
		return (
			axiosRetry.isNetworkOrIdempotentRequestError(error) ||
			error.response?.status >= 500
		);
	},
});

const hashData = (data) => {
	if (!data) return undefined;
	return crypto
		.createHash("sha256")
		.update(data.trim().toLowerCase())
		.digest("hex");
};

const sendConversionEvent = async (
	accessToken,
	metaLeadId,
	newStatus,
	email,
	phone,
	dealValue,
	currency,
	pixelId,
	apiVersion,
) => {
	try {
		const resolvedPixelId = pixelId || process.env.META_PIXEL_ID;
		const resolvedToken = accessToken || process.env.META_CAPI_TOKEN;
		const resolvedApiVersion =
			apiVersion || process.env.META_API_VERSION || "v26.0";

		if (!resolvedPixelId || !resolvedToken) {
			console.warn("CAPI Skipped: Missing Pixel ID or Access Token");
			return;
		}

		if (newStatus === "CLOSED_LOST") {
			return;
		}

		let eventName = "Lead";
		if (newStatus === "CONTACTED") eventName = "Contact";
		if (newStatus === "SITE_VISIT_SCHEDULED") eventName = "Schedule";
		if (newStatus === "SITE_VISITED") eventName = "FindLocation";
		if (newStatus === "NEGOTIATION") eventName = "SubmitApplication";
		if (newStatus === "CLOSED_WON") eventName = "Purchase";

		const customData = {
			crm_status: newStatus,
		};

		if (eventName === "Purchase") {
			customData.currency = currency || "INR";
			customData.value = Number(dealValue) || 1;
		}

		const payload = {
			data: [
				{
					event_name: eventName,
					event_time: Math.floor(Date.now() / 1000),
					action_source: "system_generated",
					user_data: {
						lead_id: metaLeadId,
						em: hashData(email),
						ph: hashData(phone),
					},
					custom_data: customData,
				},
			],
		};

		const url = `https://graph.facebook.com/${resolvedApiVersion}/${resolvedPixelId}/events`;
		await capiClient.post(url, payload, {
			params: { access_token: resolvedToken },
		});

		console.log(
			`CAPI Success: Sent '${eventName}' event for lead ${metaLeadId} to Pixel ${resolvedPixelId}`,
		);
	} catch (error) {
		console.error("CAPI Error:", error.response?.data || error.message);
	}
};

module.exports = {
	sendConversionEvent,
};
