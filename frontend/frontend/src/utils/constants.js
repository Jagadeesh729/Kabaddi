export const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8080";
export const SOCKET_URL = import.meta.env.VITE_WS_URL || "http://localhost:8080/ws";

if (!import.meta.env.VITE_API_URL) {
  console.warn("Using fallback local API URL. Check your Vercel/Vite env if on production.");
}
