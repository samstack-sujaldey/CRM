const mongoose = require("mongoose");

const metaConnectionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one Meta connection per app user - enforced at the DB level
      index: true,
    },

    metaUserId: {
      type: String,
      required: true,
      index: true,
    },

    accessToken: {
      type: String,
      required: true,
    },

    tokenType: {
      type: String,
      default: "bearer",
    },

    expiresAt: {
      type: Date,
      default: null,
    },

    permissions: {
      type: [String],
      default: [],
    },

    configurationId: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Meta",
  metaConnectionSchema
);