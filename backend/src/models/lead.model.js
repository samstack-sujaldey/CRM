const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
			maxlength: 150,
		},
		email: {
			type: String,
			required: true,
			trim: true,
			lowercase: true,
			maxlength: 254,
		},
		phone: {
			type: String,
			trim: true,
			default: "",
			maxlength: 30,
		},
		property: {
			type: String,
			default: "",
			trim: true,
			maxlength: 200,
		},
		source: {
			type: String,
			enum: ["META", "MANUAL", "OTHER"],
			default: "META",
			index: true,
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
			index: true,
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
		bookingAmount: {
			type: Number,
			min: 0,
			default: 0,
		},
		currency: {
			type: String,
			trim: true,
			uppercase: true,
			match: /^[A-Z]{3}$/,
			default: "INR",
		},
		siteVisitDate: {
			type: Date,
		},
	},
	{ timestamps: true },
);

leadSchema.index(
	{ metaLeadId: 1 },
	{
		unique: true,
		sparse: true,
	},
);

module.exports = mongoose.model("Lead", leadSchema);
