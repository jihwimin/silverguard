require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("./src/routes/auth");

const app = express();
app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err.message));

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/auth", authRoutes);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});