const express = require("express");

const router = express.Router();

const leadController = require("../controllers/lead.controller");

router.get("/", leadController.getLeads);
router.get("/:id", leadController.getLead);
router.post("/", leadController.createLead);
router.patch("/:id/status", leadController.updateLeadStatus);
router.patch("/:id/booking", leadController.updateBooking);

module.exports = router;
