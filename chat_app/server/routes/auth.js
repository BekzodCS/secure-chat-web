const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { users } = require("../db");

const router = express.Router();
const JWT_SECRET = "CHANGE_THIS_SECRET_LATER";

// Signup
router.post("/signup", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Missing fields" });
    }

    if (users.has(username)) {
        return res.status(409).json({ error: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    users.set(username, {
        username,
        passwordHash
    });

    res.status(201).json({ message: "User created" });
});

// Login
router.post("/login", async (req, res) => {
    const { username, password } = req.body;

    const user = users.get(username);
    if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ username }, JWT_SECRET, {
        expiresIn: "1h"
    });

    res.json({ token });
});

module.exports = router;