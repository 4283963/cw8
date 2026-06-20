const { query } = require('../config/db');

const TRACEABILITY_THRESHOLD = 4.0;

const getOverTempRecords = async (shipmentId, options = {}) => {
  const { threshold = TRACEABILITY_THRESHOLD, date } = options;

  const targetDate = date || new Date().toISOString().split('T')[0];

  const result = await query(
    `SELECT
       tr.id,
       tr.shipment_id,
       tr.vehicle_plate,
       tr.temperature,
       tr.humidity,
       tr.location_lat,
       tr.location_lng,
       tr.recorded_at
     FROM temperature_records tr
     WHERE tr.shipment_id = $1
       AND tr.temperature > $2
       AND DATE(tr.recorded_at) = DATE($3)
     ORDER BY tr.recorded_at ASC`,
    [shipmentId, threshold, targetDate]
  );
  return result.rows;
};

const getOverTempSegments = async (shipmentId, options = {}) => {
  const { threshold = TRACEABILITY_THRESHOLD, date } = options;
  const targetDate = date || new Date().toISOString().split('T')[0];

  const result = await query(
    `SELECT
       tr.id,
       tr.shipment_id,
       tr.vehicle_plate,
       tr.temperature,
       tr.humidity,
       tr.location_lat,
       tr.location_lng,
       tr.recorded_at
     FROM temperature_records tr
     WHERE tr.shipment_id = $1
       AND DATE(tr.recorded_at) = DATE($2)
     ORDER BY tr.recorded_at ASC`,
    [shipmentId, targetDate]
  );

  const allRecords = result.rows;
  const segments = [];
  let currentSegment = null;

  for (const record of allRecords) {
    const isOverTemp = parseFloat(record.temperature) > threshold;

    if (isOverTemp) {
      if (!currentSegment) {
        currentSegment = {
          start_time: record.recorded_at,
          end_time: record.recorded_at,
          records: [record],
          max_temperature: parseFloat(record.temperature),
          avg_temperature: parseFloat(record.temperature),
        };
      } else {
        currentSegment.end_time = record.recorded_at;
        currentSegment.records.push(record);
        const temp = parseFloat(record.temperature);
        if (temp > currentSegment.max_temperature) {
          currentSegment.max_temperature = temp;
        }
      }
    } else {
      if (currentSegment) {
        const temps = currentSegment.records.map((r) => parseFloat(r.temperature));
        currentSegment.avg_temperature = (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(2);
        currentSegment.duration_seconds = Math.floor(
          (new Date(currentSegment.end_time) - new Date(currentSegment.start_time)) / 1000
        );
        segments.push(currentSegment);
        currentSegment = null;
      }
    }
  }

  if (currentSegment) {
    const temps = currentSegment.records.map((r) => parseFloat(r.temperature));
    currentSegment.avg_temperature = (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(2);
    currentSegment.duration_seconds = Math.floor(
      (new Date(currentSegment.end_time) - new Date(currentSegment.start_time)) / 1000
    );
    segments.push(currentSegment);
  }

  return segments;
};

const getShipmentSummary = async (shipmentId, options = {}) => {
  const { threshold = TRACEABILITY_THRESHOLD, date } = options;
  const targetDate = date || new Date().toISOString().split('T')[0];

  const result = await query(
    `SELECT
       s.*,
       COUNT(tr.id) AS total_reports,
       COUNT(CASE WHEN tr.temperature > $2 THEN 1 END) AS over_temp_count,
       MAX(tr.temperature) AS max_temp_today,
       MIN(tr.temperature) AS min_temp_today,
       AVG(tr.temperature) AS avg_temp_today,
       MIN(tr.recorded_at) AS first_report_time,
       MAX(tr.recorded_at) AS last_report_time
     FROM shipments s
     LEFT JOIN temperature_records tr
       ON tr.shipment_id = s.id AND DATE(tr.recorded_at) = DATE($3)
     WHERE s.id = $1
     GROUP BY s.id`,
    [shipmentId, threshold, targetDate]
  );

  return result.rows[0];
};

module.exports = {
  getOverTempRecords,
  getOverTempSegments,
  getShipmentSummary,
  TRACEABILITY_THRESHOLD,
};
