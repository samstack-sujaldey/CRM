const metaService = require("../services/meta.service");
const leadService = require("../services/lead.service");

const getMetaUser = async (req, res, next) => {
	try {
		const user = await metaService.getMetaUser();
		res.json({
			success: true,
			data: user,
		});
	} catch (err) {
		next(err);
	}
};

const getPages = async (req, res, next) => {
	try {
		const pages = await metaService.getPages();
		res.json({
			success: true,
			data: pages,
		});
	} catch (err) {
		next(err);
	}
};

const getPageForms = async (req, res, next) => {
	try {
		const { pageId } = req.params;
		const forms = await metaService.getPageForms(pageId);
		res.json({
			success: true,
			data: forms,
		});
	} catch (err) {
		next(err);
	}
};

const getFormLeads = async (req, res, next) => {
	try {
		const { formId } = req.params;
		const leads = await metaService.getFormLeads(formId);
		res.json({
			success: true,
			data: leads,
		});
	} catch (err) {
		next(err);
	}
};

const syncLeads = async (req, res, next) => {
	try {
		const { formId } = req.body;

		if (!formId) {
			return res.status(400).json({
				success: false,
				message: "Form Id is required",
			});
		}

		const metaResponse = await metaService.getFormLeads(formId);

		const leads = metaResponse.data || [];

		const results = [];

		for (const metaLead of leads) {
			const fields = {};

			for (const field of metaLead.field_data || []) {
				fields[field.name] = field.values?.[0] || "";
			}

			const leadData = {
				metaLeadId: metaLead.id,
				name: fields.full_name || "",
				email: fields.email || "",
				phone: fields.phone_number || "",
				source: "META",
				status: "NEW",
			};

			const result = await leadService.createLeadIfNotExists(leadData);
			results.push(result);
		}

		res.json({
			success: true,
			totalFormMeta: leads.length,
			results,
		});
	} catch (err) {
		next(err);
	}
};

module.exports = {
	getMetaUser,
	getPages,
	getPageForms,
	getFormLeads,
	syncLeads,
};
