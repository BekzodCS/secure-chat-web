import axios from "axios";

const API = axios.create({
    baseURL: "http://localhost:3001/api",
});

export function signup(username, password) {
    return API.post("/signup", { username, password });
}

export function login(username, password) {
    return API.post("/login", { username, password });
}