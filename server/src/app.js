const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');
const http = require('http');
require('dotenv').config();

const { initWebSocket, getClientCount } = require('./services/websocket');
const { temperatureBuffer } = require('./services/temperatureBulkBuffer');
const { shipmentCache } = require('./services/shipmentCache');
const { globalRateLimiter } = require('./middleware/rateLimiter');
const temperatureRoutes = require('./routes/temperature');
const shipmentRoutes = require('./routes/shipments');
const alertRoutes = require('./routes/alerts');

const app = new Koa();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));

app.use(globalRateLimiter.middleware());

app.use(bodyParser({
  jsonLimit: '1mb',
  formLimit: '56kb',
  textLimit: '56kb',
  strict: true,
}));

app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  if (ctx.path !== '/api/health' && !ctx.path.startsWith('/api/temperature')) {
    console.log(`${ctx.method} ${ctx.url} - ${ctx.status} - ${ms}ms`);
  }
});

app.use(temperatureRoutes.routes());
app.use(temperatureRoutes.allowedMethods());
app.use(shipmentRoutes.routes());
app.use(shipmentRoutes.allowedMethods());
app.use(alertRoutes.routes());
app.use(alertRoutes.allowedMethods());

app.use(async (ctx) => {
  if (ctx.path === '/api/health') {
    ctx.status = 200;
    ctx.body = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      ws_clients: getClientCount(),
      buffer_stats: temperatureBuffer.getStats(),
      cache_stats: shipmentCache.getStats(),
      rate_limit_stats: globalRateLimiter.getStats(),
    };
  }
});

const server = http.createServer(app.callback());

initWebSocket(server);

temperatureBuffer.start();
shipmentCache.start();
globalRateLimiter.start();

const gracefulShutdown = (signal) => {
  console.log(`\n收到 ${signal} 信号，开始优雅关闭...`);

  server.close(() => {
    console.log('HTTP 服务器已关闭');
  });

  temperatureBuffer.stop();
  shipmentCache.stop();
  globalRateLimiter.stop();

  setTimeout(() => {
    console.log('服务已完全关闭');
    process.exit(0);
  }, 3000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason);
});

server.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════════╗
  ║                                                       ║
  ║  🥶 生鲜冷链供应链温度监控系统 - 后端服务               ║
  ║                                                       ║
  ║  🌐 HTTP 服务:  http://localhost:${PORT}               ║
  ║  🔌 WebSocket:  ws://localhost:${PORT}                 ║
  ║  📦 批量上报:  POST /api/temperature/report/batch     ║
  ║                                                       ║
  ║  ✨ 已启用: 流式解析 | 批量写入 | 缓存 | 限流           ║
  ║                                                       ║
  ╚═══════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
