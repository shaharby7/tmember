<template>
  <div class="health-status">
    <div class="status-indicator" :class="statusClass">
      <span class="status-dot"></span>
      <span class="status-text">{{ statusText }}</span>
    </div>
    <button 
      v-if="!isHealthy" 
      @click="checkHealth" 
      :disabled="checking"
      class="retry-button"
    >
      {{ checking ? 'Checking...' : 'Retry' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { checkHealth as apiCheckHealth } from '../services/api'

// Reactive state
const isHealthy = ref(false)
const checking = ref(false)
const lastChecked = ref<Date | null>(null)

// Computed properties
const statusClass = computed(() => ({
  'status-healthy': isHealthy.value,
  'status-unhealthy': !isHealthy.value && lastChecked.value !== null,
  'status-checking': checking.value,
}))

const statusText = computed(() => {
  if (checking.value) return 'Checking backend connection...'
  if (isHealthy.value) return 'Backend connected'
  if (lastChecked.value) return 'Backend disconnected'
  return 'Checking backend...'
})

// Health check function
const checkHealth = async () => {
  checking.value = true
  
  try {
    const result = await apiCheckHealth()
    isHealthy.value = result.success && result.data?.status === 'ok'
    lastChecked.value = new Date()
  } catch (error) {
    isHealthy.value = false
    lastChecked.value = new Date()
    console.error('Health check failed:', error)
  } finally {
    checking.value = false
  }
}

// Check health on component mount
onMounted(() => {
  checkHealth()
})
</script>

<style scoped>
.health-status {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  margin-bottom: 1rem;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transition: background-color 0.3s ease;
}

.status-healthy .status-dot {
  background-color: #4caf50;
}

.status-unhealthy .status-dot {
  background-color: #f44336;
}

.status-checking .status-dot {
  background-color: #ff9800;
  animation: pulse 1.5s infinite;
}

.status-text {
  font-size: 0.9rem;
  color: var(--color-text);
}

.retry-button {
  padding: 0.5rem 1rem;
  background-color: var(--color-brand);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.retry-button:hover:not(:disabled) {
  background-color: var(--color-brand-dark);
}

.retry-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>