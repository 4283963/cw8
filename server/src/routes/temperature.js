const Router = require('koa-router');
const temperatureService = require('../services/temperatureService');
const { streamParseJson } = require('../middleware/streamJsonParser');

const router = new Router({ prefix: '/api/temperature' });

router.post('/report', async (ctx) => {
  try {
    const body = ctx.request.rawBody || ctx.request.body;
    const { vehicle_plate, temperature, humidity, location_lat, location_lng } = body || {};

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

    ctx.status = 202;
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

router.post(
  '/report/batch',
  streamParseJson({
    maxBodySize: 5 * 1024 * 1024,
    maxItemSize: 64 * 1024,
  }),
  async (ctx) => {
    try {
      const items = ctx.request.rawBody || ctx.request.body;

      if (!Array.isArray(items)) {
        ctx.status = 400;
        ctx.body = { error: '批量上报数据必须为数组格式' };
        return;
      }

      if (items.length === 0) {
        ctx.status = 200;
        ctx.body = { success: true, data: { accepted: 0, total: 0 } };
        return;
      }

      const result = await temperatureService.reportTemperatureBatch(items);

      ctx.status = 202;
      ctx.body = {
        success: true,
        data: {
          total: items.length,
          accepted: result.accepted,
          over_temp: result.overTemp,
          alerts: result.alerts,
          skipped: result.skipped,
          buffered: true,
        },
      };
    } catch (error) {
      console.error('批量温度上报失败:', error);
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }
);

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
