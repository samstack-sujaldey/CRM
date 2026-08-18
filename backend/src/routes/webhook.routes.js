const express = require("express");
const router = express.Router();
const {
	verifyWebhook,
	receiveWebhookEvent,
} = require("../controllers/webhook.controller");

router.get("/facebook", verifyWebhook);
router.post("/facebook", receiveWebhookEvent);

module.exports = router;