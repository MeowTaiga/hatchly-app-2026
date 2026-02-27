/**
 * Your machine's LAN IP — needed for physical devices to reach the backend.
 * Update this if your IP changes (check with `ipconfig` / `ifconfig`).
 */
const LAN_IP = '192.168.1.146';

const DEV_API_URL = `http://${LAN_IP}:5000`;

export const API_BASE_URL = __DEV__ ? DEV_API_URL : 'https://api.hatchly.app';

/**
 * WebSocket URL — same host as the API.
 */
export const WS_URL = API_BASE_URL;
