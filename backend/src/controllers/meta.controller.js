const dotenv = require("dotenv");
dotenv.config();
const Page = require("../models/Page.model");
const crypto = require("crypto");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const MetaConnection = require("../models/meta.model");
const Lead = require("../models/lead.model");
const metaService = require("../services/meta.service");
const leadService = require("../services/lead.service");
const ApiVersion = process.env.META_API_VERSION || "v26.0";

const startMetaAuth = async (req, res) => {
	try {
		const state = crypto.randomBytes(16).toString("hex");
		const authUrl = axios.getUri({
			url: `https://www.facebook.com/${ApiVersion}/dialog/oauth`,
			params: {
				client_id: process.env.META_APP_ID,
				redirect_uri: process.env.META_REDIRECT_URI,
				config_id: process.env.META_CONFIG_ID,
				response_type: "code",
				// Scopes are ignored if config_id restricts them. Ensure config_id matches these!
				scope: "ads_management,ads_read,business_management,leads_retrieval,pages_show_list,pages_read_engagement",
				state,
			},
		});
		return res.status(200).json({ success: true, authUrl });
	} catch (error) {
		console.error("Meta OAuth start error:", error);
		res.status(500).json({
			success: false,
			message: "Failed to start Meta OAuth",
		});
	}
};

const metaAuthCallback = async (req, res) => {
	try {
		const { code, error } = req.query;
		if (error || !code) {
			return res.redirect(
				`${process.env.FRONTEND_URL}/login?error=oauth_failed`,
			);
		}

		// Step 1: Exchange code for short-lived access token
		const tokenResponse = await axios.get(
			`https://graph.facebook.com/${ApiVersion}/oauth/access_token`,
			{
				params: {
					client_id: process.env.META_APP_ID,
					client_secret: process.env.META_APP_SECRET,
					redirect_uri: process.env.META_REDIRECT_URI,
					code,
				},
			},
		);
		const shortLivedToken = tokenResponse.data.access_token;

		// Step 2: Upgrade to a 60-day Long-Lived User Access Token
		let finalAccessToken = shortLivedToken;
		let tokenExpiresIn = tokenResponse.data.expires_in;

		try {
			const longLivedData =
				await metaService.exchangeLongLivedToken(shortLivedToken);
			if (longLivedData.access_token) {
				finalAccessToken = longLivedData.access_token;
				tokenExpiresIn = longLivedData.expires_in;
			}
		} catch (exchangeErr) {
			console.warn(
				"Long-lived token exchange warning:",
				exchangeErr.message,
			);
		}

		// Step 3: Fetch Meta User Profile
		const meResponse = await axios.get(
			`https://graph.facebook.com/${ApiVersion}/me`,
			{
				params: {
					fields: "id,name",
					access_token: finalAccessToken,
				},
			},
		);
		const meData = meResponse.data;

		let grantedPermissions = [];
		try {
			const permResponse = await axios.get(
				`https://graph.facebook.com/${ApiVersion}/me/permissions`,
				{
					params: { access_token: finalAccessToken },
				},
			);
			if (permResponse.data && permResponse.data.data) {
				grantedPermissions = permResponse.data.data
					.filter((p) => p.status === "granted")
					.map((p) => p.permission);
			}
		} catch (permError) {
			console.error("Failed to fetch permissions:", permError.message);
		}

		const expiresAt = tokenExpiresIn
			? new Date(Date.now() + tokenExpiresIn * 1000)
			: null;

		const existingConnection = await MetaConnection.findOne({
			metaUserId: meData.id,
		});

		const updatePayload = {
			metaUserId: meData.id,
			name: meData.name,
			accessToken: finalAccessToken,
			tokenType: "bearer",
			permissions: grantedPermissions,
			expiresAt,
			configurationId: process.env.META_CONFIG_ID || "",
		};

		if (existingConnection) {
			updatePayload.pixelId = existingConnection.pixelId || "";
			updatePayload.capiToken = existingConnection.capiToken || "";
		}

		const connection = await MetaConnection.findOneAndUpdate(
			{ metaUserId: meData.id },
			updatePayload,
			{ upsert: true, returnDocument: "after" },
		);

		// Step 4: Fetch user's available pixels and datasets
		try {
			const flattenedPixels =
				await metaService.getAllUserPixelsAndDatasets(finalAccessToken);

			const defaultPixelId =
				flattenedPixels.length > 0 ? flattenedPixels[0].id : "";

			await MetaConnection.findByIdAndUpdate(connection._id, {
				availablePixels: flattenedPixels,
				pixelId: connection.pixelId || defaultPixelId,
			});
			console.log(
				`[OAuth Successful] || "None found"}`,
			);
		} catch (pixelErr) {
			console.warn(
				"Failed to fetch pixels during OAuth:",
				pixelErr.message,
			);
		}

		const appToken = jwt.sign(
			{ id: connection._id },
			process.env.JWT_SECRET,
			{ expiresIn: "7d" },
		);

		return res.redirect(
			`${process.env.FRONTEND_URL}/login?token=${appToken}`,
		);
	} catch (error) {
		console.error(
			"Meta OAuth callback error:",
			error.response?.data || error.message,
		);
		return res.redirect(
			`${process.env.FRONTEND_URL}/login?error=oauth_failed`,
		);
	}
};

