const express = require("express");
const helmet = require("helmet");
const cors = require("cors");

const app = express();

// Security & parsing
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check route
app.get("/", (req, res) => {
    res.json({ status: "Secure Chat Backend running" });
});

app.listen(3001, () => {
    console.log("Server running on http://localhost:3001");
});