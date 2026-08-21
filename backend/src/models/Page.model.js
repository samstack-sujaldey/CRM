const mongoose = require("mongoose");

const pageSchema = new mongoose.Schema(
	{
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Meta",
			required: true,
			index: true,
		},
		metaUserId: {
			type: String,
			required: true,
		},
		pageId: {
			type: String,
			required: true,
			unique: true,
			index: true,
		},
		name: {
			type: String,
			required: true,
		},
	accessToken: {
		type: String,
		required: true,
	},
	pixelId: {
		type: String,
		default: "",
	},
	capiToken: {
		type: String,
		default: "",
	},
	forms: [
			{
				formId: String,
				name: String,
			},
		],
	},
	{ timestamps: true },
);

module.exports = mongoose.model("Page", pageSchema);
