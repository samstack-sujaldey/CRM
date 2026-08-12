const mongoose = require("mongoose");

const metaConnectionSchema = new mongoose.Schema(
  {
    metaUserId: {
      type: String,
      required: true,
      unique:true,
      index: true,
    },
    name:{
      type:String
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