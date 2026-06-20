const shipmentModel = require('../models/shipment');

class ShipmentCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.ttl = options.ttl || 60000;
    this.maxSize = options.maxSize || 1000;
    this.stats = { hits: 0, misses: 0 };
    this.timer = null;
  }

  start() {
    this.timer = setInterval(() => this._cleanup(), this.ttl);
    this.timer.unref();
    console.log(`[ShipmentCache] 车次缓存已启动 (ttl: ${this.ttl}ms, maxSize: ${this.maxSize})`);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.cache.clear();
  }

  _getKey(vehiclePlate) {
    return `plate:${vehiclePlate}`;
  }

  async getByPlate(vehiclePlate) {
    const key = this._getKey(vehiclePlate);
    const cached = this.cache.get(key);

    const now = Date.now();
    if (cached && now - cached.timestamp < this.ttl) {
      this.stats.hits++;
      return cached.data;
    }

    this.stats.misses++;
    const shipment = await shipmentModel.getShipmentByPlate(vehiclePlate);

    if (shipment) {
      if (this.cache.size >= this.maxSize) {
        const oldestKey = this.cache.keys().next().value;
        this.cache.delete(oldestKey);
      }
      this.cache.set(key, {
        data: shipment,
        timestamp: now,
      });
    }

    return shipment;
  }

  invalidate(vehiclePlate) {
    const key = this._getKey(vehiclePlate);
    this.cache.delete(key);
  }

  invalidateAll() {
    this.cache.clear();
    console.log('[ShipmentCache] 缓存已全部清空');
  }

  _cleanup() {
    const now = Date.now();
    let expiredCount = 0;

    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.ttl) {
        this.cache.delete(key);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      console.log(`[ShipmentCache] 清理了 ${expiredCount} 条过期缓存，当前缓存: ${this.cache.size} 条`);
    }
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) + '%' : 'N/A';
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate,
    };
  }
}

const shipmentCache = new ShipmentCache({
  ttl: parseInt(process.env.SHIPMENT_CACHE_TTL) || 60000,
  maxSize: parseInt(process.env.SHIPMENT_CACHE_MAX_SIZE) || 1000,
});

module.exports = {
  ShipmentCache,
  shipmentCache,
};
