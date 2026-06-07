import { Redis } from '@upstash/redis';

let _redis: Redis | null = null;

export function isKvConfigured(): boolean {
  return Boolean(process.env.KV_REST_API_URL);
}

export function getRedis(): Redis {
  if (!_redis) {
    _redis = Redis.fromEnv();
  }
  return _redis;
}
