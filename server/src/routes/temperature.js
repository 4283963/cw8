const Router = require('koa-router');
const temperatureService = require('../services/temperatureService');

const router = new Router({ prefix: '/api/temperature' });

router.post('/report', async (ctx) => {
  try {
    const { vehicle_plate, temperature, humidity, location_lat, location_lng } = ctx.request.body;

    if (!vehicle_plate || temperature === undefined) {
      ctx.status = 400;
      ctx.body = { error: '车牌号和温度为必填项' };
      return;
    }

    const result = await temperatureService.reportTemperature({
      vehicle_plate,
      temperature,
      humidity,
      location_lat,
      location_lng,
    });

    ctx.status = 200;
    ctx.body = {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('温度上报失败:', error);
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
});

router.get('/latest', async (ctx) => {
  try {
    const records = await temperatureService.getLatestTemperatures();
    ctx.status = 200;
    ctx.body = {
      success: true,
      data: records,
    };
  } catch (error) {
    console.error('获取最新温度失败:', error);
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
});

router.get('/history/:shipmentId', async (ctx) => {
  try {
    const { shipmentId } = ctx.params;
    const limit = parseInt(ctx.query.limit) || 50;

    const records = await temperatureService.getTemperatureHistory(shipmentId, limit);
    ctx.status = 200;
    ctx.body = {
      success: true,
      data: records,
    };
  } catch (error) {
    console.error('获取温度历史失败:', error);
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
});

module.exports = router;
