// Boots the Express server, connects MongoDB, seeds data, and serves the frontend.
const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const priceRoutes = require("./routes/prices");
const CropPrice = require("./models/CropPrice");
const sampleData = require("./seed/sampleData");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/agripricecheck";
const frontendPath = path.join(__dirname, "..", "frontend");

app.use(cors());
app.use(express.json());
app.use(express.static(frontendPath));

app.get("/api/health", (_req, res) => {
  res.json({ message: "AgriPriceCheck API is running" });
});

app.use("/api/prices", priceRoutes);

app.get("*", (_req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.use((error, _req, res, _next) => {
  if (error.name === "ValidationError") {
    return res.status(400).json({
      message: "Validation failed",
      errors: Object.values(error.errors).map((item) => item.message),
    });
  }

  console.error("Server error:", error);
  res.status(500).json({ message: "Internal server error" });
});

const seedDatabase = async () => {
  const count = await CropPrice.countDocuments();

  if (count === 0) {
    // Seed initial demo records for first launch.
    await CropPrice.insertMany(sampleData);
    console.log("Sample crop prices inserted.");
  }
};

const startServer = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB.");

    await seedDatabase();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
