const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
  {
    metaUserId: {
			type: String,
			index: true,
		},
		page: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Page",
			required: true,
		},
		formId: {
			type: String,
			required: true,
		},
    metaLeadId: {
      type: String,
      unique: true,
      sparse: true,
    },
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
        "QUALIFIED",
        "SITE_VISIT_SCHEDULED",
        "SITE_VISITED",
        "NEGOTIATION",
        "CLOSED_WON",
        "CLOSED_LOST",
      ],
      default: "NEW",
    },
    dealValue: {
      type: Number,
      default: null,
    },
    currency: {
      type: String,
      default: "INR", 
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
