const express = require("express");
const router = express.Router();

const leadController = require("../controllers/lead.controller");
const authMiddleware = require("../middleware/auth.middleware");

// Protect all lead routes so req.user is available if needed
router.get("/", authMiddleware, leadController.getLeads);
router.get("/:id", authMiddleware, leadController.getLead);
router.post("/", authMiddleware, leadController.createLead);
router.patch("/:id/status", authMiddleware, leadController.updateLeadStatus);

module.exports = router;