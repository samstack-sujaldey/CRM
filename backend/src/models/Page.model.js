const mongoose = require("mongoose");

const pageSchema = new mongoose.Schema(
  {
    // NEW: Strict relational reference to your User/MetaConnection model
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MetaConnection", // Ensure this matches your exact model name!
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
    forms: [{
      formId: String,
      name: String
    }]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Page", pageSchema);