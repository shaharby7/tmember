<template>
  <div class="echo-form">
    <h2>Echo Test</h2>

    <!-- Backend health status -->
    <HealthStatus />

    <form @submit.prevent="handleSubmit" class="form">
      <div class="input-group">
        <label for="message" class="label">Enter your message</label>
        <div class="input-wrapper">
          <input
            id="message"
            v-model="message"
            type="text"
            class="input"
            placeholder="Type something to echo..."
            :disabled="loading"
            maxlength="1000"
            @input="clearMessages"
          />
          <div v-if="message.length > 0" class="character-count">{{ message.length }}/1000</div>
        </div>
        <div v-if="validationError" class="validation-error">
          {{ validationError }}
        </div>
      </div>

      <button type="submit" class="submit-button" :disabled="loading || !isValidMessage">
        <span v-if="loading" class="loading-spinner"></span>
        {{ loading ? 'Sending...' : 'Send Echo' }}
      </button>
    </form>

    <!-- Response section -->
    <div v-if="response || error" class="response-section">
      <div v-if="response" class="response success">
        <div class="response-header">
          <h3>✓ Echo Response:</h3>
          <span class="timestamp">{{ responseTimestamp }}</span>
        </div>
        <div class="response-content">
          <p class="original-message">Original: "{{ lastSentMessage }}"</p>
          <p class="echo-message">Echo: "{{ response }}"</p>
        </div>
      </div>

      <div v-if="error" class="response error">
        <div class="response-header">
          <h3>⚠ Error:</h3>
          <button
            v-if="lastSentMessage"
            @click="retryLastMessage"
            :disabled="loading"
            class="retry-button"
          >
            Retry
          </button>
        </div>
        <p>{{ error }}</p>
      </div>
    </div>

    <!-- Response history -->
    <div v-if="responseHistory.length > 0" class="history-section">
      <h3>Recent Echoes:</h3>
      <div class="history-list">
        <div
          v-for="(item, index) in responseHistory.slice().reverse()"
          :key="index"
          class="history-item"
        >
          <div class="history-content">
            <span class="history-message">"{{ item.message }}"</span>
            <span class="history-timestamp">{{ formatTimestamp(item.timestamp) }}</span>
          </div>
          <div v-if="item.success" class="history-status success">✓</div>
          <div v-else class="history-status error">✗</div>
        </div>
      </div>
      <button v-if="responseHistory.length > 3" @click="clearHistory" class="clear-history-button">
        Clear History
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { sendEcho } from '../services/api'
import HealthStatus from './HealthStatus.vue'

// Types for response history
interface HistoryItem {
  message: string
  timestamp: Date
  success: boolean
}

// Reactive state
const message = ref('')
const response = ref('')
const error = ref('')
const loading = ref(false)
const validationError = ref('')
const lastSentMessage = ref('')
const responseTimestamp = ref('')
const responseHistory = ref<HistoryItem[]>([])

// Computed properties
const isValidMessage = computed(() => {
  const trimmed = message.value.trim()
  return trimmed.length > 0 && trimmed.length <= 1000
})

// Clear messages when user types
const clearMessages = () => {
  error.value = ''
  response.value = ''
  validationError.value = ''
}

// Format timestamp for display
const formatTimestamp = (date: Date) => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// Add item to history
const addToHistory = (message: string, success: boolean) => {
  responseHistory.value.push({
    message,
    timestamp: new Date(),
    success,
  })

  // Keep only last 10 items
  if (responseHistory.value.length > 10) {
    responseHistory.value = responseHistory.value.slice(-10)
  }
}

// Clear response history
const clearHistory = () => {
  responseHistory.value = []
}

// Retry last message
const retryLastMessage = async () => {
  if (lastSentMessage.value) {
    message.value = lastSentMessage.value
    await handleSubmit()
  }
}

