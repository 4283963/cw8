const Router = require('koa-router');
const alertModel = require('../models/alert');

const router = new Router({ prefix: '/api/alerts' });

router.get('/', async (ctx) => {
  try {
    const { is_resolved, limit, offset } = ctx.query;
    const options = {};

    if (is_resolved !== undefined) {
      options.is_resolved = is_resolved === 'true';
    }
    if (limit) options.limit = parseInt(limit);
    if (offset) options.offset = parseInt(offset);

    const alerts = await alertModel.getAlerts(options);
    ctx.status = 200;
    ctx.body = {
      success: true,
      data: alerts,
    };
  } catch (error) {
    console.error('获取报警列表失败:', error);
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
});

router.get('/unresolved', async (ctx) => {
  try {
    const alerts = await alertModel.getUnresolvedAlerts();
    ctx.status = 200;
    ctx.body = {
      success: true,
      data: alerts,
    };
  } catch (error) {
    console.error('获取未处理报警失败:', error);
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
});

router.patch('/:id/resolve', async (ctx) => {
  try {
    const { id } = ctx.params;
    const { note } = ctx.request.body;
    const alert = await alertModel.resolveAlert(id, note);
    if (alert) {
      ctx.status = 200;
      ctx.body = {
        success: true,
        data: alert,
      };
    } else {
      ctx.status = 404;
      ctx.body = { error: '报警不存在' };
    }
  } catch (error) {
    console.error('处理报警失败:', error);
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
});

module.exports = router;
