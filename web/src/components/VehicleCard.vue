<script setup>
import { computed } from 'vue'

const props = defineProps({
  shipment: {
    type: Object,
    required: true,
  },
  temperatureData: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['click', 'trace'])

const isOverTemp = computed(() => {
  if (!props.temperatureData) return false
  return parseFloat(props.temperatureData.temperature) > parseFloat(props.shipment.max_temperature)
})

const currentTemp = computed(() => {
  if (!props.temperatureData) return '--'
  return parseFloat(props.temperatureData.temperature).toFixed(1)
})

const productTypeLabel = computed(() => {
  const types = {
    seafood: '海鲜水产',
    fruit: '鲜果蔬菜',
    meat: '肉类制品',
    dairy: '乳制品',
  }
  return types[props.shipment.product_type] || '其他'
})

const productTypeIcon = computed(() => {
  const icons = {
    seafood: '🐟',
    fruit: '🍓',
    meat: '🥩',
    dairy: '🥛',
  }
  return icons[props.shipment.product_type] || '📦'
})

const formatTime = (timeStr) => {
  if (!timeStr) return '--'
  return new Date(timeStr).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const handleClick = () => {
  emit('click')
}

const handleTrace = () => {
  emit('trace')
}
</script>

<template>
  <div
    class="glass-card rounded-xl p-5 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
    :class="{
      'border-2 border-red-500/50 danger-glow': isOverTemp,
      'border-2 border-transparent': !isOverTemp,
    }"
    @click="handleClick"
  >
    <div class="flex items-start justify-between mb-4">
      <div class="flex items-center gap-3">
        <div
          class="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
          :class="isOverTemp ? 'bg-red-500/20' : 'bg-cold-500/20'"
        >
          {{ productTypeIcon }}
        </div>
        <div>
          <h3 class="font-semibold text-white">{{ shipment.product_name }}</h3>
          <p class="text-xs text-slate-400">{{ productTypeLabel }}</p>
        </div>
      </div>
      <div
        class="px-2.5 py-1 rounded-full text-xs font-medium"
        :class="isOverTemp ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-green-500/20 text-green-400'"
      >
        {{ isOverTemp ? '异常' : '正常' }}
      </div>
    </div>

    <div class="flex items-end justify-between mb-4">
      <div>
        <p class="text-slate-400 text-xs mb-1">当前温度</p>
        <p class="text-3xl font-bold font-mono" :class="isOverTemp ? 'text-red-400' : 'text-cold-400'">
          {{ currentTemp }}<span class="text-lg">°C</span>
        </p>
      </div>
      <div class="text-right">
        <p class="text-slate-400 text-xs mb-1">安全上限</p>
        <p class="text-lg font-medium text-slate-300">
          {{ shipment.max_temperature }}<span class="text-sm">°C</span>
        </p>
      </div>
    </div>

    <div class="h-2 bg-slate-700 rounded-full overflow-hidden mb-4">
      <div
        class="h-full rounded-full transition-all duration-500"
        :class="isOverTemp ? 'bg-gradient-to-r from-red-500 to-red-400' : 'bg-gradient-to-r from-cold-500 to-cold-400'"
        :style="{
          width: temperatureData
            ? Math.min(100, Math.max(5, (parseFloat(temperatureData.temperature) + 30) / 30 * 100)) + '%'
            : '5%',
        }"
      ></div>
    </div>

    <div class="border-t border-slate-700/50 pt-3">
      <div class="flex items-center justify-between text-xs">
        <div class="flex items-center gap-1.5 text-slate-400">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>{{ shipment.vehicle_plate }}</span>
        </div>
        <div class="text-slate-500">
          {{ formatTime(temperatureData?.recorded_at) }}
        </div>
      </div>
      <div class="flex items-center gap-2 mt-2 text-xs text-slate-500">
        <span>{{ shipment.origin }}</span>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
        <span>{{ shipment.destination }}</span>
      </div>

      <button
        v-if="isOverTemp"
        class="w-full mt-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 border border-red-500/40 text-red-300 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
        @click.stop="handleTrace"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        查看断链追溯报告
      </button>
    </div>
  </div>
</template>
