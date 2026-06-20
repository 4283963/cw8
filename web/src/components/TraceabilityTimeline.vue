<script setup>
import { ref, computed, onMounted } from 'vue'
import { getTraceabilityTimeline, downloadTraceabilityReport } from '../api'

const props = defineProps({
  shipment: {
    type: Object,
    required: true,
  },
  threshold: {
    type: Number,
    default: 4,
  },
})

const emit = defineEmits(['close'])

const loading = ref(true)
const downloading = ref(false)
const error = ref('')
const timelineData = ref(null)
const expandedSegments = ref(new Set())

const thresholdValue = computed(() => props.threshold)

const shipment = computed(() => timelineData.value?.shipment || props.shipment)
const summary = computed(() => timelineData.value?.summary || {})
const segments = computed(() => timelineData.value?.segments || [])
const reportDate = computed(() => timelineData.value?.date || new Date().toISOString().split('T')[0])

const overTempRatio = computed(() => {
  const total = summary.value.total_reports || 0
  const over = summary.value.over_temp_count || 0
  return total > 0 ? ((over / total) * 100).toFixed(1) : '0.0'
})

const totalOverTempSeconds = computed(() => {
  return segments.value.reduce((sum, s) => sum + (s.duration_seconds || 0), 0)
})

const loadTimeline = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await getTraceabilityTimeline(props.shipment.id, {
      threshold: thresholdValue.value,
    })
    timelineData.value = res.data
  } catch (e) {
    error.value = e.message || '加载追溯数据失败'
    console.error('加载追溯数据失败:', e)
  } finally {
    loading.value = false
  }
}

const toggleSegment = (index) => {
  if (expandedSegments.value.has(index)) {
    expandedSegments.value.delete(index)
  } else {
    expandedSegments.value.add(index)
  }
}

const isSegmentExpanded = (index) => expandedSegments.value.has(index)

const formatDateTime = (timeStr) => {
  if (!timeStr) return '--'
  return new Date(timeStr).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const formatDuration = (seconds) => {
  if (!seconds || seconds < 0) return '0 秒'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}时${m}分${s}秒`
  if (m > 0) return `${m}分${s}秒`
  return `${s}秒`
}

const buildMapLink = (lat, lng) => {
  if (!lat || !lng) return null
  return `https://www.google.com/maps?q=${lat},${lng}`
}

const openMapLink = (lat, lng) => {
  const link = buildMapLink(lat, lng)
  if (link) {
    window.open(link, '_blank')
  }
}

