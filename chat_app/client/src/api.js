import axios from "axios";

const API = axios.create({
    baseURL: "http://localhost:3001/api",
});

export const signup = (username, password) =>
    API.post("/signup", { username, password });

export const login = (username, password) =>
    API.post("/login", { username, password });

export const uploadPublicKey = (username, publicKey) =>
    API.post("/public-key", { username, publicKey });

export const getPublicKey = (username) =>
    API.get(`/public-key/${username}`);