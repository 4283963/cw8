<script setup>
import { computed } from 'vue'
import { resolveAlert as resolveAlertApi } from '../api'

const props = defineProps({
  alerts: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['resolve', 'trace'])

const sortedAlerts = computed(() => {
  return [...props.alerts].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
})

const unresolvedAlerts = computed(() => {
  return sortedAlerts.value.filter((a) => !a.is_resolved)
})

const resolvedAlerts = computed(() => {
  return sortedAlerts.value.filter((a) => a.is_resolved).slice(0, 10)
})

const formatTime = (timeStr) => {
  if (!timeStr) return '--'
  const date = new Date(timeStr)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const formatDate = (timeStr) => {
  if (!timeStr) return '--'
  const date = new Date(timeStr)
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  })
}

const getAlertLevelColor = (level) => {
  const colors = {
    danger: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500',
  }
  return colors[level] || 'bg-slate-500'
}

const getAlertLevelText = (level) => {
  const texts = {
    danger: '危险',
    warning: '警告',
    info: '提示',
  }
  return texts[level] || level
}

const handleQuickResolve = async (alert) => {
  if (confirm('确定要标记此报警为已处理吗？')) {
    try {
      await resolveAlertApi(alert.id, '前端快速处理')
      emit('resolve')
    } catch (error) {
      console.error('处理报警失败:', error)
    }
  }
}

const handleTrace = (alert) => {
  emit('trace', alert)
}
</script>

<template>
  <div class="glass-card rounded-2xl p-6 h-full">
    <div class="flex items-center justify-between mb-5">
      <h2 class="text-xl font-bold text-white flex items-center gap-2">
        <svg class="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        报警记录
      </h2>
      <span
        class="px-3 py-1 rounded-full text-sm font-medium"
        :class="unresolvedAlerts.length > 0 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'"
      >
        {{ unresolvedAlerts.length }} 条未处理
      </span>
    </div>

    <div class="space-y-3 max-h-[500px] overflow-y-auto pr-2">
      <div v-if="unresolvedAlerts.length === 0 && resolvedAlerts.length === 0" class="text-center py-12">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
          <svg class="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p class="text-slate-400">暂无报警记录</p>
        <p class="text-slate-500 text-sm mt-1">冷链状态良好</p>
      </div>

      <div v-for="alert in unresolvedAlerts" :key="alert.id" class="relative">
        <div class="bg-red-900/30 border border-red-700/50 rounded-xl p-4 hover:bg-red-900/40 transition-colors">
          <div class="flex items-start justify-between mb-2">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
              <span class="text-xs font-medium text-red-400">{{ getAlertLevelText(alert.alert_level) }}</span>
            </div>
            <div class="flex items-center gap-2">
              <button
                class="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                @click.stop="handleTrace(alert)"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                追溯报告
              </button>
              <button
                class="text-xs text-green-400 hover:text-green-300 transition-colors"
                @click.stop="handleQuickResolve(alert)"
              >
                标记处理
              </button>
            </div>
          </div>
          <p class="text-white text-sm font-medium mb-2">{{ alert.product_name || '未知品类' }}</p>
          <p class="text-slate-300 text-xs line-clamp-2">{{ alert.message }}</p>
          <div class="flex items-center justify-between mt-3 text-xs">
            <span class="text-slate-500">{{ alert.vehicle_plate }}</span>
            <span class="text-slate-400">{{ formatDate(alert.created_at) }} {{ formatTime(alert.created_at) }}</span>
          </div>
        </div>
      </div>

      <div v-if="resolvedAlerts.length > 0 && unresolvedAlerts.length > 0" class="pt-2 pb-1">
        <p class="text-xs text-slate-500 px-2">已处理</p>
      </div>

      <div v-for="alert in resolvedAlerts" :key="alert.id">
        <div class="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 opacity-60">
          <div class="flex items-center gap-2 mb-2">
            <span class="w-2.5 h-2.5 rounded-full bg-green-500"></span>
            <span class="text-xs font-medium text-slate-400">已处理</span>
          </div>
          <p class="text-slate-300 text-sm font-medium mb-1">{{ alert.product_name || '未知品类' }}</p>
          <p class="text-slate-400 text-xs line-clamp-2">{{ alert.message }}</p>
          <div class="flex items-center justify-between mt-3 text-xs">
            <span class="text-slate-500">{{ alert.vehicle_plate }}</span>
            <span class="text-slate-500">{{ formatTime(alert.created_at) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
