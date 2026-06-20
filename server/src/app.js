const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');
const http = require('http');
require('dotenv').config();

const { initWebSocket, getClientCount } = require('./services/websocket');
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

app.use(bodyParser());

app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`${ctx.method} ${ctx.url} - ${ctx.status} - ${ms}ms`);
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
    };
  }
});

const server = http.createServer(app.callback());

initWebSocket(server);

server.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════════╗
  ║                                                       ║
  ║  🥶 生鲜冷链供应链温度监控系统 - 后端服务               ║
  ║                                                       ║
  ║  🌐 HTTP 服务:  http://localhost:${PORT}               ║
  ║  🔌 WebSocket:  ws://localhost:${PORT}                 ║
  ║                                                       ║
  ╚═══════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
