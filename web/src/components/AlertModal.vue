<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { resolveAlert } from '../api'

const props = defineProps({
  alert: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['close', 'resolved'])

const isResolving = ref(false)
const resolveNote = ref('')
const showResolveForm = ref(false)
let audio = null

const playAlertSound = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 800
    oscillator.type = 'sine'
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)

    oscillator.start()
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
    oscillator.stop(audioContext.currentTime + 0.5)

    setTimeout(() => {
      const osc2 = audioContext.createOscillator()
      osc2.connect(gainNode)
      osc2.frequency.value = 600
      osc2.type = 'sine'
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      osc2.start()
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
      osc2.stop(audioContext.currentTime + 0.5)
    }, 600)
  } catch (e) {
    console.log('无法播放警告音效')
  }
}

const handleClose = () => {
  emit('close')
}

const handleResolve = async () => {
  if (!resolveNote.value.trim()) {
    alert('请填写处理说明')
    return
  }

  isResolving.value = true
  try {
    await resolveAlert(props.alert.id, resolveNote.value)
    emit('resolved')
    emit('close')
  } catch (error) {
    console.error('处理报警失败:', error)
  } finally {
    isResolving.value = false
  }
}

const formatTime = (timeStr) => {
  if (!timeStr) return '--'
  return new Date(timeStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

onMounted(() => {
  playAlertSound()

  document.body.style.overflow = 'hidden'
})

onUnmounted(() => {
  document.body.style.overflow = ''
})
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="handleClose"></div>

    <div class="relative w-full max-w-lg animate-bounce-in">
      <div class="bg-gradient-to-br from-red-900 to-red-950 border-2 border-red-500 rounded-2xl overflow-hidden shadow-2xl danger-glow">
        <div class="bg-red-600 px-6 py-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
              <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 class="text-2xl font-bold text-white">断链警告</h2>
              <p class="text-red-200 text-sm">冷链温度超过安全线</p>
            </div>
          </div>
          <button
            class="w-10 h-10 rounded-full bg-red-500/50 hover:bg-red-500 flex items-center justify-center text-white transition-colors"
            @click="handleClose"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="p-6">
          <div class="bg-red-950/50 rounded-xl p-5 mb-5 border border-red-800/50">
            <p class="text-red-200 text-lg leading-relaxed">
              {{ alert.message }}
            </p>
          </div>

          <div class="grid grid-cols-2 gap-4 mb-5">
            <div class="bg-slate-800/50 rounded-lg p-4">
              <p class="text-slate-400 text-sm mb-1">运输车辆</p>
              <p class="text-white font-semibold text-lg">{{ alert.vehicle_plate }}</p>
            </div>
            <div class="bg-slate-800/50 rounded-lg p-4">
              <p class="text-slate-400 text-sm mb-1">生鲜品类</p>
              <p class="text-white font-semibold text-lg">{{ alert.product_name || '--' }}</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4 mb-5">
            <div class="bg-red-900/30 rounded-lg p-4 border border-red-700/50">
              <p class="text-red-300 text-sm mb-1">当前温度</p>
              <p class="text-red-400 font-bold text-2xl font-mono">
                {{ alert.temperature }}°C
              </p>
            </div>
            <div class="bg-slate-800/50 rounded-lg p-4">
              <p class="text-slate-400 text-sm mb-1">安全上限</p>
              <p class="text-slate-300 font-semibold text-xl font-mono">
                {{ alert.max_temperature }}°C
              </p>
            </div>
          </div>

          <div class="flex items-center justify-between text-sm text-slate-400 mb-5">
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>报警时间：{{ formatTime(alert.created_at) }}</span>
            </div>
          </div>

          <div v-if="!showResolveForm" class="flex gap-3">
            <button
              class="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
              @click="handleClose"
            >
              稍后处理
            </button>
            <button
              class="flex-1 py-3 px-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-medium transition-colors"
              @click="showResolveForm = true"
            >
              立即处理
            </button>
          </div>

          <div v-else class="space-y-4">
            <div>
              <label class="block text-slate-300 text-sm mb-2">处理说明</label>
              <textarea
                v-model="resolveNote"
                class="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-green-500 resize-none"
                rows="3"
                placeholder="请输入处理措施和说明..."
              ></textarea>
            </div>
            <div class="flex gap-3">
              <button
                class="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
                @click="showResolveForm = false"
              >
                取消
              </button>
              <button
                class="flex-1 py-3 px-4 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
                :disabled="isResolving"
                @click="handleResolve"
              >
                {{ isResolving ? '提交中...' : '确认处理' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes bounce-in {
  0% {
    opacity: 0;
    transform: scale(0.9);
  }
  50% {
    transform: scale(1.03);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-bounce-in {
  animation: bounce-in 0.4s ease-out;
}
</style>
