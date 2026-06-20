const { pool } = require('../config/db');

const createTables = async () => {
  try {
    console.log('开始创建数据库表...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS shipments (
        id SERIAL PRIMARY KEY,
        shipment_no VARCHAR(50) UNIQUE NOT NULL,
        vehicle_plate VARCHAR(20) NOT NULL,
        product_name VARCHAR(100) NOT NULL,
        product_type VARCHAR(50) NOT NULL,
        max_temperature DECIMAL(5,2) NOT NULL,
        origin VARCHAR(100) NOT NULL,
        destination VARCHAR(100) NOT NULL,
        status VARCHAR(20) DEFAULT 'in_transit',
        departure_time TIMESTAMP,
        estimated_arrival TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ shipments 表创建成功');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS temperature_records (
        id SERIAL PRIMARY KEY,
        shipment_id INTEGER REFERENCES shipments(id) ON DELETE CASCADE,
        vehicle_plate VARCHAR(20) NOT NULL,
        temperature DECIMAL(5,2) NOT NULL,
        humidity DECIMAL(5,2),
        location_lat DECIMAL(10,6),
        location_lng DECIMAL(10,6),
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ temperature_records 表创建成功');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS alerts (
        id SERIAL PRIMARY KEY,
        shipment_id INTEGER REFERENCES shipments(id) ON DELETE CASCADE,
        vehicle_plate VARCHAR(20) NOT NULL,
        alert_type VARCHAR(50) NOT NULL,
        alert_level VARCHAR(20) DEFAULT 'warning',
        message TEXT NOT NULL,
        temperature DECIMAL(5,2),
        max_temperature DECIMAL(5,2),
        is_resolved BOOLEAN DEFAULT FALSE,
        resolved_at TIMESTAMP,
        resolved_note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ alerts 表创建成功');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_temperature_records_shipment ON temperature_records(shipment_id);
      CREATE INDEX IF NOT EXISTS idx_temperature_records_vehicle ON temperature_records(vehicle_plate);
      CREATE INDEX IF NOT EXISTS idx_alerts_shipment ON alerts(shipment_id);
      CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(is_resolved);
    `);
    console.log('✓ 索引创建成功');

    console.log('\n数据库表创建完成！');
  } catch (error) {
    console.error('创建表失败:', error);
    throw error;
  }
};

const seedData = async () => {
  try {
    console.log('\n开始插入初始数据...');

    const result = await pool.query('SELECT COUNT(*) FROM shipments');
    if (parseInt(result.rows[0].count) > 0) {
      console.log('shipments 表已有数据，跳过初始化');
      return;
    }

    const shipments = [
      {
        shipment_no: 'SH20240615001',
        vehicle_plate: '京A·88888',
        product_name: '挪威三文鱼',
        product_type: 'seafood',
        max_temperature: -18.00,
        origin: '上海洋山港',
        destination: '北京朝阳门店',
        status: 'in_transit',
        departure_time: '2024-06-15 06:00:00',
        estimated_arrival: '2024-06-16 18:00:00',
      },
      {
        shipment_no: 'SH20240615002',
        vehicle_plate: '沪B·66666',
        product_name: '丹东草莓',
        product_type: 'fruit',
        max_temperature: 4.00,
        origin: '辽宁丹东',
        destination: '上海浦东店',
        status: 'in_transit',
        departure_time: '2024-06-15 08:00:00',
        estimated_arrival: '2024-06-16 12:00:00',
      },
      {
        shipment_no: 'SH20240615003',
        vehicle_plate: '粤C·99999',
        product_name: '澳洲和牛',
        product_type: 'meat',
        max_temperature: -20.00,
        origin: '广州保税区',
        destination: '深圳南山店',
        status: 'in_transit',
        departure_time: '2024-06-15 05:30:00',
        estimated_arrival: '2024-06-15 20:00:00',
      },
    ];

    for (const s of shipments) {
      await pool.query(
        `INSERT INTO shipments (shipment_no, vehicle_plate, product_name, product_type, max_temperature, origin, destination, status, departure_time, estimated_arrival)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [s.shipment_no, s.vehicle_plate, s.product_name, s.product_type, s.max_temperature, s.origin, s.destination, s.status, s.departure_time, s.estimated_arrival]
      );
    }
    console.log('✓ 初始车次数据插入成功');

    console.log('\n数据初始化完成！');
  } catch (error) {
    console.error('初始化数据失败:', error);
    throw error;
  }
};

const init = async () => {
  try {
    await createTables();
    await seedData();
    console.log('\n🎉 数据库初始化完成！');
    process.exit(0);
  } catch (error) {
    console.error('\n数据库初始化失败:', error);
    process.exit(1);
  }
};

init();
