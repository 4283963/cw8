const { pool } = require('../config/db');

class TemperatureBulkBuffer {
  constructor(options = {}) {
    this.buffer = [];
    this.maxSize = options.maxSize || 500;
    this.flushInterval = options.flushInterval || 2000;
    this.maxRetries = options.maxRetries || 3;
    this.isFlushing = false;
    this.timer = null;
    this.stats = {
      totalReceived: 0,
      totalWritten: 0,
      totalDropped: 0,
      flushCount: 0,
    };
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.flush(), this.flushInterval);
    this.timer.unref();
    console.log(`[BulkBuffer] 温度批量写入缓冲已启动 (maxSize: ${this.maxSize}, flushInterval: ${this.flushInterval}ms)`);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.buffer.length > 0) {
      this.flush(true);
    }
    console.log('[BulkBuffer] 温度批量写入缓冲已停止');
  }

  add(records) {
    const recordArray = Array.isArray(records) ? records : [records];
    const validRecords = recordArray.filter((r) => r && r.shipment_id && r.vehicle_plate && r.temperature !== undefined);

    if (validRecords.length === 0) return 0;

    if (this.buffer.length + validRecords.length > this.maxSize * 2) {
      const dropCount = validRecords.length;
      this.stats.totalDropped += dropCount;
      console.warn(`[BulkBuffer] 缓冲区已满，丢弃 ${dropCount} 条温度记录`);
      return 0;
    }

    this.buffer.push(...validRecords);
    this.stats.totalReceived += validRecords.length;

    if (this.buffer.length >= this.maxSize && !this.isFlushing) {
      setImmediate(() => this.flush());
    }

    return validRecords.length;
  }

  async flush(force = false) {
    if (this.isFlushing || this.buffer.length === 0) return;

    this.isFlushing = true;
    const batch = this.buffer.splice(0, this.maxSize);

    try {
      await this._bulkInsert(batch);
      this.stats.totalWritten += batch.length;
      this.stats.flushCount++;
    } catch (error) {
      console.error('[BulkBuffer] 批量写入失败:', error.message);
      this.stats.totalDropped += batch.length;
    } finally {
      this.isFlushing = false;

      if (force && this.buffer.length > 0) {
        await this.flush(true);
      }
    }
  }

  async _bulkInsert(records) {
    if (records.length === 0) return 0;

    const values = [];
    const placeholders = [];
    let paramIndex = 1;

    records.forEach((r) => {
      placeholders.push(
        `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6})`
      );
      values.push(
        r.shipment_id,
        r.vehicle_plate,
        r.temperature,
        r.humidity || null,
        r.location_lat || null,
        r.location_lng || null,
        r.recorded_at || new Date()
      );
      paramIndex += 7;
    });

    const sql = `
      INSERT INTO temperature_records
        (shipment_id, vehicle_plate, temperature, humidity, location_lat, location_lng, recorded_at)
      VALUES ${placeholders.join(', ')}
    `;

    const result = await pool.query(sql, values);
    return result.rowCount;
  }

  getStats() {
    return {
      ...this.stats,
      bufferSize: this.buffer.length,
      maxSize: this.maxSize,
      isFlushing: this.isFlushing,
    };
  }
}

const temperatureBuffer = new TemperatureBulkBuffer({
  maxSize: parseInt(process.env.BULK_BUFFER_MAX_SIZE) || 500,
  flushInterval: parseInt(process.env.BULK_FLUSH_INTERVAL) || 2000,
});

module.exports = {
  TemperatureBulkBuffer,
  temperatureBuffer,
};