const getMetaStatus = async (req, res) => {
	try {
		const connection = req.user;
		const isConnected =
			connection &&
			(!connection.expiresAt ||
				new Date(connection.expiresAt).getTime() > Date.now());
		return res.status(200).json({
			success: true,
			connected: !!isConnected,
			metaUserId: connection.metaUserId,
			name: connection.name,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: "Failed to check status",
		});
	}
};

const getMetaUser = async (req, res, next) => {
	try {
		const userAccessToken = req.user.accessToken;
		const user = await metaService.getMetaUser(userAccessToken);
		res.json({ success: true, data: user });
	} catch (err) {
		next(err);
	}
};

const getPages = async (req, res, next) => {
	try {
		if (!req.user || !req.user.accessToken) {
			return res.status(401).json({
				success: false,
				message: "Unauthorized or missing Meta token.",
			});
		}
		const userAccessToken = req.user.accessToken;
		const metaUserId = req.user.metaUserId;

		const pagesResponse = await metaService.getPages(userAccessToken);
		const fbPages = pagesResponse.data || [];

		// Fallback: If availablePixels is empty in req.user, run a scan now
		let userAvailablePixels = req.user.availablePixels || [];
		if (userAvailablePixels.length === 0) {
			userAvailablePixels =
				await metaService.getAllUserPixelsAndDatasets(userAccessToken);
			await MetaConnection.findByIdAndUpdate(req.user._id, {
				availablePixels: userAvailablePixels,
			});
		}

		const defaultPixelId =
			req.user.pixelId ||
			(userAvailablePixels.length > 0 ? userAvailablePixels[0].id : "");

		const pagePromises = fbPages.map(async (fbPage) => {
			const existingPage = await Page.findOne({ pageId: fbPage.id });
			const currentPixelId = existingPage?.pixelId || "";

			metaService.subscribePageToApp(fbPage.id, fbPage.access_token);

			return Page.findOneAndUpdate(
				{ pageId: fbPage.id },
				{
					$set: {
						user: req.user._id,
						metaUserId: metaUserId,
						pageId: fbPage.id,
						name: fbPage.name,
						accessToken: fbPage.access_token,
						pixelId: currentPixelId || defaultPixelId,
					},
				},
				{ upsert: true, returnDocument: "after" },
			);
		});

		const savedPages = await Promise.all(pagePromises);

		const safePagesForFrontend = savedPages.map((page) => ({
			pageId: page.pageId,
			name: page.name,
			pixelId: page.pixelId || "",
			capiToken: page.capiToken || "",
		}));

		res.json({
			success: true,
			data: safePagesForFrontend,
			availablePixels: userAvailablePixels,
		});
	} catch (err) {
		next(err);
	}
};

const getUserPixels = async (req, res, next) => {
	try {
		const storedPixels = req.user.availablePixels || [];
		if (storedPixels.length > 0) {
			return res.json({ success: true, data: storedPixels });
		}

		const userAccessToken = req.user.accessToken;
		const flattenedPixels =
			await metaService.getAllUserPixelsAndDatasets(userAccessToken);

		// Cache it to the user object
		await MetaConnection.findByIdAndUpdate(req.user._id, {
			availablePixels: flattenedPixels,
		});

		res.json({ success: true, data: flattenedPixels });
	} catch (err) {
		next(err);
	}
};

