const express = require("express");
const router = express.Router();


const metaController = require("../controllers/meta.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { sendLeadEvent } = require("../services/capi.service");

// 1. Start OAuth (No authMiddleware because they are logging in!)
router.get("/", metaController.startMetaAuth);
router.get("/callback", metaController.metaAuthCallback);

// 3. Check status (Requires authMiddleware because the user is logged in by this point)
router.get("/status", authMiddleware, metaController.getMetaStatus);
router.get("/me", authMiddleware, metaController.getMetaUser);
router.get("/pages", authMiddleware, metaController.getPages);
router.get("/pages/:pageId/forms", authMiddleware, metaController.getPageForms);
router.get("/forms/:formId/leads", authMiddleware, metaController.getFormLeads);
router.patch("/sync", authMiddleware, metaController.syncLeads);

router.post("/test-capi", async (req, res, next) => {
	try {
		const fakeLead = {
			_id: "test-lead-001",
			email: "test@meta.com",
			phone: "9876543210",
		};

		const result = await sendLeadEvent(fakeLead);

		res.json({
			success: true,
			data: result,
		});
	} catch (error) {
		next(error);
	}
});

module.exports = router;
