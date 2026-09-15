import { Redis } from '@upstash/redis';

let _redis: Redis | null = null;

export function isKvConfigured(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return Boolean(url && token);
}

export function getRedis(): Redis {
  if (!_redis) {
    _redis = Redis.fromEnv();
  }
  return _redis;
}
