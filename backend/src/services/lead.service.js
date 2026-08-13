const Lead = require("../models/lead.model");
const Page = require("../models/page.model");
const metaService = require("./meta.service");
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
		const error = new Error("Lead Not Found");
		error.statusCode = 400;
		throw error;
	}

	return { lead, capi: capiResult };
};

const getAllLeads = async (pageId) => {
    if (!pageId) {
        const error = new Error("pageId is required");
        error.statusCode = 400;
        throw error;
    }

    // 1. Find selected page in MongoDB
    const page = await Page.findOne({ pageId });

    if (!page) {
        const error = new Error("Page not found");
        error.statusCode = 404;
        throw error;
    }

    // 2. Get Page Access Token
    const pageAccessToken = page.accessToken;

    // 3. Get all forms of this page
    const formsResponse = await metaService.getPageForms(
        pageId,
        pageAccessToken
    );

    const forms = formsResponse.data || [];

    // 4. Fetch leads from every form
    const formsWithLeads = await Promise.all(
        forms.map(async (form) => {
            try {
                const leadsResponse = await metaService.getFormLeads(
                    form.id,
                    pageAccessToken
                );

                const leads = await Promise.all(
                    (leadsResponse.data || []).map(async (metaLead) => {

                        // Convert Meta field_data into simple object
                        const fieldData = {};

                        (metaLead.field_data || []).forEach((field) => {
                            fieldData[field.name] =
                                field.values?.[0] || "";
                        });

                        // Prepare MongoDB lead data
                        const leadData = {
                            name:
                                fieldData.full_name ||
                                fieldData.name ||
                                "Unknown",

                            email:
                                fieldData.email || "",

                            phone:
                                fieldData.phone_number ||
                                fieldData.phone ||
                                "",

                            source: "META",

                            metaLeadId: metaLead.id,

                            status: "NEW",

                            pageId: page.pageId,
                            pageName: page.name,

                            formId: form.id,
                            formName:
                                form.name ||
                                "Unnamed Form",

                            createdAt: metaLead.created_time
                                ? new Date(metaLead.created_time)
                                : undefined,
                        };

                        // Check MongoDB and create only if missing
                        const result =
                            await createLeadIfNotExists(leadData);

                        const existingLead = result.lead;

                        // Return lead for frontend
                        return {
                            leadId: metaLead.id,

                            mongoLeadId: existingLead._id,

                            createdTime:
                                metaLead.created_time,

                            name:
                                fieldData.full_name ||
                                fieldData.name ||
                                "",

                            email:
                                fieldData.email || "",

                            phone:
                                fieldData.phone_number ||
                                fieldData.phone ||
                                "",

                            // IMPORTANT:
                            // Keep MongoDB status if lead already exists
                            status: existingLead.status,

                            fields: fieldData,
                        };
                    })
                );

                return {
                    formId: form.id,

                    formName:
                        form.name ||
                        "Unnamed Form",

                    leads,
                };

            } catch (error) {

                console.error(
                    `Failed to fetch leads for form ${form.id}:`,
                    error.message
                );

                return {
                    formId: form.id,

                    formName:
                        form.name ||
                        "Unnamed Form",

                    leads: [],

                    error:
                        "Failed to fetch leads for this form",
                };
            }
        })
    );

    // 5. Return page + forms + leads
    return {
        pageId: page.pageId,

        pageName: page.name,

        forms: formsWithLeads,
    };
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

const syncAllMetaLeads = async () => {

	const pages = await Page.find({});

	let totalFetched = 0;
	let totalCreated = 0;
	let totalExisting = 0;

	const syncedPages = [];

	for (const page of pages) {

		console.log(
			`Syncing page: ${page.name} (${page.pageId})`
		);

		// Get all forms of this page
		const formsResponse = await metaService.getPageForms(
			page.pageId,
			page.accessToken
		);

		const forms = formsResponse.data || [];

		const syncedForms = [];

		for (const form of forms) {

			// Get all leads from this form
			const leadsResponse = await metaService.getFormLeads(
				form.id,
				page.accessToken
			);

			const metaLeads = leadsResponse.data || [];

			let formCreated = 0;
			let formExisting = 0;

			for (const metaLead of metaLeads) {

				totalFetched++;

				// Convert Meta lead → MongoDB structure
				const fieldData = metaLead.field_data || [];

				const getFieldValue = (fieldName) => {

					const field = fieldData.find(
						(item) => item.name === fieldName
					);

					return field?.values?.[0] || "";
				};

				const leadData = {

					name:
						getFieldValue("full_name") ||
						getFieldValue("name") ||
						"Unknown",

					email:
						getFieldValue("email"),

					phone:
						getFieldValue("phone_number") ||
						getFieldValue("phone"),

					source: "META",

					status: "NEW",

					metaLeadId: metaLead.id,

					property: "",

					notes: "",

					// Useful for identifying where lead came from
					pageId: page.pageId,

					pageName: page.name,

					formId: form.id,

					formName: form.name || "Unnamed Form",

					createdAt: metaLead.created_time
						? new Date(metaLead.created_time)
						: undefined,
				};

				const result =
					await createLeadIfNotExists(leadData);

				if (result.created) {

					totalCreated++;
					formCreated++;

				} else {

					totalExisting++;
					formExisting++;

				}
			}

			syncedForms.push({
				formId: form.id,
				formName: form.name || "Unnamed Form",
				fetched: metaLeads.length,
				created: formCreated,
				existing: formExisting,
			});
		}

		syncedPages.push({
			pageId: page.pageId,
			pageName: page.name,
			forms: syncedForms,
		});
	}

	return {
		totalFetched,
		totalCreated,
		totalExisting,
		pages: syncedPages,
	};
};

module.exports = {
	createLead,
	updateLeadStatus,
	getAllLeads,
	getLeadById,
	createLeadIfNotExists,
	syncAllMetaLeads,
	updateBooking,
};
