const express = require("express");
const router = express.Router();
const metaController = require("../controllers/meta.controller");
const authMiddleware = require("../middleware/auth.middleware");

// 1. Start OAuth (No authMiddleware because they are logging in!)
router.get("/", metaController.startMetaAuth);
router.get("/callback", metaController.metaAuthCallback);

// 3. Check status (Requires authMiddleware because the user is logged in by this point)
router.get("/status", authMiddleware, metaController.getMetaStatus);
router.get("/me", metaController.getMetaUser);
router.get("/pages", metaController.getPages);
router.get("/pages/:pageId/forms", metaController.getPageForms);
router.get("/forms/:formId/leads", metaController.getFormLeads);
router.patch("/sync", metaController.syncLeads);

module.exports = router;

