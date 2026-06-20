const WebSocket = require('ws');

let wss = null;
let clients = new Set();

let temperatureBatch = [];
let temperatureBatchTimer = null;
const BATCH_INTERVAL = 500;
const MAX_BATCH_SIZE = 50;

const initWebSocket = (server) => {
  wss = new WebSocket.Server({
    server,
    clientTracking: true,
    maxPayload: 1024 * 1024,
  });

  wss.on('connection', (ws) => {
    console.log('新的 WebSocket 客户端已连接，当前连接数:', wss.clients.size);
    clients.add(ws);

    ws.isAlive = true;
    ws.backpressure = false;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', () => {
    });

    ws.on('close', () => {
      clients.delete(ws);
      console.log('WebSocket 客户端已断开，当前连接数:', wss.clients.size);
    });

    ws.on('error', (error) => {
      console.error('WebSocket 错误:', error.message);
      ws.isAlive = false;
      clients.delete(ws);
      try {
        ws.close();
      } catch (e) {}
    });

    safeSend(ws, JSON.stringify({
      type: 'connection',
      data: { status: 'connected', client_count: wss.clients.size },
      timestamp: new Date().toISOString(),
    }));
  });

  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        clients.delete(ws);
        try {
          ws.terminate();
        } catch (e) {}
        return;
      }

      ws.isAlive = false;
      try {
        ws.ping();
      } catch (e) {
        clients.delete(ws);
      }
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(heartbeat);
    clearInterval(temperatureBatchTimer);
  });

  startTemperatureBatching();

  console.log(`WebSocket 服务已启动`);
  return wss;
};

const safeSend = (ws, message) => {
  if (ws.readyState !== WebSocket.OPEN) {
    return false;
  }

  if (ws.backpressure) {
    return false;
  }

  try {
    ws.send(message, (error) => {
      if (error) {
        console.error('WebSocket 发送失败:', error.message);
        ws.backpressure = true;
        setTimeout(() => {
          ws.backpressure = false;
        }, 1000);
      }
    });
    return true;
  } catch (e) {
    console.error('WebSocket 发送异常:', e.message);
    return false;
  }
};

const startTemperatureBatching = () => {
  if (temperatureBatchTimer) return;

  temperatureBatchTimer = setInterval(() => {
    if (temperatureBatch.length === 0) return;

    const batch = temperatureBatch.splice(0, MAX_BATCH_SIZE);
    const message = JSON.stringify({
      type: 'temperature_batch',
      data: batch,
      timestamp: new Date().toISOString(),
    });

    broadcastRaw(message);
  }, BATCH_INTERVAL);

  temperatureBatchTimer.unref();
};

const broadcastRaw = (message) => {
  let sentCount = 0;
  let failedCount = 0;

  clients.forEach((client) => {
    if (safeSend(client, message)) {
      sentCount++;
    } else {
      failedCount++;
    }
  });

  if (failedCount > 0) {
    console.log(`广播完成: 成功 ${sentCount}，失败/跳过 ${failedCount}`);
  }
};

const broadcast = (type, data) => {
  const message = JSON.stringify({
    type,
    data,
    timestamp: new Date().toISOString(),
  });

  broadcastRaw(message);
};

const broadcastAlert = (alert) => {
  broadcast('alert', alert);
};

const broadcastTemperature = (record) => {
  temperatureBatch.push(record);

  if (temperatureBatch.length >= MAX_BATCH_SIZE * 2) {
    temperatureBatch = temperatureBatch.slice(-MAX_BATCH_SIZE);
  }
};

const getClientCount = () => clients.size;

module.exports = {
  initWebSocket,
  broadcast,
  broadcastAlert,
  broadcastTemperature,
  getClientCount,
  broadcastRaw,
};
