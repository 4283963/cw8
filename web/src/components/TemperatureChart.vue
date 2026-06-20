<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import { getTemperatureHistory } from '../api'

const props = defineProps({
  shipment: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['close'])

const chartRef = ref(null)
let chartInstance = null
const historyData = ref([])
const loading = ref(true)

const loadHistory = async () => {
  loading.value = true
  try {
    const res = await getTemperatureHistory(props.shipment.id, 100)
    historyData.value = res.data || []
    await nextTick()
    initChart()
  } catch (error) {
    console.error('加载温度历史失败:', error)
  } finally {
    loading.value = false
  }
}

const initChart = () => {
  if (!chartRef.value) return

  if (chartInstance) {
    chartInstance.dispose()
  }

  chartInstance = echarts.init(chartRef.value, 'dark')

  const times = historyData.value.map((d) => {
    const date = new Date(d.recorded_at)
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  })
  const temps = historyData.value.map((d) => parseFloat(d.temperature))
  const maxTemp = parseFloat(props.shipment.max_temperature)

  const option = {
    backgroundColor: 'transparent',
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(30, 41, 59, 0.9)',
      borderColor: 'rgba(148, 163, 184, 0.2)',
      textStyle: {
        color: '#e2e8f0',
      },
      formatter: (params) => {
        const data = params[0]
        return `${data.axisValue}<br/>温度: <strong>${data.value}°C</strong>`
      },
    },
    xAxis: {
      type: 'category',
      data: times,
      axisLine: {
        lineStyle: {
          color: 'rgba(148, 163, 184, 0.3)',
        },
      },
      axisLabel: {
        color: '#94a3b8',
        fontSize: 11,
      },
    },
    yAxis: {
      type: 'value',
      name: '温度 (°C)',
      nameTextStyle: {
        color: '#94a3b8',
      },
      axisLine: {
        show: false,
      },
      axisLabel: {
        color: '#94a3b8',
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(148, 163, 184, 0.1)',
        },
      },
    },
    series: [
      {
        name: '温度',
        type: 'line',
        data: temps,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          color: '#0ea5e9',
          width: 3,
        },
        itemStyle: {
          color: '#0ea5e9',
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(14, 165, 233, 0.4)' },
            { offset: 1, color: 'rgba(14, 165, 233, 0.05)' },
          ]),
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: {
            color: '#ef4444',
            type: 'dashed',
            width: 2,
          },
          label: {
            formatter: `安全上限 ${maxTemp}°C`,
            color: '#ef4444',
            position: 'end',
          },
          data: [
            {
              yAxis: maxTemp,
            },
          ],
        },
      },
    ],
  }

  chartInstance.setOption(option)
}

const handleResize = () => {
  if (chartInstance) {
    chartInstance.resize()
  }
}

const handleClose = () => {
  emit('close')
}

onMounted(() => {
  loadHistory()
  window.addEventListener('resize', handleResize)
  document.body.style.overflow = 'hidden'
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (chartInstance) {
    chartInstance.dispose()
  }
  document.body.style.overflow = ''
})
</script>

<template>
  <div class="fixed inset-0 z-40 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="handleClose"></div>

    <div class="relative w-full max-w-4xl">
      <div class="glass-card rounded-2xl overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-cold-500/20 flex items-center justify-center">
              <svg class="w-5 h-5 text-cold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-bold text-white">{{ shipment.product_name }} - 温度趋势</h3>
              <p class="text-slate-400 text-sm">{{ shipment.vehicle_plate }} · {{ shipment.origin }} → {{ shipment.destination }}</p>
            </div>
          </div>
          <button
            class="w-9 h-9 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-300 transition-colors"
            @click="handleClose"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="p-6">
          <div class="grid grid-cols-4 gap-4 mb-6">
            <div class="bg-slate-800/50 rounded-xl p-4">
              <p class="text-slate-400 text-xs mb-1">最高安全温度</p>
              <p class="text-xl font-bold text-red-400 font-mono">{{ shipment.max_temperature }}°C</p>
            </div>
            <div class="bg-slate-800/50 rounded-xl p-4">
              <p class="text-slate-400 text-xs mb-1">最新温度</p>
              <p class="text-xl font-bold text-cold-400 font-mono">
                {{ historyData.length > 0 ? historyData[historyData.length - 1].temperature : '--' }}°C
              </p>
            </div>
            <div class="bg-slate-800/50 rounded-xl p-4">
              <p class="text-slate-400 text-xs mb-1">数据点数</p>
              <p class="text-xl font-bold text-white font-mono">{{ historyData.length }}</p>
            </div>
            <div class="bg-slate-800/50 rounded-xl p-4">
              <p class="text-slate-400 text-xs mb-1">运输状态</p>
              <p class="text-xl font-bold text-green-400">运输中</p>
            </div>
          </div>

          <div v-if="loading" class="h-80 flex items-center justify-center">
            <div class="text-slate-400">加载中...</div>
          </div>
          <div v-else ref="chartRef" class="h-80 w-full"></div>
        </div>
      </div>
    </div>
  </div>
</template>
