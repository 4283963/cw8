<script setup>
defineProps({
  totalShipments: {
    type: Number,
    default: 0,
  },
  overTempCount: {
    type: Number,
    default: 0,
  },
  unresolvedAlertCount: {
    type: Number,
    default: 0,
  },
})
</script>

<template>
  <div class="grid grid-cols-4 gap-4">
    <div class="glass-card rounded-2xl p-6 border-l-4 border-cold-500">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-slate-400 text-sm">在运车辆</p>
          <p class="text-3xl font-bold text-white mt-2">{{ totalShipments }}</p>
          <p class="text-cold-400 text-sm mt-1">辆冷链车运行中</p>
        </div>
        <div class="w-14 h-14 rounded-xl bg-cold-500/20 flex items-center justify-center">
          <svg class="w-7 h-7 text-cold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
      </div>
    </div>

    <div class="glass-card rounded-2xl p-6 border-l-4 border-green-500">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-slate-400 text-sm">温度正常</p>
          <p class="text-3xl font-bold text-white mt-2">{{ totalShipments - overTempCount }}</p>
          <p class="text-green-400 text-sm mt-1">冷链状态良好</p>
        </div>
        <div class="w-14 h-14 rounded-xl bg-green-500/20 flex items-center justify-center">
          <svg class="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
    </div>

    <div class="glass-card rounded-2xl p-6 border-l-4 border-yellow-500">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-slate-400 text-sm">温度异常</p>
          <p class="text-3xl font-bold text-white mt-2">{{ overTempCount }}</p>
          <p class="text-yellow-400 text-sm mt-1">辆需关注</p>
        </div>
        <div class="w-14 h-14 rounded-xl bg-yellow-500/20 flex items-center justify-center">
          <svg class="w-7 h-7 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
      </div>
    </div>

    <div class="glass-card rounded-2xl p-6 border-l-4" :class="unresolvedAlertCount > 0 ? 'border-red-500' : 'border-slate-500'">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-slate-400 text-sm">未处理报警</p>
          <p class="text-3xl font-bold text-white mt-2">{{ unresolvedAlertCount }}</p>
          <p class="text-sm mt-1" :class="unresolvedAlertCount > 0 ? 'text-red-400 animate-pulse' : 'text-slate-400'">
            {{ unresolvedAlertCount > 0 ? '紧急处理中' : '全部正常' }}
          </p>
        </div>
        <div class="w-14 h-14 rounded-xl flex items-center justify-center" :class="unresolvedAlertCount > 0 ? 'bg-red-500/20' : 'bg-slate-500/20'">
          <svg class="w-7 h-7" :class="unresolvedAlertCount > 0 ? 'text-red-400' : 'text-slate-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>
