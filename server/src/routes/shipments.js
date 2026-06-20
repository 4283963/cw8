const Router = require('koa-router');
const shipmentModel = require('../models/shipment');

const router = new Router({ prefix: '/api/shipments' });

router.get('/', async (ctx) => {
  try {
    const { status } = ctx.query;
    const shipments = await shipmentModel.getShipments(status);
    ctx.status = 200;
    ctx.body = {
      success: true,
      data: shipments,
    };
  } catch (error) {
    console.error('获取车次列表失败:', error);
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
});

router.get('/:id', async (ctx) => {
  try {
    const { id } = ctx.params;
    const shipment = await shipmentModel.getShipmentById(id);
    if (!shipment) {
      ctx.status = 200;
      ctx.body = {
        success: true,
        data: shipment,
      };
    } else {
      ctx.status = 404;
      ctx.body = { error: '车次不存在' };
    }
  } catch (error) {
    console.error('获取车次详情失败:', error);
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
});

router.post('/', async (ctx) => {
  try {
    const data = ctx.request.body;
    const shipment = await shipmentModel.createShipment(data);
    ctx.status = 201;
    ctx.body = {
      success: true,
      data: shipment,
    };
  } catch (error) {
    console.error('创建车次失败:', error);
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
});

router.patch('/:id/status', async (ctx) => {
  try {
    const { id } = ctx.params;
    const { status } = ctx.request.body;
    const shipment = await shipmentModel.updateShipmentStatus(id, status);
    if (shipment) {
      ctx.status = 200;
      ctx.body = {
        success: true,
        data: shipment,
      };
    } else {
      ctx.status = 404;
      ctx.body = { error: '车次不存在' };
    }
  } catch (error) {
    console.error('更新车次状态失败:', error);
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
});

module.exports = router;
