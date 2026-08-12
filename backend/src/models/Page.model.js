const mongoose = require("mongoose");

const pageSchema = new mongoose.Schema(
  {
    metaUserId: {
      type: String,
      required: true,
      index: true,
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
  },
  { timestamps: true }
);

module.exports = mongoose.model("Page", pageSchema);