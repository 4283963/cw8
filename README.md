# 生鲜冷链供应链温度监控系统

## 项目概述

本系统是为连锁超市设计的生鲜冷链供应链温度监控系统，实现冷藏车温度实时监控、超温报警、数据可视化等功能。

## 技术栈

### 后端
- **框架**: Koa2
- **数据库**: PostgreSQL
- **实时通信**: WebSocket (ws)
- **语言**: Node.js

### 前端
- **框架**: Vue 3 (Composition API)
- **构建工具**: Vite
- **样式**: Tailwind CSS
- **图表**: ECharts
- **HTTP客户端**: Axios

## 项目结构

```
cw8/
├── server/                    # 后端服务
│   ├── src/
│   │   ├── app.js            # Koa 应用入口
│   │   ├── config/
│   │   │   └── db.js         # 数据库配置
│   │   ├── db/
│   │   │   └── init.js       # 数据库初始化脚本
│   │   ├── models/           # 数据模型
│   │   │   ├── shipment.js
│   │   │   ├── temperatureRecord.js
│   │   │   └── alert.js
│   │   ├── routes/           # 路由
│   │   │   ├── temperature.js
│   │   │   ├── shipments.js
│   │   │   └── alerts.js
│   │   └── services/         # 业务逻辑
│   │       ├── temperatureService.js
│   │       └── websocket.js
│   ├── simulator/
│   │   └── temperature-simulator.js  # 温度传感器模拟器
│   ├── .env
│   └── package.json
│
└── web/                       # 前端应用
    ├── src/
    │   ├── main.js           # 入口文件
    │   ├── App.vue           # 主应用组件
    │   ├── api/
    │   │   └── index.js      # API 接口
    │   ├── components/       # 组件
    │   │   ├── StatHeader.vue
    │   │   ├── VehicleCard.vue
    │   │   ├── AlertModal.vue
    │   │   ├── AlertList.vue
    │   │   └── TemperatureChart.vue
    │   ├── composables/
    │   │   └── useWebSocket.js  # WebSocket 组合式函数
    │   └── style.css         # 全局样式
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── package.json
```

## 数据库表设计

### shipments (车次表)
存储运输车次信息，包括车辆、货物、路线、温度限制等。

### temperature_records (温度记录表)
存储每一次温度上报记录。

### alerts (报警表)
存储温度超标等报警记录。

## 核心功能

### 1. 温度数据上报
- 冷藏车传感器每 10 秒上报一次温度数据
- 后端接收数据并存储到数据库

### 2. 温度安全校验
- 每次上报自动比对该车次的最高允许温度
- 超过安全线则触发报警

### 3. 断链警告
- 温度超标时立即通过 WebSocket 推送到前端
- 前端弹出红色"断链警告"弹窗
- 报警记录存入数据库

### 4. 调度大屏
- 实时显示所有在运车辆温度状态
- 温度异常车辆高亮显示
- 报警记录列表
- 温度趋势图表

## 快速开始

### 前置条件
- Node.js >= 16
- PostgreSQL >= 12

### 1. 数据库准备

创建数据库：
```sql
CREATE DATABASE cold_chain_monitor;
```

### 2. 后端启动

```bash
cd server

# 安装依赖
npm install

# 初始化数据库表和测试数据
npm run init-db

# 启动开发服务
npm run dev
```

后端服务将在 `http://localhost:3000` 启动。

### 3. 前端启动

```bash
cd web

# 安装依赖
npm install

# 启动开发服务
npm run dev
```

前端将在 `http://localhost:5173` 启动。

### 4. 运行温度传感器模拟器

```bash
cd server
node simulator/temperature-simulator.js
```

模拟器会模拟 3 辆冷藏车每 10 秒上报温度，随机触发超温报警。

## API 接口

### 温度相关
- `POST /api/temperature/report` - 上报温度数据
- `GET /api/temperature/latest` - 获取最新温度
- `GET /api/temperature/history/:shipmentId` - 获取温度历史

### 车次相关
- `GET /api/shipments` - 获取车次列表
- `GET /api/shipments/:id` - 获取车次详情
- `POST /api/shipments` - 创建车次
- `PATCH /api/shipments/:id/status` - 更新车次状态

### 报警相关
- `GET /api/alerts` - 获取报警列表
- `GET /api/alerts/unresolved` - 获取未处理报警
- `PATCH /api/alerts/:id/resolve` - 处理报警

## WebSocket 消息

### 连接
连接地址: `ws://localhost:3000`

### 消息类型
- `connection` - 连接状态
- `temperature` - 温度更新
- `alert` - 报警通知
