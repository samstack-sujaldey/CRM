const metaService = require("../services/meta.service");

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

module.exports = {
	getMetaUser,
	getPages,
	getPageForms,
	getFormLeads
};
