const mongoose = require("mongoose");

const conversionEventSchema = new mongoose.Schema(
	{
		leadId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Lead",
			required: true,
			index: true,
		},

		eventName: {
			type: String,
			required: true,
			trim: true,
		},

		eventId: {
			type: String,
			required: true,
			unique: true,
			index: true,
		},

		status: {
			type: String,
			enum: ["PENDING", "SUCCESS", "FAILED"],
			default: "PENDING",
			index: true,
		},

		attempts: {
			type: Number,
			default: 0,
		},

		lastAttemptAt: {
			type: Date,
		},

		sentAt: {
			type: Date,
		},

		response: {
			type: mongoose.Schema.Types.Mixed,
		},

		error: {
			type: mongoose.Schema.Types.Mixed,
		},
	},
	{
		timestamps: true,
	},
);

module.exports = mongoose.model("ConversionEvent", conversionEventSchema);
