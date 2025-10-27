const REDIS_HOST = process.env.REDIS_HOST || "redis";
const REDIS_PORT = process.env.REDIS_PORT || 6379;

export const REDIS_URL = process.env.REDIS_URL || `redis://${REDIS_HOST}:${REDIS_PORT}`;
export const UPDATE_INTERVAL = parseInt(process.env.UPDATE_INTERVAL || "500", 10);
export const PORT = parseInt(process.env.PORT || "3000", 10);
