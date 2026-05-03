const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { users } = require("../db");
const { isStrongPassword } = require("../utils/passwordValidator");
const authenticate = require("../middleware/authMiddleware");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// ================= SIGNUP =================
router.post("/signup", async (req, res) => {
    console.log("Signup BODY:", req.body);

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Missing fields" });
    }

    // Validate username format (alphanumeric + underscore only)
    if (!/^[a-zA-Z0-9_]{3,32}$/.test(username)) {
        return res.status(400).json({
            error: "Username must be 3-32 characters (alphanumeric and underscore only)"
        });
    }

    if (!isStrongPassword(password)) {
        return res.status(400).json({
            error:
                "Password must be at least 12 characters long and include uppercase, lowercase, number, and symbol"
        });
    }

    if (users.has(username)) {
        return res.status(409).json({ error: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    users.set(username, {
        username,
        passwordHash,
        publicKey: null
    });

    return res.status(201).json({ message: "User created" });
});


// ================= LOGIN =================
router.post("/login", async (req, res) => {
    console.log("Login BODY:", req.body);

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Missing fields" });
    }

    const user = users.get(username);

    if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);

    if (!ok) {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
        { username },
        JWT_SECRET,
        { expiresIn: "24h" }
    );

    // Set httpOnly secure cookie
    res.cookie("authToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    // Also return token so frontend can use it as fallback
    return res.status(200).json({ token, message: "Login successful" });
});


// ================= PUBLIC KEY UPLOAD (PROTECTED) =================
router.post("/public-key", authenticate, (req, res) => {
    const { username, publicKey } = req.body;

    // Ensure user can only upload their own key
    if (req.user.username !== username) {
        return res.status(403).json({ error: "Unauthorized: can only upload your own key" });
    }

    // Validate public key format (should be base64)
    if (!publicKey || typeof publicKey !== "string" || publicKey.length < 100) {
        return res.status(400).json({ error: "Invalid public key format" });
    }

    // Basic validation that it looks like base64
    if (!/^[A-Za-z0-9+/=]+$/.test(publicKey)) {
        return res.status(400).json({ error: "Invalid public key format" });
    }

    const user = users.get(username);
    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }

    user.publicKey = publicKey;

    return res.status(200).json({ message: "Public key stored" });
});


// ================= GET PUBLIC KEY (PROTECTED) =================
router.get("/public-key/:username", authenticate, (req, res) => {
    const user = users.get(req.params.username);

    if (!user || !user.publicKey) {
        return res.status(404).json({ error: "Public key not found" });
    }

    return res.status(200).json({ publicKey: user.publicKey });
});

module.exports = router;