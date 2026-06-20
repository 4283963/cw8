const http = require('http');

const API_HOST = 'localhost';
const API_PORT = 3000;

const vehicles = [];
for (let i = 0; i < 200; i++) {
  const plateNum = String(i).padStart(5, '0');
  vehicles.push({
    vehicle_plate: `京X·${plateNum}`,
    product: `测试商品-${i}`,
    base_temp: -18,
    fluctuation: 2,
  });
}

let totalRequests = 0;
let successCount = 0;
let failCount = 0;
let startTime = Date.now();
let memoryLogInterval = null;

const generateBatch = (batchSize) => {
  const batch = [];
  for (let i = 0; i < batchSize; i++) {
    const vehicle = vehicles[i % vehicles.length];
    const temp = vehicle.base_temp + (Math.random() - 0.5) * 2 * vehicle.fluctuation;
    batch.push({
      vehicle_plate: vehicle.vehicle_plate,
      temperature: temp.toFixed(2),
      humidity: (80 + Math.random() * 15).toFixed(1),
      location_lat: (31.2304 + (Math.random() - 0.5) * 5).toFixed(6),
      location_lng: (121.4737 + (Math.random() - 0.5) * 5).toFixed(6),
    });
  }
  return batch;
};

const sendBatchRequest = (batchSize) => {
  return new Promise((resolve, reject) => {
    const items = generateBatch(batchSize);
    const data = JSON.stringify(items);

    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: '/api/temperature/report/batch',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
      timeout: 10000,
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        totalRequests++;
        if (res.statusCode === 202) {
          successCount++;
        } else {
          failCount++;
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      totalRequests++;
      failCount++;
      reject(e);
    });

    req.on('timeout', () => {
      req.destroy();
    });

    req.write(data);
    req.end();
  });
};

const printStats = () => {
  const elapsed = (Date.now() - startTime) / 1000;
  const rps = (totalRequests / elapsed).toFixed(1);
  const mem = process.memoryUsage();
  const heapMB = (mem.heapUsed / 1024 / 1024).toFixed(1);
  const heapTotalMB = (mem.heapTotal / 1024 / 1024).toFixed(1);

  console.log(
    `[${new Date().toLocaleTimeString('zh-CN')}] ` +
    `请求: ${totalRequests} | ` +
    `成功: ${successCount} | ` +
    `失败: ${failCount} | ` +
    `QPS: ${rps} | ` +
    `内存: ${heapMB}MB / ${heapTotalMB}MB`
  );
};

const runHighPressureTest = async () => {
  console.log('\n' + '═'.repeat(70));
  console.log('  🔥 高压压力测试 - 生鲜冷链温度监控系统');
  console.log('═'.repeat(70));
  console.log(`  目标地址: http://${API_HOST}:${API_PORT}/api/temperature/report/batch`);
  console.log(`  模拟车辆: ${vehicles.length} 辆`);
  console.log(`  批量大小: 100 条/请求`);
  console.log('─'.repeat(70));

  memoryLogInterval = setInterval(printStats, 2000);

  const concurrency = 10;
  const batchSize = 100;
  let requestCount = 0;
  const maxRequests = 10000;

  console.log('\n开始高压测试...\n');

  const worker = async () => {
    while (requestCount < maxRequests) {
      requestCount++;
      try {
        await sendBatchRequest(batchSize);
      } catch (e) {
      }
      await new Promise((r) => setTimeout(r, 10));
    }
  };

  const workers = Array(concurrency).fill(null).map(() => worker());
  await Promise.all(workers);

  clearInterval(memoryLogInterval);

  console.log('\n' + '─'.repeat(70));
  console.log('  ✅ 测试完成');
  console.log('─'.repeat(70));
  printStats();
  console.log('═'.repeat(70) + '\n');

  process.exit(0);
};

const checkHealth = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: '/api/health',
      method: 'GET',
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
};

const runHealthCheck = async () => {
  try {
    const health = await checkHealth();
    console.log('\n📊 服务健康状态:');
    console.log(JSON.stringify(health, null, 2));
  } catch (e) {
    console.error('❌ 健康检查失败:', e.message);
  }
};

const mode = process.argv[2] || 'test';

if (mode === 'health') {
  runHealthCheck();
} else if (mode === 'test') {
  runHighPressureTest();
} else {
  console.log('使用方式:');
  console.log('  node pressure-test.js health    # 健康检查');
  console.log('  node pressure-test.js test      # 高压测试');
}
