const http = require('http');

const API_HOST = 'localhost';
const API_PORT = 3000;
const REPORT_INTERVAL = 10000;

const vehicles = [
  {
    vehicle_plate: '京A·88888',
    product: '挪威三文鱼',
    base_temp: -20,
    fluctuation: 1.5,
    currentTemp: -20,
    triggerAlarm: false,
    alarmStartCounter: 0,
  },
  {
    vehicle_plate: '沪B·66666',
    product: '丹东草莓',
    base_temp: 2,
    fluctuation: 1,
    currentTemp: 2,
    triggerAlarm: false,
    alarmStartCounter: 0,
  },
  {
    vehicle_plate: '粤C·99999',
    product: '澳洲和牛',
    base_temp: -22,
    fluctuation: 1.5,
    currentTemp: -22,
    triggerAlarm: false,
    alarmStartCounter: 0,
  },
];

let reportCount = 0;

const reportTemperature = (vehicle) => {
  const fluctuation = (Math.random() - 0.5) * 2 * vehicle.fluctuation;

  if (vehicle.triggerAlarm) {
    vehicle.alarmStartCounter++;
    if (vehicle.alarmStartCounter <= 6) {
      vehicle.currentTemp = vehicle.base_temp + 3 + Math.random() * 2;
    } else {
      vehicle.triggerAlarm = false;
      vehicle.alarmStartCounter = 0;
      vehicle.currentTemp = vehicle.base_temp + fluctuation;
      console.log(`  ↳ ${vehicle.vehicle_plate} 温度恢复正常`);
    }
  } else {
    vehicle.currentTemp = vehicle.base_temp + fluctuation;

    if (Math.random() < 0.05) {
      vehicle.triggerAlarm = true;
      console.log(`  ⚠️  ${vehicle.vehicle_plate} 温度开始异常上升！`);
    }
  }

  const data = JSON.stringify({
    vehicle_plate: vehicle.vehicle_plate,
    temperature: vehicle.currentTemp.toFixed(2),
    humidity: (85 + Math.random() * 10).toFixed(1),
    location_lat: (31.2304 + (Math.random() - 0.5) * 10).toFixed(6),
    location_lng: (121.4737 + (Math.random() - 0.5) * 10).toFixed(6),
  });

  const options = {
    hostname: API_HOST,
    port: API_PORT,
    path: '/api/temperature/report',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    },
  };

  const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });
    res.on('end', () => {
      if (res.statusCode !== 200) {
        console.error(`  ❌ 上报失败: ${vehicle.vehicle_plate} - ${res.statusCode} - ${body}`);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`  ❌ 连接失败: ${e.message}`);
  });

  req.write(data);
  req.end();
};

const runSimulation = () => {
  console.log('\n' + '═'.repeat(60));
  console.log('  🌡️  温度传感器模拟器 - 生鲜冷链监控系统');
  console.log('═'.repeat(60));
  console.log(`  上报地址: http://${API_HOST}:${API_PORT}/api/temperature/report`);
  console.log(`  上报间隔: ${REPORT_INTERVAL / 1000} 秒`);
  console.log(`  模拟车辆: ${vehicles.length} 辆`);
  console.log('─'.repeat(60));
  vehicles.forEach((v) => {
    console.log(`  • ${v.vehicle_plate} - ${v.product} (基准温度: ${v.base_temp}°C)`);
  });
  console.log('═'.repeat(60) + '\n');

  setInterval(() => {
    reportCount++;
    const time = new Date().toLocaleTimeString('zh-CN');
    console.log(`[${time}] 第 ${reportCount} 轮上报 (每辆车)`);

    vehicles.forEach((vehicle) => {
      reportTemperature(vehicle);
      const status = vehicle.triggerAlarm ? '🔴 异常' : '🟢 正常';
      console.log(`  ${status} ${vehicle.vehicle_plate}: ${vehicle.currentTemp.toFixed(2)}°C`);
    });
    console.log();
  }, REPORT_INTERVAL);

  console.log('  模拟已开始，每 10 秒上报一次温度数据...\n');
};

runSimulation();
