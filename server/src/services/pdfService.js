const PDFDocument = require('pdfkit');
const { TRACEABILITY_THRESHOLD } = require('../models/traceability');

const PRODUCT_TYPE_LABELS = {
  seafood: '海鲜水产',
  fruit: '鲜果蔬菜',
  meat: '肉类制品',
  dairy: '乳制品',
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const formatDuration = (seconds) => {
  if (!seconds || seconds < 0) return '0 秒';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h} 小时 ${m} 分 ${s} 秒`;
  if (m > 0) return `${m} 分 ${s} 秒`;
  return `${s} 秒`;
};

const buildMapLink = (lat, lng) => {
  if (!lat || !lng) return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
};

const generateTraceabilityReport = (data) => {
  return new Promise((resolve, reject) => {
    try {
      const { shipment, summary, segments, threshold } = data;

      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        bufferPages: true,
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 50;
      const contentWidth = pageWidth - margin * 2;

      doc
        .fillColor('#dc2626')
        .rect(0, 0, pageWidth, 100)
        .fill();

      doc
        .fillColor('#ffffff')
        .fontSize(22)
        .font('Helvetica-Bold')
        .text('生鲜冷链断链责任追溯报告', margin, 35, { width: contentWidth });

      doc
        .fontSize(10)
        .fillColor('#fecaca')
        .text('Cold Chain Break Responsibility Traceability Report', margin, 65, { width: contentWidth });

      doc.moveDown(3);

      doc
        .fillColor('#0f172a')
        .fontSize(11)
        .font('Helvetica')
        .text(`报告生成时间: ${formatDateTime(new Date())}`, margin, doc.y);
      doc.text(`追溯标准温度: 超过 ${threshold}°C`, margin, doc.y + 4);
      doc.text(`报告编号: TR-${shipment.id}-${Date.now()}`, margin, doc.y + 4);

      doc.moveDown(1.5);

      doc
        .fillColor('#dc2626')
        .rect(margin, doc.y, contentWidth, 1)
        .fill();

      doc.moveDown(1);

      doc
        .fillColor('#1e3a8a')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('一、车次基本信息', margin, doc.y);

      doc.moveDown(0.5);

      const infoRows = [
        ['车次编号', shipment.shipment_no || '--'],
        ['车牌号码', shipment.vehicle_plate || '--'],
        ['生鲜品类', shipment.product_name || '--'],
        ['品类类型', PRODUCT_TYPE_LABELS[shipment.product_type] || shipment.product_type || '--'],
        ['安全温度上限', `${shipment.max_temperature}°C`],
        ['起点', shipment.origin || '--'],
        ['终点', shipment.destination || '--'],
        ['发车时间', formatDateTime(shipment.departure_time)],
        ['预计到达', formatDateTime(shipment.estimated_arrival)],
      ];

      let yPos = doc.y;
      const labelWidth = 130;
      const valueWidth = contentWidth - labelWidth;

      infoRows.forEach(([label, value]) => {
        doc
          .fillColor('#475569')
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(label, margin, yPos, { width: labelWidth });

        doc
          .fillColor('#0f172a')
          .font('Helvetica')
          .text(value, margin + labelWidth, yPos, { width: valueWidth });

        yPos += 18;
      });

      doc.moveDown(1);

      doc
        .fillColor('#1e3a8a')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('二、今日温度统计摘要', margin, doc.y);

      doc.moveDown(0.5);

      const totalReports = summary.total_reports || 0;
      const overTempCount = summary.over_temp_count || 0;
      const maxTemp = summary.max_temp_today ? parseFloat(summary.max_temp_today).toFixed(1) : '--';
      const minTemp = summary.min_temp_today ? parseFloat(summary.min_temp_today).toFixed(1) : '--';
      const avgTemp = summary.avg_temp_today ? parseFloat(summary.avg_temp_today).toFixed(2) : '--';
      const overTempRatio = totalReports > 0 ? ((overTempCount / totalReports) * 100).toFixed(1) : '0';

      const summaryRows = [
        ['今日总上报次数', `${totalReports} 次`],
        ['超温记录次数', `${overTempCount} 次`],
        ['超温占比', `${overTempRatio}%`],
        ['今日最高温度', `${maxTemp}°C`],
        ['今日最低温度', `${minTemp}°C`],
        ['今日平均温度', `${avgTemp}°C`],
        ['首次上报时间', formatDateTime(summary.first_report_time)],
        ['最近上报时间', formatDateTime(summary.last_report_time)],
      ];

      yPos = doc.y;
      summaryRows.forEach(([label, value]) => {
        const isOverTempRow = label.includes('超温');
        doc
          .fillColor(isOverTempRow ? '#dc2626' : '#475569')
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(label, margin, yPos, { width: labelWidth });

        doc
          .fillColor(isOverTempRow ? '#dc2626' : '#0f172a')
          .font('Helvetica')
          .text(value, margin + labelWidth, yPos, { width: valueWidth });

        yPos += 18;
      });

      doc.moveDown(1);

      doc
        .fillColor('#1e3a8a')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('三、超温时间段与 GPS 轨迹', margin, doc.y);

      doc.moveDown(0.5);

      doc
        .fillColor('#64748b')
        .fontSize(9)
        .font('Helvetica-Oblique')
        .text(
          `以下列出今日温度超过 ${threshold}°C 的所有时间段，包含每个时间点的 GPS 坐标和地图定位链接，供责任追溯使用。`,
          margin,
          doc.y,
          { width: contentWidth }
        );

      doc.moveDown(0.8);

      if (segments.length === 0) {
        doc
          .fillColor('#16a34a')
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('今日未检测到超过追溯标准的温度记录，冷链状态良好。', margin, doc.y);
      } else {
        segments.forEach((segment, index) => {
          if (doc.y > pageHeight - 200) {
            doc.addPage();
          }

          const segY = doc.y;

          doc
            .fillColor('#fee2e2')
            .rect(margin, segY, contentWidth, 28)
            .fill();

          doc
            .fillColor('#dc2626')
            .fontSize(11)
            .font('Helvetica-Bold')
            .text(
              `超温时段 ${index + 1}:  ${formatDateTime(segment.start_time)}  ~  ${formatDateTime(segment.end_time)}`,
              margin + 8,
              segY + 8,
              { width: contentWidth - 16 }
            );

          doc.y = segY + 38;

          const segInfo = [
            ['持续时间', formatDuration(segment.duration_seconds)],
            ['最高温度', `${segment.max_temperature}°C`],
            ['平均温度', `${segment.avg_temperature}°C`],
            ['数据点数', `${segment.records.length} 条`],
          ];

          let infoY = doc.y;
          segInfo.forEach(([label, value]) => {
            doc
              .fillColor('#475569')
              .fontSize(9)
              .font('Helvetica-Bold')
              .text(label, margin, infoY, { width: 100 });

            doc
              .fillColor('#dc2626')
              .font('Helvetica')
              .text(value, margin + 100, infoY, { width: 200 });

            infoY += 16;
          });

          doc.y = infoY + 4;

          doc
            .fillColor('#1e3a8a')
            .fontSize(10)
            .font('Helvetica-Bold')
            .text('GPS 位置轨迹:', margin, doc.y);

          doc.moveDown(0.3);

          const maxPoints = Math.min(segment.records.length, 10);
          for (let i = 0; i < maxPoints; i++) {
            if (doc.y > pageHeight - 80) {
              doc.addPage();
            }

            const record = segment.records[i];
            const mapLink = buildMapLink(record.location_lat, record.location_lng);

            const pointY = doc.y;
            doc
              .fillColor('#f59e0b')
              .circle(margin + 4, pointY + 6, 3)
              .fill();

            doc
              .fillColor('#0f172a')
              .fontSize(8)
              .font('Helvetica')
              .text(
                `${formatDateTime(record.recorded_at)}  |  温度: ${record.temperature}°C`,
                margin + 14,
                pointY,
                { width: 250 }
              );

            if (record.location_lat && record.location_lng) {
              doc
                .fillColor('#2563eb')
                .font('Helvetica-Oblique')
                .text(
                  `GPS: ${record.location_lat}, ${record.location_lng}`,
                  margin + 14,
                  pointY + 12,
                  { width: 250 }
                );

              doc
                .fillColor('#2563eb')
                .fontSize(8)
                .font('Helvetica-Oblique')
                .text(
                  '地图定位链接 (点击查看司机位置):',
                  margin + 280,
                  pointY,
                  { width: contentWidth - 280, continued: true }
                )
                .fillColor('#1d4ed8')
                .text(mapLink, { link: mapLink, underline: true });
            } else {
              doc
                .fillColor('#94a3b8')
                .fontSize(8)
                .font('Helvetica-Oblique')
                .text('GPS: 无定位数据', margin + 280, pointY, { width: contentWidth - 280 });
            }

            doc.y = pointY + 26;
          }

          if (segment.records.length > maxPoints) {
            doc
              .fillColor('#64748b')
              .fontSize(8)
              .font('Helvetica-Oblique')
              .text(`... 其余 ${segment.records.length - maxPoints} 条记录已省略`, margin + 14, doc.y);
            doc.moveDown(0.3);
          }

          doc.moveDown(0.8);
        });
      }

      if (doc.y > pageHeight - 150) {
        doc.addPage();
      }

      doc.moveDown(1);
      doc
        .fillColor('#dc2626')
        .rect(margin, doc.y, contentWidth, 1)
        .fill();

      doc.moveDown(1);
      doc
        .fillColor('#1e3a8a')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('四、责任追溯结论', margin, doc.y);

      doc.moveDown(0.5);

      const totalOverTempSeconds = segments.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
      const conclusion = segments.length === 0
        ? `经核查，车牌号 ${shipment.vehicle_plate} 运输的 ${shipment.product_name} 在今日运输过程中，未出现温度超过 ${threshold}°C 的异常情况，冷链环节完整，无断链责任问题。`
        : `经核查，车牌号 ${shipment.vehicle_plate} 运输的 ${shipment.product_name} 在今日运输过程中，共出现 ${segments.length} 段温度超过 ${threshold}°C 的异常情况，累计超温时长 ${formatDuration(totalOverTempSeconds)}。根据《冷链物流管理规范》，该批货物存在断链风险，需追究相关运输环节责任。建议结合上述 GPS 轨迹定位司机位置，核实超温时段车辆是否处于异常停车、开门或设备故障状态。`;

      doc
        .fillColor('#0f172a')
        .fontSize(10)
        .font('Helvetica')
        .text(conclusion, margin, doc.y, {
          width: contentWidth,
          align: 'justify',
          lineGap: 4,
        });

      doc.moveDown(1.5);

      const signY = doc.y;
      doc
        .fillColor('#475569')
        .fontSize(10)
        .font('Helvetica')
        .text('报告生成人: _______________', margin, signY)
        .text('运输方签收: _______________', margin + 200, signY);

      doc.text('审核人: _______________', margin, signY + 30)
        .text('日期: _______________', margin + 200, signY + 30);

      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc
          .fillColor('#94a3b8')
          .fontSize(8)
          .font('Helvetica')
          .text(
            `第 ${i + 1} / ${range.count} 页  |  生鲜冷链温度监控系统自动生成  |  报告编号 TR-${shipment.id}`,
            margin,
            pageHeight - 40,
            { width: contentWidth, align: 'center' }
          );
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateTraceabilityReport,
};
