const axios = require("axios");
const Page = require("../models/Page.model");
const leadService = require("../services/lead.service");
const ApiVersion = process.env.META_API_VERSION || "v26.0";

// 1. Meta Webhook Verification (GET)
const verifyWebhook = (req, res) => {
	const mode = req.query["hub.mode"];
	const token = req.query["hub.verify_token"];
	const challenge = req.query["hub.challenge"];

	if (
		mode === "subscribe" &&
		token === process.env.META_WEBHOOK_VERIFY_TOKEN
	) {
		console.log("✅ [Meta Webhook] Verification successful!");
		return res.status(200).send(challenge);
	}

	return res.sendStatus(403);
};

// 2. Incoming Real-Time Event Receiver (POST)
const receiveWebhookEvent = async (req, res) => {
	// Acknowledge receipt to Meta immediately (prevents duplicate retries)
	res.status(200).send("EVENT_RECEIVED");

	try {
		const { object, entry } = req.body;

		if (object !== "page" || !Array.isArray(entry)) {
			return;
		}

		for (const pageEntry of entry) {
			const changes = pageEntry.changes || [];

			for (const change of changes) {
				if (change.field === "leadgen") {
					const { leadgen_id, page_id, form_id } = change.value;

					// 1. Retrieve the matching Page document to get its Page Access Token
					const pageRecord = await Page.findOne({ pageId: page_id });
					if (!pageRecord || !pageRecord.accessToken) {
						console.warn(
							`[Webhook] Received lead for untracked page ID: ${page_id}`,
						);
						continue;
					}

					// 2. Query Graph API for the full Lead data payload
					const leadResponse = await axios.get(
						`https://graph.facebook.com/${ApiVersion}/${leadgen_id}`,
						{
							params: { access_token: pageRecord.accessToken },
						},
					);

					const fbLead = leadResponse.data;
					if (!fbLead || !fbLead.field_data) continue;

					// Helper to extract field values
					const getFieldValue = (fieldName) => {
						const field = fbLead.field_data.find(
							(f) => f.name === fieldName,
						);
						return field ? field.values[0] : "";
					};

					const extractedName =
						getFieldValue("full_name") ||
						getFieldValue("first_name") ||
						"Unknown Lead";
					const extractedEmail =
						getFieldValue("email") || "no-email@provided.com";
					const extractedPhone =
						getFieldValue("phone_number") || "";

					const leadData = {
						metaUserId: pageRecord.metaUserId,
						page: pageRecord._id,
						formId: form_id,
						metaLeadId: leadgen_id,
						name: extractedName,
						email: extractedEmail,
						phone: extractedPhone,
						source: "META",
						status: "NEW",
					};

					// 3. Save directly to MongoDB
					const result = await leadService.createLeadIfNotExists(leadData);
					if (result.created) {
						console.log(
							`⚡ [Webhook Success] Auto-saved new lead: ${leadData.name} (ID: ${leadgen_id})`,
						);
					}
				}
			}
		}
	} catch (error) {
		console.error(
			"❌ [Webhook Error]:",
			error.response?.data || error.message,
		);
	}
};

module.exports = {
	verifyWebhook,
	receiveWebhookEvent,
};