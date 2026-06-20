const { query } = require('../config/db');

const createTemperatureRecord = async (data) => {
  const {
    shipment_id, vehicle_plate, temperature, humidity,
    location_lat, location_lng, recorded_at
  } = data;
  const result = await query(
    `INSERT INTO temperature_records (shipment_id, vehicle_plate, temperature, humidity, location_lat, location_lng, recorded_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [shipment_id, vehicle_plate, temperature, humidity, location_lat, location_lng, recorded_at || new Date()]
  );
  return result.rows[0];
};

const getTemperatureRecords = async (shipmentId, limit = 50) => {
  const result = await query(
    'SELECT * FROM temperature_records WHERE shipment_id = $1 ORDER BY recorded_at DESC LIMIT $2',
    [shipmentId, limit]
  );
  return result.rows.reverse();
};

const getLatestTemperatureByShipment = async (shipmentId) => {
  const result = await query(
    'SELECT * FROM temperature_records WHERE shipment_id = $1 ORDER BY recorded_at DESC LIMIT 1',
    [shipmentId]
  );
  return result.rows[0];
};

const getLatestTemperatures = async () => {
  const result = await query(`
    SELECT DISTINCT ON (shipment_id) shipment_id, vehicle_plate, temperature, humidity, recorded_at, location_lat, location_lng
    FROM temperature_records
    ORDER BY shipment_id, recorded_at DESC
  `);
  return result.rows;
};

module.exports = {
  createTemperatureRecord,
  getTemperatureRecords,
  getLatestTemperatureByShipment,
  getLatestTemperatures,
};
