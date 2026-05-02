import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

const API = axios.create({
    baseURL: API_URL,
    withCredentials: true // Enable sending cookies with requests
});

// Add token to Authorization header if available (for backwards compatibility)
API.interceptors.request.use((config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const signup = (username, password) =>
    API.post("/signup", { username, password });

export const login = (username, password) =>
    API.post("/login", { username, password });

export const uploadPublicKey = (username, publicKey, token) => {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    return API.post("/public-key", { username, publicKey }, config);
};

export const getPublicKey = (username, token) => {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    return API.get(`/public-key/${username}`, config);
};