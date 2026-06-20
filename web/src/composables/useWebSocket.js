import { ref, onMounted, onUnmounted } from 'vue'

export function useWebSocket() {
  const ws = ref(null)
  const isConnected = ref(false)
  const alerts = ref([])
  const temperatures = ref({})
  const reconnectAttempts = ref(0)
  const maxReconnectAttempts = 10
  let reconnectTimer = null

  const connect = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.hostname
    const port = 3000
    const wsUrl = `${protocol}//${host}:${port}`

    try {
      ws.value = new WebSocket(wsUrl)

      ws.value.onopen = () => {
        console.log('WebSocket 连接成功')
        isConnected.value = true
        reconnectAttempts.value = 0
      }

      ws.value.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          handleMessage(message)
        } catch (e) {
          console.error('解析 WebSocket 消息失败:', e)
        }
      }

      ws.value.onerror = (error) => {
        console.error('WebSocket 错误:', error)
        isConnected.value = false
      }

      ws.value.onclose = () => {
        console.log('WebSocket 连接关闭')
        isConnected.value = false
        attemptReconnect()
      }
    } catch (e) {
      console.error('创建 WebSocket 连接失败:', e)
      attemptReconnect()
    }
  }

  const handleMessage = (message) => {
    const { type, data } = message

    switch (type) {
      case 'connection':
        console.log('连接状态:', data.status)
        break
      case 'alert':
        console.log('收到报警:', data)
        alerts.value.unshift(data)
        if (alerts.value.length > 50) {
          alerts.value.pop()
        }
        break
      case 'temperature':
        if (data.shipment_id) {
          temperatures.value[data.shipment_id] = data
        }
        break
      case 'temperature_batch':
        if (Array.isArray(data)) {
          data.forEach((item) => {
            if (item.shipment_id) {
              temperatures.value[item.shipment_id] = item
            }
          })
        }
        break
    }
  }

  const attemptReconnect = () => {
    if (reconnectAttempts.value >= maxReconnectAttempts) {
      console.error('达到最大重连次数，停止重连')
      return
    }

    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
    }

    reconnectAttempts.value++
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.value - 1), 30000)
    console.log(`第 ${reconnectAttempts.value} 次重连，${delay / 1000}秒后重试...`)

    reconnectTimer = setTimeout(() => {
      connect()
    }, delay)
  }

  const disconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
    }
    if (ws.value) {
      ws.value.close()
      ws.value = null
    }
    isConnected.value = false
  }

  onMounted(() => {
    connect()
  })

  onUnmounted(() => {
    disconnect()
  })

  return {
    ws,
    isConnected,
    alerts,
    temperatures,
    connect,
    disconnect,
  }
}
