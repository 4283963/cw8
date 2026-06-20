const { temperatureBuffer } = require('./temperatureBulkBuffer');
const { shipmentCache } = require('./shipmentCache');
const { alertDebouncer } = require('./alertDebouncer');
const alertModel = require('../models/alert');
const { broadcastAlert, broadcastTemperature } = require('./websocket');

const reportTemperature = async (data) => {
  const { vehicle_plate, temperature, humidity, location_lat, location_lng } = data;

  const shipment = await shipmentCache.getByPlate(vehicle_plate);
  if (!shipment) {
    return { skipped: true, reason: '未找到车次' };
  }

  const record = {
    shipment_id: shipment.id,
    vehicle_plate,
    temperature: parseFloat(temperature),
    humidity: humidity ? parseFloat(humidity) : null,
    location_lat: location_lat ? parseFloat(location_lat) : null,
    location_lng: location_lng ? parseFloat(location_lng) : null,
    recorded_at: new Date(),
  };

  temperatureBuffer.add(record);

  broadcastTemperature({
    ...record,
    product_name: shipment.product_name,
    max_temperature: shipment.max_temperature,
    origin: shipment.origin,
    destination: shipment.destination,
  });

  const maxTemp = parseFloat(shipment.max_temperature);
  const currentTemp = parseFloat(temperature);
  const isOverTemp = currentTemp > maxTemp;

  if (isOverTemp && alertDebouncer.shouldTriggerAlert(shipment.id, 'over_temp')) {
    const alert = await alertModel.createAlert({
      shipment_id: shipment.id,
      vehicle_plate,
      alert_type: 'over_temp',
      alert_level: 'danger',
      message: `【断链警告】${shipment.product_name} 温度超过安全线！当前温度 ${temperature}°C，最高允许温度 ${shipment.max_temperature}°C`,
      temperature: currentTemp,
      max_temperature: maxTemp,
    });

    broadcastAlert({
      ...alert,
      product_name: shipment.product_name,
      origin: shipment.origin,
      destination: shipment.destination,
    });

    console.warn(`⚠️  断链警告: ${vehicle_plate} - ${shipment.product_name} 温度超标: ${temperature}°C / ${shipment.max_temperature}°C`);
  }

  return {
    accepted: true,
    is_over_temp: isOverTemp,
    max_temperature: maxTemp,
    buffered: true,
  };
};

const reportTemperatureBatch = async (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return { accepted: 0, errors: [] };
  }

  const results = {
    accepted: 0,
    overTemp: 0,
    skipped: 0,
    alerts: 0,
    errors: [],
  };

  const recordsToBuffer = [];
  const broadcastItems = [];

  for (const item of items) {
    try {
      const { vehicle_plate, temperature, humidity, location_lat, location_lng } = item;

      if (!vehicle_plate || temperature === undefined) {
        results.skipped++;
        results.errors.push({ item, error: '缺少必要字段' });
        continue;
      }

      const shipment = await shipmentCache.getByPlate(vehicle_plate);
      if (!shipment) {
        results.skipped++;
        continue;
      }

      const record = {
        shipment_id: shipment.id,
        vehicle_plate,
        temperature: parseFloat(temperature),
        humidity: humidity ? parseFloat(humidity) : null,
        location_lat: location_lat ? parseFloat(location_lat) : null,
        location_lng: location_lng ? parseFloat(location_lng) : null,
        recorded_at: item.recorded_at ? new Date(item.recorded_at) : new Date(),
      };

      recordsToBuffer.push(record);
      results.accepted++;

      const maxTemp = parseFloat(shipment.max_temperature);
      const currentTemp = parseFloat(temperature);

      if (currentTemp > maxTemp) {
        results.overTemp++;

        if (alertDebouncer.shouldTriggerAlert(shipment.id, 'over_temp')) {
          const alert = await alertModel.createAlert({
            shipment_id: shipment.id,
            vehicle_plate,
            alert_type: 'over_temp',
            alert_level: 'danger',
            message: `【断链警告】${shipment.product_name} 温度超过安全线！当前温度 ${temperature}°C，最高允许温度 ${shipment.max_temperature}°C`,
            temperature: currentTemp,
            max_temperature: maxTemp,
          });

          broadcastAlert({
            ...alert,
            product_name: shipment.product_name,
            origin: shipment.origin,
            destination: shipment.destination,
          });

          results.alerts++;
        }
      }

      broadcastItems.push({
        ...record,
        product_name: shipment.product_name,
        max_temperature: shipment.max_temperature,
        origin: shipment.origin,
        destination: shipment.destination,
      });
    } catch (error) {
      results.skipped++;
      results.errors.push({ item, error: error.message });
    }
  }

  if (recordsToBuffer.length > 0) {
    temperatureBuffer.add(recordsToBuffer);
  }

  for (const item of broadcastItems) {
    broadcastTemperature(item);
  }

  return results;
};

const getTemperatureHistory = async (shipmentId, limit = 50) => {
  const temperatureRecordModel = require('../models/temperatureRecord');
  return temperatureRecordModel.getTemperatureRecords(shipmentId, limit);
};

const getLatestTemperatures = async () => {
  const temperatureRecordModel = require('../models/temperatureRecord');
  return temperatureRecordModel.getLatestTemperatures();
};

module.exports = {
  reportTemperature,
  reportTemperatureBatch,
  getTemperatureHistory,
  getLatestTemperatures,
};
