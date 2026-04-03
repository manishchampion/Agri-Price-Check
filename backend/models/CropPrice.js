// Defines the MongoDB schema for crop price entries.
const mongoose = require("mongoose");

const cropPriceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Crop name is required"],
      trim: true,
      maxlength: [80, "Crop name cannot exceed 80 characters"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price must be a positive number"],
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
      maxlength: [80, "Location cannot exceed 80 characters"],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

cropPriceSchema.index({ name: 1, location: 1, date: -1 });

module.exports = mongoose.model("CropPrice", cropPriceSchema);
