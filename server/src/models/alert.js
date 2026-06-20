const { query } = require('../config/db');

const createAlert = async (data) => {
  const {
    shipment_id, vehicle_plate, alert_type, alert_level,
    message, temperature, max_temperature
  } = data;
  const result = await query(
    `INSERT INTO alerts (shipment_id, vehicle_plate, alert_type, alert_level, message, temperature, max_temperature)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [shipment_id, vehicle_plate, alert_type, alert_level, message, temperature, max_temperature]
  );
  return result.rows[0];
};

const getAlerts = async (options = {}) => {
  const { is_resolved, limit = 50, offset = 0 } = options;
  let sql = 'SELECT a.*, s.product_name FROM alerts a LEFT JOIN shipments s ON a.shipment_id = s.id';
  const params = [];
  const conditions = [];

  if (is_resolved !== undefined) {
    conditions.push(`a.is_resolved = $${params.length + 1}`);
    params.push(is_resolved);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY a.created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, offset);

  const result = await query(sql, params);
  return result.rows;
};

const getUnresolvedAlerts = async () => {
  const result = await query(`
    SELECT a.*, s.product_name, s.max_temperature
    FROM alerts a
    LEFT JOIN shipments s ON a.shipment_id = s.id
    WHERE a.is_resolved = false
    ORDER BY a.created_at DESC
  `);
  return result.rows;
};

const resolveAlert = async (id, note) => {
  const result = await query(
    `UPDATE alerts
     SET is_resolved = true, resolved_at = CURRENT_TIMESTAMP, resolved_note = $1
     WHERE id = $2 RETURNING *`,
    [note, id]
  );
  return result.rows[0];
};

const hasRecentUnresolvedAlert = async (shipmentId, alertType, minutes = 5) => {
  const result = await query(
    `SELECT * FROM alerts
     WHERE shipment_id = $1 AND alert_type = $2 AND is_resolved = false
     AND created_at > NOW() - INTERVAL '${minutes} minutes'
     ORDER BY created_at DESC LIMIT 1`,
    [shipmentId, alertType]
  );
  return result.rows.length > 0;
};

module.exports = {
  createAlert,
  getAlerts,
  getUnresolvedAlerts,
  resolveAlert,
  hasRecentUnresolvedAlert,
};
