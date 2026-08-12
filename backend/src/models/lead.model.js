const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
		},
		email: {
			type: String,
			required: true,
			trim: true,
		},
		phone: {
			type: String,
			trim: true,
			default: "",
		},
		property: {
			type: String,
			default: "",
			trim: true,
		},
		source: {
			type: String,
			enum: ["META", "MANUAL", "OTHER"],
			default: "META",
		},
		status: {
			type: String,
			enum: [
				"NEW",
				"CONTACTED",
				"INTERESTED",
				"SITE_VISIT_SCHEDULED",
				"SITE_VISITED",
				"BOOKED",
				"CLOSED",
			],
			default: "NEW",
		},
		metaLeadId: {
			type: String,
			unique: true,
			sparse: true,
		},
		pageId: {
			type: String,
			index: true,
		},

		formId: {
			type: String,
			index: true,
		},

		formName: {
			type: String,
			default: "",
			trim: true,
		},
		notes: {
			type: String,
		},
		siteVisitDate: {
			type: Date,
		},
	},
	{ timestamps: true },
);

module.exports = mongoose.model("Lead", leadSchema);
