const alertModel = require('../models/alert');

class AlertDebouncer {
  constructor(options = {}) {
    this.lastAlerts = new Map();
    this.debounceWindow = options.debounceWindow || 300000;
    this.maxSize = options.maxSize || 1000;
    this.stats = { total: 0, debounced: 0, passed: 0 };
  }

  _getKey(shipmentId, alertType) {
    return `${shipmentId}:${alertType}`;
  }

  shouldTriggerAlert(shipmentId, alertType) {
    const key = this._getKey(shipmentId, alertType);
    const now = Date.now();
    const lastAlert = this.lastAlerts.get(key);

    this.stats.total++;

    if (lastAlert && now - lastAlert < this.debounceWindow) {
      this.stats.debounced++;
      return false;
    }

    this.stats.passed++;
    this.lastAlerts.set(key, now);

    if (this.lastAlerts.size > this.maxSize) {
      const oldestKey = this.lastAlerts.keys().next().value;
      this.lastAlerts.delete(oldestKey);
    }

    return true;
  }

  resetAlert(shipmentId, alertType) {
    const key = this._getKey(shipmentId, alertType);
    this.lastAlerts.delete(key);
  }

  getStats() {
    return {
      size: this.lastAlerts.size,
      maxSize: this.maxSize,
      debounceWindow: this.debounceWindow,
      ...this.stats,
    };
  }
}

const alertDebouncer = new AlertDebouncer({
  debounceWindow: parseInt(process.env.ALERT_DEBOUNCE_WINDOW) || 300000,
  maxSize: parseInt(process.env.ALERT_DEBOUNCE_MAX_SIZE) || 1000,
});

module.exports = {
  AlertDebouncer,
  alertDebouncer,
};
