import { NextApiRequest, NextApiResponse } from 'next';
import { ENV } from './config';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store for rate limiting
// Note: In production with multiple servers, use Redis instead
const store: RateLimitStore = {};

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key].resetTime <= now) {
      delete store[key];
    }
  });
}, 60000); // Clean up every minute

export interface RateLimitConfig {
  windowMs?: number;    // Time window in milliseconds
  max?: number;         // Max requests per window
  keyGenerator?: (req: NextApiRequest) => string;  // Function to generate unique key
}

const defaultConfig: Required<RateLimitConfig> = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  keyGenerator: (req) => {
    // Use X-Forwarded-For header if available (e.g., when behind a proxy)
    const forwardedFor = req.headers['x-forwarded-for'];
    const ip = Array.isArray(forwardedFor) 
      ? forwardedFor[0] 
      : forwardedFor?.split(',')[0] || req.socket.remoteAddress;
    return `${ip}:${req.url}`;
  },
};

export function withRateLimit(config: RateLimitConfig = {}) {
  const options: Required<RateLimitConfig> = { ...defaultConfig, ...config };

  return function rateLimit(handler: Function) {
    return async function (req: NextApiRequest, res: NextApiResponse) {
      // Skip rate limiting in development
      if (ENV.isDev) {
        return handler(req, res);
      }

      const key = options.keyGenerator(req);
      const now = Date.now();

      // Initialize or reset if window has passed
      if (!store[key] || store[key].resetTime <= now) {
        store[key] = {
          count: 0,
          resetTime: now + options.windowMs,
        };
      }

      // Increment request count
      store[key].count++;

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', options.max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, options.max - store[key].count));
      res.setHeader('X-RateLimit-Reset', store[key].resetTime);

      // Check if rate limit exceeded
      if (store[key].count > options.max) {
        return res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${Math.ceil((store[key].resetTime - now) / 1000)} seconds`,
        });
      }

      // Proceed with request
      return handler(req, res);
    };
  };
} 