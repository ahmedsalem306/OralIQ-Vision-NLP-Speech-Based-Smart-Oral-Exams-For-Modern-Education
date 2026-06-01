import axios from "axios";

const api = axios.create({
    baseURL:
        import.meta.env.VITE_API_URL ??
        (import.meta.env.DEV
            ? "http://127.0.0.1:8000/api/v1"
            : "https://ahmed2552-oraliq-api.hf.space/api/v1"),
});

// Add a request interceptor to include the JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default api;
