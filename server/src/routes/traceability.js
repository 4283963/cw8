const Router = require('koa-router');
const shipmentModel = require('../models/shipment');
const traceabilityModel = require('../models/traceability');
const { generateTraceabilityReport } = require('../services/pdfService');

const router = new Router({ prefix: '/api/traceability' });

router.get('/timeline/:shipmentId', async (ctx) => {
  try {
    const { shipmentId } = ctx.params;
    const threshold = parseFloat(ctx.query.threshold) || traceabilityModel.TRACEABILITY_THRESHOLD;
    const date = ctx.query.date || null;

    const shipment = await shipmentModel.getShipmentById(shipmentId);
    if (!shipment) {
      ctx.status = 404;
      ctx.body = { error: '车次不存在' };
      return;
    }

    const [summary, segments] = await Promise.all([
      traceabilityModel.getShipmentSummary(shipmentId, { threshold, date }),
      traceabilityModel.getOverTempSegments(shipmentId, { threshold, date }),
    ]);

    ctx.status = 200;
    ctx.body = {
      success: true,
      data: {
        shipment,
        threshold,
        date: date || new Date().toISOString().split('T')[0],
        summary: {
          total_reports: parseInt(summary.total_reports) || 0,
          over_temp_count: parseInt(summary.over_temp_count) || 0,
          max_temp_today: summary.max_temp_today ? parseFloat(summary.max_temp_today).toFixed(1) : null,
          min_temp_today: summary.min_temp_today ? parseFloat(summary.min_temp_today).toFixed(1) : null,
          avg_temp_today: summary.avg_temp_today ? parseFloat(summary.avg_temp_today).toFixed(2) : null,
          first_report_time: summary.first_report_time,
          last_report_time: summary.last_report_time,
        },
        segments,
      },
    };
  } catch (error) {
    console.error('获取追溯时间轴失败:', error);
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
});

router.get('/report/:shipmentId', async (ctx) => {
  try {
    const { shipmentId } = ctx.params;
    const threshold = parseFloat(ctx.query.threshold) || traceabilityModel.TRACEABILITY_THRESHOLD;
    const date = ctx.query.date || null;

    const shipment = await shipmentModel.getShipmentById(shipmentId);
    if (!shipment) {
      ctx.status = 404;
      ctx.body = { error: '车次不存在' };
      return;
    }

    const [summary, segments] = await Promise.all([
      traceabilityModel.getShipmentSummary(shipmentId, { threshold, date }),
      traceabilityModel.getOverTempSegments(shipmentId, { threshold, date }),
    ]);

    const pdfBuffer = await generateTraceabilityReport({
      shipment,
      summary: {
        ...summary,
        total_reports: parseInt(summary.total_reports) || 0,
        over_temp_count: parseInt(summary.over_temp_count) || 0,
      },
      segments,
      threshold,
    });

    const safePlate = (shipment.vehicle_plate || 'unknown').replace(/[^\w\u4e00-\u9fa5]/g, '');
    const filename = encodeURIComponent(`冷链追溯报告_${safePlate}_${new Date().toISOString().split('T')[0]}.pdf`);

    ctx.status = 200;
    ctx.set('Content-Type', 'application/pdf');
    ctx.set('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
    ctx.set('Content-Length', pdfBuffer.length.toString());
    ctx.set('Cache-Control', 'no-cache');
    ctx.body = pdfBuffer;
  } catch (error) {
    console.error('生成追溯报告失败:', error);
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
});

module.exports = router;
