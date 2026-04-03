// Exposes REST API endpoints for crop price data.
const express = require("express");
const CropPrice = require("../models/CropPrice");

const router = express.Router();

const normalizePayload = (payload) => ({
  name: payload.name?.trim(),
  price: Number(payload.price),
  date: payload.date,
  location: payload.location?.trim(),
});

router.get("/", async (req, res, next) => {
  try {
    const { crop, location } = req.query;
    const filters = {};

    if (crop) {
      filters.name = new RegExp(`^${crop}$`, "i");
    }

    if (location) {
      filters.location = new RegExp(`^${location}$`, "i");
    }

    const prices = await CropPrice.find(filters).sort({ date: -1, createdAt: -1 });
    res.json(prices);
  } catch (error) {
    next(error);
  }
});

router.get("/:crop", async (req, res, next) => {
  try {
    const { crop } = req.params;
    const { location } = req.query;
    const filters = {
      name: new RegExp(`^${crop}$`, "i"),
    };

    if (location) {
      filters.location = new RegExp(`^${location}$`, "i");
    }

    const prices = await CropPrice.find(filters).sort({ date: -1, createdAt: -1 });

    if (prices.length === 0) {
      return res.status(404).json({ message: "No price data found for the selected crop" });
    }

    res.json(prices);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const payload = normalizePayload(req.body);

    if (Number.isNaN(payload.price)) {
      return res.status(400).json({ message: "Price must be a valid number" });
    }

    const priceEntry = await CropPrice.create(payload);
    res.status(201).json(priceEntry);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