// Form submission handler
const handleSubmit = async () => {
  const messageToSend = message.value.trim()

  // Validation
  if (!messageToSend) {
    validationError.value = 'Please enter a message'
    return
  }

  if (messageToSend.length > 1000) {
    validationError.value = 'Message is too long (max 1000 characters)'
    return
  }

  loading.value = true
  error.value = ''
  response.value = ''
  validationError.value = ''
  lastSentMessage.value = messageToSend

  try {
    const result = await sendEcho(messageToSend)

    if (result.success && result.data) {
      response.value = result.data.echo
      responseTimestamp.value = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
      message.value = '' // Clear input after successful submission
      addToHistory(messageToSend, true)
    } else if (result.error) {
      error.value = result.error.message || `Error: ${result.error.error}`
      addToHistory(messageToSend, false)
    } else {
      error.value = 'An unexpected error occurred. Please try again.'
      addToHistory(messageToSend, false)
    }
  } catch (err) {
    error.value = 'Failed to send echo request. Please try again.'
    addToHistory(messageToSend, false)
    console.error('Echo request failed:', err)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.echo-form {
  max-width: 600px;
  margin: 2rem auto;
  padding: 2rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background-color: var(--color-background-soft);
}

.echo-form h2 {
  text-align: center;
  margin-bottom: 1.5rem;
  color: var(--color-heading);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.label {
  font-weight: 600;
  color: var(--color-text);
}

.input-wrapper {
  position: relative;
}

.input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 1rem;
  background-color: var(--color-background);
  color: var(--color-text);
  transition: border-color 0.3s ease;
  box-sizing: border-box;
}

.input:focus {
  outline: none;
  border-color: var(--color-border-hover);
}

.input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.character-count {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.8rem;
  color: var(--color-text-light);
  pointer-events: none;
}

.validation-error {
  color: #f44336;
  font-size: 0.85rem;
  margin-top: 0.25rem;
}

.submit-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background-color: var(--color-brand);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.submit-button:hover:not(:disabled) {
  background-color: var(--color-brand-dark);
}

.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.response-section {
  margin-top: 1.5rem;
}

.response {
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.response-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.response-header h3 {
  margin: 0;
  font-size: 1.1rem;
}

.timestamp {
  font-size: 0.8rem;
  color: var(--color-text-light);
}

.response-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.original-message {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text-light);
  font-style: italic;
}

.echo-message {
  margin: 0;
  font-weight: 600;
  word-break: break-word;
}

.success {
  background-color: var(--color-background-mute);
  border: 1px solid #4caf50;
  color: var(--color-text);
}

.success h3 {
  color: #4caf50;
}

.error {
  background-color: #ffeaea;
  border: 1px solid #f44336;
  color: #d32f2f;
}

.error h3 {
  color: #f44336;
}

.error p {
  margin: 0;
  word-break: break-word;
}

.retry-button {
  padding: 0.5rem 1rem;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.retry-button:hover:not(:disabled) {
  background-color: #d32f2f;
}

.retry-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.history-section {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--color-border);
}

.history-section h3 {
  margin: 0 0 1rem 0;
  color: var(--color-heading);
  font-size: 1.1rem;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  background-color: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 4px;
}

.history-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.history-message {
  font-size: 0.9rem;
  color: var(--color-text);
  word-break: break-word;
}

.history-timestamp {
  font-size: 0.75rem;
  color: var(--color-text-light);
}

.history-status {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: bold;
  margin-left: 1rem;
}

.history-status.success {
  background-color: #4caf50;
  color: white;
}

.history-status.error {
  background-color: #f44336;
  color: white;
}

.clear-history-button {
  padding: 0.5rem 1rem;
  background-color: var(--color-background);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.clear-history-button:hover {
  background-color: var(--color-background-mute);
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .error {
    background-color: #2d1b1b;
    color: #ffcdd2;
  }
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .echo-form {
    margin: 1rem;
    padding: 1.5rem;
  }

  .response-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .history-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .history-status {
    margin-left: 0;
    align-self: flex-end;
  }
}
</style>