const setPagePixel = async (req, res, next) => {
	try {
		const { pageId } = req.params;
		const { pixelId, capiToken } = req.body;

		const page = await Page.findOneAndUpdate(
			{ pageId: pageId, user: req.user._id },
			{ pixelId, capiToken },
			{ returnDocument: "after" },
		);

		if (!page) {
			return res
				.status(404)
				.json({ success: false, message: "Page not found" });
		}

		res.json({
			success: true,
			message: "Pixel and CAPI token mapped to page successfully",
			data: { pageId: page.pageId, pixelId: page.pixelId },
		});
	} catch (err) {
		next(err);
	}
};

const getPageForms = async (req, res, next) => {
	try {
		const { pageId } = req.params;
		const pageRecord = await Page.findOne({ pageId: pageId });

		if (!pageRecord || !pageRecord.accessToken) {
			return res
				.status(404)
				.json({ success: false, message: "Page not found." });
		}
		if (
			!pageRecord.user ||
			pageRecord.user.toString() !== req.user._id.toString()
		) {
			return res
				.status(403)
				.json({ success: false, message: "Access denied." });
		}

		const formsData = await metaService.getPageForms(
			pageId,
			pageRecord.accessToken,
		);
		const extractedForms = formsData.data.map((form) => ({
			formId: form.id,
			name: form.name,
		}));

		// THE FIX: Directly update the database using $set instead of .save()
		await Page.findOneAndUpdate(
			{ pageId: pageId },
			{ $set: { forms: extractedForms } },
			{ returnDocument: "after" },
		);

		res.json({ success: true, data: extractedForms });
	} catch (err) {
		next(err);
	}
};

const getFormLeads = async (req, res, next) => {
	try {
		const { formId } = req.params;

		const pageRecord = await Page.findOne({
			user: req.user._id,
			forms: {
				$elemMatch: {
					formId: formId,
				},
			},
		});

		if (!pageRecord) {
			return res.status(404).json({
				success: false,
				message: "Form not found.",
			});
		}

		const leads = await Lead.find({
			page: pageRecord._id,
			formId: formId,
		}).sort({
			createdAt: -1,
		});

		res.json({
			success: true,
			data: leads,
		});
	} catch (err) {
		console.error("Error loading form leads:", err);
		next(err);
	}
};

const syncLeads = async (req, res, next) => {
	try {
		const { pageId, formId } = req.body;
		if (!pageId || !formId) {
			return res.status(400).json({
				success: false,
				message: "Both pageId and formId are required to sync leads.",
			});
		}

		const pageRecord = await Page.findOne({ pageId: pageId });
		if (!pageRecord || !pageRecord.accessToken) {
			return res.status(404).json({
				success: false,
				message: "Page token not found. Sync pages first.",
			});
		}

		if (
			!pageRecord.user ||
			pageRecord.user.toString() !== req.user._id.toString()
		) {
			return res
				.status(403)
				.json({ success: false, message: "Access denied." });
		}

		const leadsFromMeta = await metaService.getFormLeads(
			formId,
			pageRecord.accessToken,
		);
		if (!leadsFromMeta || !leadsFromMeta.data) {
			return res.status(400).json({
				success: false,
				message: "No leads returned from Meta.",
			});
		}

		let newLeadsCount = 0;
		for (const fbLead of leadsFromMeta.data) {
			const getFieldValue = (fieldName) => {
				const field = fbLead.field_data?.find(
					(f) => f.name === fieldName,
				);
				return field ? field.values[0] : "";
			};

			const extractedName =
				getFieldValue("full_name") ||
				getFieldValue("first_name") ||
				"Unknown";
			const extractedEmail =
				getFieldValue("email") || "no-email@provided.com";
			const extractedPhone = getFieldValue("phone_number") || "";

			const leadData = {
				metaUserId: req.user.metaUserId,
				page: pageRecord._id,
				formId: formId,
				metaLeadId: fbLead.id,
				name: extractedName,
				email: extractedEmail,
				phone: extractedPhone,
				source: "META",
				status: "NEW",
			};

			const result = await leadService.createLeadIfNotExists(leadData);
			if (result.created) {
				newLeadsCount++;
			}
		}

		res.status(200).json({
			success: true,
			message: "Sync completed successfully",
			totalFormMeta: newLeadsCount,
		});
	} catch (err) {
		console.error("Error in syncLeads:", err);
		next(err);
	}
};