const handleDownloadPdf = async () => {
  downloading.value = true
  try {
    const blob = await downloadTraceabilityReport(props.shipment.id, {
      threshold: thresholdValue.value,
    })

    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const safePlate = (props.shipment.vehicle_plate || 'unknown').replace(/[^\w\u4e00-\u9fa5]/g, '')
    link.download = `冷链追溯报告_${safePlate}_${reportDate.value}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (e) {
    console.error('下载追溯报告失败:', e)
    error.value = '下载报告失败: ' + (e.message || '未知错误')
  } finally {
    downloading.value = false
  }
}

const handleClose = () => {
  emit('close')
}

onMounted(() => {
  loadTimeline()
})
</script>

<template>
  <div class="fixed inset-0 z-40 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="handleClose"></div>

    <div class="relative w-full max-w-5xl max-h-[90vh] flex flex-col">
      <div class="glass-card rounded-2xl overflow-hidden flex flex-col" style="max-height: 90vh">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between flex-shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-bold text-white">断链责任追溯时间轴</h3>
              <p class="text-slate-400 text-sm">
                {{ shipment.vehicle_plate }} · {{ shipment.product_name }} · 追溯标准 > {{ thresholdValue }}°C
              </p>
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

        <!-- Summary Stats -->
        <div class="px-6 py-4 border-b border-slate-700/50 flex-shrink-0">
          <div class="grid grid-cols-5 gap-3">
            <div class="bg-slate-800/50 rounded-lg p-3">
              <p class="text-slate-400 text-xs">今日上报</p>
              <p class="text-white font-bold text-lg">{{ summary.total_reports || 0 }}</p>
            </div>
            <div class="bg-red-900/30 rounded-lg p-3 border border-red-700/30">
              <p class="text-red-400 text-xs">超温次数</p>
              <p class="text-red-400 font-bold text-lg">{{ summary.over_temp_count || 0 }}</p>
            </div>
            <div class="bg-red-900/30 rounded-lg p-3 border border-red-700/30">
              <p class="text-red-400 text-xs">超温占比</p>
              <p class="text-red-400 font-bold text-lg">{{ overTempRatio }}%</p>
            </div>
            <div class="bg-slate-800/50 rounded-lg p-3">
              <p class="text-slate-400 text-xs">最高温度</p>
              <p class="text-orange-400 font-bold text-lg">
                {{ summary.max_temp_today ? summary.max_temp_today + '°C' : '--' }}
              </p>
            </div>
            <div class="bg-slate-800/50 rounded-lg p-3">
              <p class="text-slate-400 text-xs">超温总时长</p>
              <p class="text-yellow-400 font-bold text-lg">{{ formatDuration(totalOverTempSeconds) }}</p>
            </div>
          </div>
        </div>

        <!-- Download Bar -->
        <div class="px-6 py-3 border-b border-slate-700/50 flex items-center justify-between flex-shrink-0">
          <div class="flex items-center gap-2 text-sm text-slate-400">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>报告日期: {{ reportDate }}</span>
          </div>
          <button
            class="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors"
            :disabled="downloading || loading"
            @click="handleDownloadPdf"
          >
            <svg v-if="!downloading" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ downloading ? '生成中...' : '下载 PDF 责任追溯报告' }}
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto px-6 py-4">
          <div v-if="loading" class="flex items-center justify-center py-20">
            <div class="text-slate-400 flex items-center gap-3">
              <svg class="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              加载追溯数据中...
            </div>
          </div>

          <div v-else-if="error" class="flex items-center justify-center py-20">
            <div class="text-center">
              <p class="text-red-400 mb-2">{{ error }}</p>
              <button
                class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm"
                @click="loadTimeline"
              >
                重试
              </button>
            </div>
          </div>

          <div v-else-if="segments.length === 0" class="flex items-center justify-center py-20">
            <div class="text-center">
              <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg class="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p class="text-slate-300">今日未检测到超过 {{ thresholdValue }}°C 的温度记录</p>
              <p class="text-slate-500 text-sm mt-1">冷链状态良好，无断链责任问题</p>
            </div>
          </div>

          <div v-else class="space-y-4">
            <p class="text-sm text-slate-400 mb-4">
              今日共发现 <span class="text-red-400 font-bold">{{ segments.length }}</span> 段温度超过 {{ thresholdValue }}°C 的异常时段，点击展开查看 GPS 轨迹
            </p>

            <!-- Timeline -->
            <div class="relative">
              <div class="absolute left-4 top-2 bottom-2 w-0.5 bg-red-500/30"></div>

              <div v-for="(segment, index) in segments" :key="index" class="relative pl-12 pb-4">
                <div
                  class="absolute left-2 top-2 w-5 h-5 rounded-full border-2 border-red-500 bg-slate-900 flex items-center justify-center cursor-pointer hover:bg-red-500 transition-colors"
                  @click="toggleSegment(index)"
                >
                  <span class="text-xs font-bold text-red-400">{{ index + 1 }}</span>
                </div>

                <div
                  class="bg-red-900/20 border border-red-700/40 rounded-xl p-4 cursor-pointer hover:bg-red-900/30 transition-colors"
                  @click="toggleSegment(index)"
                >
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                      <span class="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-medium">
                        超温时段 {{ index + 1 }}
                      </span>
                      <span class="text-white text-sm font-medium">
                        {{ formatDateTime(segment.start_time) }}
                      </span>
                      <svg class="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                      <span class="text-white text-sm font-medium">
                        {{ formatDateTime(segment.end_time) }}
                      </span>
                    </div>
                    <svg
                      class="w-4 h-4 text-slate-400 transition-transform"
                      :class="{ 'rotate-180': isSegmentExpanded(index) }"
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  <div class="flex items-center gap-4 text-xs">
                    <span class="text-slate-400">持续: <span class="text-yellow-400 font-medium">{{ formatDuration(segment.duration_seconds) }}</span></span>
                    <span class="text-slate-400">最高: <span class="text-red-400 font-medium">{{ segment.max_temperature }}°C</span></span>
                    <span class="text-slate-400">平均: <span class="text-orange-400 font-medium">{{ segment.avg_temperature }}°C</span></span>
                    <span class="text-slate-400">数据点: <span class="text-slate-300 font-medium">{{ segment.records.length }} 条</span></span>
                  </div>

                  <!-- Expanded GPS Records -->
                  <div v-if="isSegmentExpanded(index)" class="mt-4 pt-4 border-t border-red-700/30 space-y-2">
                    <p class="text-xs text-slate-400 mb-2 flex items-center gap-1">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      GPS 轨迹定位（点击定位图标查看司机位置地图）
                    </p>
                    <div
                      v-for="(record, rIdx) in segment.records"
                      :key="rIdx"
                      class="flex items-center justify-between bg-slate-800/40 rounded-lg p-2.5 hover:bg-slate-800/60 transition-colors"
                    >
                      <div class="flex items-center gap-3">
                        <span class="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center text-xs text-orange-400 font-medium">
                          {{ rIdx + 1 }}
                        </span>
                        <div>
                          <p class="text-slate-300 text-xs">{{ formatDateTime(record.recorded_at) }}</p>
                          <p class="text-red-400 text-sm font-mono font-medium">{{ record.temperature }}°C</p>
                        </div>
                      </div>
                      <div class="flex items-center gap-3">
                        <div v-if="record.location_lat && record.location_lng" class="text-right">
                          <p class="text-slate-400 text-xs font-mono">
                            {{ record.location_lat }}, {{ record.location_lng }}
                          </p>
                          <button
                            class="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 ml-auto"
                            @click.stop="openMapLink(record.location_lat, record.location_lng)"
                          >
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            查看地图位置
                          </button>
                        </div>
                        <span v-else class="text-slate-500 text-xs">无 GPS 数据</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
