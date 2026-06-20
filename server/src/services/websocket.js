const WebSocket = require('ws');

let wss = null;
let clients = new Set();

const initWebSocket = (server) => {
  wss = new WebSocket.Server({ server });

  wss.on('connection', (ws) => {
    console.log('新的 WebSocket 客户端已连接');
    clients.add(ws);

    ws.on('message', (message) => {
      console.log('收到 WebSocket 消息:', message.toString());
    });

    ws.on('close', () => {
      console.log('WebSocket 客户端已断开');
      clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket 错误:', error);
      clients.delete(ws);
    });

    ws.send(JSON.stringify({
      type: 'connection',
      status: 'connected',
      timestamp: new Date().toISOString(),
    }));
  });

  console.log(`WebSocket 服务已启动`);
  return wss;
};

const broadcast = (type, data) => {
  const message = JSON.stringify({
    type,
    data,
    timestamp: new Date().toISOString(),
  });

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

const broadcastAlert = (alert) => {
  broadcast('alert', alert);
};

const broadcastTemperature = (record) => {
  broadcast('temperature', record);
};

const getClientCount = () => clients.size;

module.exports = {
  initWebSocket,
  broadcast,
  broadcastAlert,
  broadcastTemperature,
  getClientCount,
};