const verifyWebhook = (req, res) => {
	const mode = req.query["hub.mode"];
	const token = req.query["hub.verify_token"];
	const challenge = req.query["hub.challenge"];

	if (
		mode === "subscribe" &&
		token === process.env.META_WEBHOOK_VERIFY_TOKEN
	) {
		console.log("[Webhook] Verified successfully with Meta");
		return res.status(200).send(challenge);
	} else {
		console.warn("[Webhook] Verification failed. Token mismatch.");
		return res.sendStatus(403);
	}
};

const isValidWebhookSignature = (req) => {
	const signatureHeader = req.headers["x-hub-signature-256"];
	if (!signatureHeader || !req.rawBody) return false;

	const expectedHash = crypto
		.createHmac("sha256", process.env.META_APP_SECRET)
		.update(req.rawBody)
		.digest("hex");
	const expectedSignature = `sha256=${expectedHash}`;

	try {
		return crypto.timingSafeEqual(
			Buffer.from(signatureHeader),
			Buffer.from(expectedSignature),
		);
	} catch {
		return false; 
	}
};

const handleWebhook = async (req, res) => {
	res.status(200).send("EVENT_RECEIVED");

	if (!isValidWebhookSignature(req)) {
		console.warn("[Webhook] Invalid signature — ignoring payload");
		return;
	}

	try {
		const body = req.body;

		if (body.object !== "page") {
			return;
		}

		for (const entry of body.entry || []) {
			const pageId = entry.id;

			// Find the page in MongoDB to get its stored access token
			const pageRecord = await Page.findOne({ pageId: pageId });
			if (!pageRecord || !pageRecord.accessToken) {
				console.warn(
					`[Webhook] Page ${pageId} not found in database or missing token`,
				);
				continue;
			}

			for (const change of entry.changes || []) {
				if (change.field === "leadgen") {
					const leadgenId = change.value?.leadgen_id;
					const formId = change.value?.form_id;

					if (!leadgenId) continue;

					console.log(
						`[Webhook] New real-time lead detected: ${leadgenId} for page ${pageId}`,
					);

					// Fetch full lead data from Meta Graph API using page token
					const fbLead = await metaService.getLeadDetails(
						leadgenId,
						pageRecord.accessToken,
					);

					const getFieldValue = (fieldName) => {
						const field = fbLead.field_data?.find(
							(f) => f.name === fieldName,
						);
						return field ? field.values[0] : "";
					};

					const extractedName =
						getFieldValue("full_name") ||
						getFieldValue("first_name") ||
						"Unknown";
					const extractedEmail =
						getFieldValue("email") || "no-email@provided.com";
					const extractedPhone = getFieldValue("phone_number") || "";

					const leadData = {
						metaUserId: pageRecord.metaUserId,
						page: pageRecord._id,
						formId: formId || fbLead.form_id || "Unknown",
						metaLeadId: leadgenId,
						name: extractedName,
						email: extractedEmail,
						phone: extractedPhone,
						source: "META",
						status: "NEW",
					};

					const result =
						await leadService.createLeadIfNotExists(leadData);
					if (result.created) {
						console.log(
							`[Webhook] Lead ${leadgenId} automatically saved to DB`,
						);
					} else {
						console.log(
							`[Webhook] Lead ${leadgenId} already existed`,
						);
					}
				}
			}
		}
	} catch (error) {
		console.error("[Webhook Error]:", error.message);
	}
};

module.exports = {
	startMetaAuth,
	metaAuthCallback,
	getMetaStatus,
	getMetaUser,
	getPages,
	getUserPixels,
	setPagePixel,
	getPageForms,
	getFormLeads,
	syncLeads,
	handleWebhook,
	verifyWebhook,
};
