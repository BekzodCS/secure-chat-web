const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const authenticate = require("./middleware/authMiddleware");

const http = require("http");
const setupSocket = require("./socket");

const app = express();
const server = http.createServer(app);

setupSocket(server);

// Security & parsing
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use("/api", authRoutes);
app.get("/api/me", authenticate, (req, res) => {
    res.json({ username: req.user.username });
});

// Health check route
app.get("/", (req, res) => {
    res.json({ status: "Secure Chat Backend running" });
});

server.listen(3001, () => {
    console.log("Server running on http://localhost:3001");
});
