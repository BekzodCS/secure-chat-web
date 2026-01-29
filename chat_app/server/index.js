const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const http = require("http");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth");
const setupSocket = require("./socket");

const app = express();
const server = http.createServer(app);

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiters
const signupLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: "Too many signup attempts. Try later." }
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: "Too many login attempts. Try later." }
});

// Apply rate limits
app.use("/api/signup", signupLimiter);
app.use("/api/login", loginLimiter);

// Routes
app.use("/api", authRoutes);

// Health check
app.get("/", (req, res) => {
    res.json({ status: "Secure Chat Backend running" });
});

// Sockets
setupSocket(server);

server.listen(3001, () => {
    console.log("Server running on http://localhost:3001");
});