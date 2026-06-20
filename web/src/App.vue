<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getShipments, getUnresolvedAlerts, getLatestTemperatures } from './api'
import { useWebSocket } from './composables/useWebSocket'
import VehicleCard from './components/VehicleCard.vue'
import AlertModal from './components/AlertModal.vue'
import AlertList from './components/AlertList.vue'
import TemperatureChart from './components/TemperatureChart.vue'
import TraceabilityTimeline from './components/TraceabilityTimeline.vue'
import StatHeader from './components/StatHeader.vue'

const { alerts, temperatures, isConnected } = useWebSocket()

const shipments = ref([])
const unresolvedAlertCount = ref(0)
const showAlertModal = ref(false)
const latestAlert = ref(null)
const selectedShipment = ref(null)
const showChart = ref(false)
const showTimeline = ref(false)
const timelineShipment = ref(null)
const currentTime = ref('')

let timeTimer = null

const loadData = async () => {
  try {
    const [shipmentsRes, alertsRes, tempRes] = await Promise.all([
      getShipments('in_transit'),
      getUnresolvedAlerts(),
      getLatestTemperatures(),
    ])

    shipments.value = shipmentsRes.data || []
    unresolvedAlertCount.value = (alertsRes.data || []).length

    if (tempRes.data) {
      tempRes.data.forEach((t) => {
        temperatures.value[t.shipment_id] = t
      })
    }

    if (alertsRes.data && alertsRes.data.length > 0) {
      alerts.value = alertsRes.data
    }
  } catch (error) {
    console.error('加载数据失败:', error)
  }
}

const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const activeShipments = computed(() => {
  return shipments.value
})

const overTempCount = computed(() => {
  return shipments.value.filter((s) => {
    const temp = temperatures.value[s.id]
    return temp && parseFloat(temp.temperature) > parseFloat(s.max_temperature)
  }).length
})

const handleVehicleClick = (shipment) => {
  selectedShipment.value = shipment
  showChart.value = true
}

const closeChart = () => {
  showChart.value = false
  selectedShipment.value = null
}

const handleTraceFromAlert = (alert) => {
  const shipment = shipments.value.find((s) => s.id === alert.shipment_id)
  timelineShipment.value = shipment || {
    id: alert.shipment_id,
    vehicle_plate: alert.vehicle_plate,
    product_name: alert.product_name,
  }
  showTimeline.value = true
}

const handleTraceFromVehicle = (shipment) => {
  timelineShipment.value = shipment
  showTimeline.value = true
}

const closeTimeline = () => {
  showTimeline.value = false
  timelineShipment.value = null
}

const handleNewAlert = (alert) => {
  latestAlert.value = alert
  showAlertModal.value = true
}

const closeAlertModal = () => {
  showAlertModal.value = false
}

const onResolveAlert = () => {
  unresolvedAlertCount.value = Math.max(0, unresolvedAlertCount.value - 1)
}

let alertCheckInterval = null

onMounted(() => {
  loadData()
  updateTime()
  timeTimer = setInterval(updateTime, 1000)

  alertCheckInterval = setInterval(() => {
    if (alerts.value.length > 0) {
      const latest = alerts.value[0]
      if (latest && latest.is_resolved === false) {
        const now = Date.now()
        const alertTime = new Date(latest.created_at).getTime()
        if (now - alertTime < 2000) {
          handleNewAlert(latest)
        }
      }
    }
  }, 1000)

  setInterval(loadData, 30000)
})

onUnmounted(() => {
  if (timeTimer) clearInterval(timeTimer)
  if (alertCheckInterval) clearInterval(alertCheckInterval)
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
    <header class="glass-card border-b border-slate-700">
      <div class="max-w-7xl mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-cold-400 to-cold-600 flex items-center justify-center">
              <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 class="text-2xl font-bold text-white">生鲜冷链供应链温度监控系统</h1>
              <p class="text-slate-400 text-sm">Cold Chain Temperature Monitoring Dashboard</p>
            </div>
          </div>
          <div class="flex items-center gap-6">
            <div class="text-right">
              <p class="text-slate-400 text-sm">当前时间</p>
              <p class="text-white font-mono text-lg">{{ currentTime }}</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full" :class="isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'"></span>
              <span class="text-sm" :class="isConnected ? 'text-green-400' : 'text-red-400'">
                {{ isConnected ? '实时连接' : '断开中' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-6 py-6">
      <StatHeader
        :total-shipments="activeShipments.length"
        :over-temp-count="overTempCount"
        :unresolved-alert-count="unresolvedAlertCount"
      />

      <div class="grid grid-cols-12 gap-6 mt-6">
        <div class="col-span-8">
          <div class="glass-card rounded-2xl p-6">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-xl font-bold text-white flex items-center gap-2">
                <svg class="w-6 h-6 text-cold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
                在运车辆实时温度
              </h2>
              <span class="text-sm text-slate-400">共 {{ activeShipments.length }} 辆车</span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <VehicleCard
                v-for="shipment in activeShipments"
                :key="shipment.id"
                :shipment="shipment"
                :temperature-data="temperatures[shipment.id]"
                @click="handleVehicleClick(shipment)"
                @trace="handleTraceFromVehicle(shipment)"
              />
            </div>
          </div>
        </div>

        <div class="col-span-4">
          <AlertList
            :alerts="alerts"
            @resolve="onResolveAlert"
            @trace="handleTraceFromAlert"
          />
        </div>
      </div>
    </main>

    <AlertModal
      v-if="showAlertModal"
      :alert="latestAlert"
      @close="closeAlertModal"
    />

    <TemperatureChart
      v-if="showChart && selectedShipment"
      :shipment="selectedShipment"
      @close="closeChart"
    />

    <TraceabilityTimeline
      v-if="showTimeline && timelineShipment"
      :shipment="timelineShipment"
      @close="closeTimeline"
    />
  </div>
</template>
