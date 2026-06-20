const temperatureRecordModel = require('../models/temperatureRecord');
const shipmentModel = require('../models/shipment');
const alertModel = require('../models/alert');
const { broadcastAlert, broadcastTemperature } = require('./websocket');

const reportTemperature = async (data) => {
  const { vehicle_plate, temperature, humidity, location_lat, location_lng } = data;

  const shipment = await shipmentModel.getShipmentByPlate(vehicle_plate);
  if (!shipment) {
    throw new Error(`未找到车牌号 ${vehicle_plate} 的在运车次`);
  }

  const record = await temperatureRecordModel.createTemperatureRecord({
    shipment_id: shipment.id,
    vehicle_plate,
    temperature,
    humidity,
    location_lat,
    location_lng,
  });

  broadcastTemperature({
    ...record,
    product_name: shipment.product_name,
    max_temperature: shipment.max_temperature,
    origin: shipment.origin,
    destination: shipment.destination,
  });

  const maxTemp = parseFloat(shipment.max_temperature);
  const currentTemp = parseFloat(temperature);

  if (currentTemp > maxTemp) {
    const hasRecentAlert = await alertModel.hasRecentUnresolvedAlert(shipment.id, 'over_temp', 5);
    if (!hasRecentAlert) {
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
  }

  return {
    record,
    is_over_temp: currentTemp > maxTemp,
    max_temperature: maxTemp,
  };
};

const getTemperatureHistory = async (shipmentId, limit = 50) => {
  return await temperatureRecordModel.getTemperatureRecords(shipmentId, limit);
};

const getLatestTemperatures = async () => {
  return await temperatureRecordModel.getLatestTemperatures();
};

module.exports = {
  reportTemperature,
  getTemperatureHistory,
  getLatestTemperatures,
};
