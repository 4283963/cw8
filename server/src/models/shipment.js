const { query } = require('../config/db');

const getShipments = async (status = null) => {
  let sql = 'SELECT * FROM shipments ORDER BY created_at DESC';
  const params = [];
  if (status) {
    sql += ' WHERE status = $1';
    params.push(status);
  }
  const result = await query(sql, params);
  return result.rows;
};

const getShipmentById = async (id) => {
  const result = await query('SELECT * FROM shipments WHERE id = $1', [id]);
  return result.rows[0];
};

const getShipmentByPlate = async (vehiclePlate) => {
  const result = await query(
    'SELECT * FROM shipments WHERE vehicle_plate = $1 AND status = $2',
    [vehiclePlate, 'in_transit']
  );
  return result.rows[0];
};

const createShipment = async (data) => {
  const {
    shipment_no, vehicle_plate, product_name, product_type,
    max_temperature, origin, destination, departure_time, estimated_arrival
  } = data;
  const result = await query(
    `INSERT INTO shipments (shipment_no, vehicle_plate, product_name, product_type, max_temperature, origin, destination, departure_time, estimated_arrival)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [shipment_no, vehicle_plate, product_name, product_type, max_temperature, origin, destination, departure_time, estimated_arrival]
  );
  return result.rows[0];
};

const updateShipmentStatus = async (id, status) => {
  const result = await query(
    'UPDATE shipments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
    [status, id]
  );
  return result.rows[0];
};

module.exports = {
  getShipments,
  getShipmentById,
  getShipmentByPlate,
  createShipment,
  updateShipmentStatus,
};
