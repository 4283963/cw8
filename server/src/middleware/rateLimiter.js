class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 1000;
    this.maxRequests = options.maxRequests || 1000;
    this.requests = new Map();
    this.cleanupTimer = null;
  }

  start() {
    this.cleanupTimer = setInterval(() => this._cleanup(), this.windowMs * 2);
    this.cleanupTimer.unref();
    console.log(`[RateLimiter] 限流器已启动 (window: ${this.windowMs}ms, max: ${this.maxRequests})`);
  }

  stop() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.requests.clear();
  }

  _getKey(ctx) {
    const ip = ctx.ip || ctx.request.ip || 'unknown';
    return ip;
  }

  check(ctx) {
    const key = this._getKey(ctx);
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let requestTimes = this.requests.get(key) || [];
    requestTimes = requestTimes.filter((t) => t > windowStart);

    if (requestTimes.length >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: requestTimes[0] + this.windowMs,
      };
    }

    requestTimes.push(now);
    this.requests.set(key, requestTimes);

    return {
      allowed: true,
      remaining: this.maxRequests - requestTimes.length,
      resetTime: windowStart + this.windowMs,
    };
  }

  middleware() {
    return async (ctx, next) => {
      const result = this.check(ctx);

      ctx.set('X-RateLimit-Limit', this.maxRequests.toString());
      ctx.set('X-RateLimit-Remaining', result.remaining.toString());
      ctx.set('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString());

      if (!result.allowed) {
        ctx.status = 429;
        ctx.body = { error: 'Too Many Requests', message: '请求过于频繁，请稍后再试' };
        return;
      }

      await next();
    };
  }

  _cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    let cleaned = 0;

    for (const [key, times] of this.requests.entries()) {
      const filtered = times.filter((t) => t > windowStart);
      if (filtered.length === 0) {
        this.requests.delete(key);
        cleaned++;
      } else if (filtered.length < times.length) {
        this.requests.set(key, filtered);
      }
    }

    if (cleaned > 0) {
      console.log(`[RateLimiter] 清理了 ${cleaned} 个过期限流记录`);
    }
  }

  getStats() {
    return {
      windows: this.requests.size,
      windowMs: this.windowMs,
      maxRequests: this.maxRequests,
    };
  }
}

const globalRateLimiter = new RateLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 1000,
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX) || 2000,
});

module.exports = {
  RateLimiter,
  globalRateLimiter,
};
