<template>
  <div class="create-organization">
    <div class="modal-overlay" @click="handleCancel"></div>
    
    <div class="modal-content">
      <div class="modal-header">
        <h2>Create New Organization</h2>
        <button @click="handleCancel" class="close-button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="create-form">
        <div class="form-group">
          <label for="organization-name" class="form-label">
            Organization Name
          </label>
          <input
            id="organization-name"
            v-model="organizationName"
            type="text"
            class="form-input"
            :class="{ 'error': hasError }"
            placeholder="Enter organization name"
            :disabled="isLoading"
            maxlength="100"
            required
          />
          <div v-if="hasError" class="error-message">
            {{ errorMessage }}
          </div>
          <div class="form-hint">
            Choose a unique name for your organization (3-100 characters)
          </div>
        </div>

        <div class="form-actions">
          <button
            type="button"
            @click="handleCancel"
            class="cancel-button"
            :disabled="isLoading"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="create-button"
            :disabled="!isFormValid || isLoading"
          >
            <svg v-if="isLoading" class="loading-spinner" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" opacity="0.3"/>
              <path d="M12,2 A10,10 0 0,1 22,12" fill="none" stroke="currentColor" stroke-width="2"/>
            </svg>
            <span v-if="!isLoading">Create Organization</span>
            <span v-else>Creating...</span>
          </button>
        </div>
      </form>

      <div v-if="showSuggestion" class="suggestion-section">
        <div class="suggestion-content">
          <div class="suggestion-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <div class="suggestion-text">
            <h3>Welcome to TMember!</h3>
            <p>Creating your first organization will help you get started with managing your team and projects.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'

// Props
interface Props {
  isLoading?: boolean
  errorMessage?: string
  showSuggestion?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  errorMessage: '',
  showSuggestion: false
})

// Emits
interface Emits {
  (e: 'create', name: string): void
  (e: 'cancel'): void
}

const emit = defineEmits<Emits>()

// State
const organizationName = ref('')

// Computed
const hasError = computed(() => {
  return props.errorMessage.length > 0
})

const isFormValid = computed(() => {
  const name = organizationName.value.trim()
  return name.length >= 3 && name.length <= 100
})

// Methods
const handleSubmit = () => {
  if (!isFormValid.value || props.isLoading) {
    return
  }

  const name = organizationName.value.trim()
  emit('create', name)
}

const handleCancel = () => {
  emit('cancel')
}

const validateName = (name: string): string => {
  const trimmed = name.trim()
  
  if (trimmed.length === 0) {
    return 'Organization name is required'
  }
  
  if (trimmed.length < 3) {
    return 'Organization name must be at least 3 characters'
  }
  
  if (trimmed.length > 100) {
    return 'Organization name must be less than 100 characters'
  }
  
  // Check for invalid characters (basic validation)
  if (!/^[a-zA-Z0-9\s\-_.]+$/.test(trimmed)) {
    return 'Organization name can only contain letters, numbers, spaces, hyphens, underscores, and periods'
  }
  
  return ''
}

// Focus input when component mounts
onMounted(async () => {
  await nextTick()
  const input = document.getElementById('organization-name') as HTMLInputElement
  if (input) {
    input.focus()
  }
})
</script>

<style scoped>
.create-organization {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
}

.modal-content {
  position: relative;
  background-color: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 1.5rem 0 1.5rem;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 1.5rem;
}

.modal-header h2 {
  margin: 0;
  color: var(--color-heading);
  font-size: 1.5rem;
  font-weight: 600;
}

.close-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background-color: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: var(--color-text-light);
  transition: all 0.2s;
}

.close-button:hover {
  background-color: var(--color-background-soft);
  color: var(--color-text);
}

.close-button svg {
  width: 18px;
  height: 18px;
}

.create-form {
  padding: 0 1.5rem 1.5rem 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--color-text);
  font-weight: 500;
  font-size: 0.9rem;
}

.form-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 1rem;
  color: var(--color-text);
  background-color: var(--color-background);
  transition: all 0.2s;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-brand);
  box-shadow: 0 0 0 3px rgba(var(--color-brand-rgb), 0.1);
}

.form-input.error {
  border-color: var(--color-danger);
}

.form-input.error:focus {
  box-shadow: 0 0 0 3px rgba(var(--color-danger-rgb), 0.1);
}

.form-input:disabled {
  background-color: var(--color-background-mute);
  color: var(--color-text-light);
  cursor: not-allowed;
}

.error-message {
  margin-top: 0.5rem;
  color: var(--color-danger);
  font-size: 0.85rem;
}

.form-hint {
  margin-top: 0.5rem;
  color: var(--color-text-light);
  font-size: 0.85rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
}

.cancel-button,
.create-button {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.cancel-button {
  background-color: transparent;
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.cancel-button:hover:not(:disabled) {
  background-color: var(--color-background-soft);
  border-color: var(--color-border-hover);
}

.create-button {
  background-color: var(--color-brand);
  color: white;
  border: 1px solid var(--color-brand);
}

.create-button:hover:not(:disabled) {
  background-color: var(--color-brand-dark);
  border-color: var(--color-brand-dark);
}

.cancel-button:disabled,
.create-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.suggestion-section {
  border-top: 1px solid var(--color-border);
  padding: 1.5rem;
  background-color: var(--color-background-soft);
}

.suggestion-content {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.suggestion-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  background-color: var(--color-brand-light);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-brand);
}

.suggestion-icon svg {
  width: 20px;
  height: 20px;
}

.suggestion-text h3 {
  margin: 0 0 0.5rem 0;
  color: var(--color-heading);
  font-size: 1.1rem;
  font-weight: 600;
}

.suggestion-text p {
  margin: 0;
  color: var(--color-text-light);
  font-size: 0.9rem;
  line-height: 1.5;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .create-organization {
    padding: 0.5rem;
  }

  .modal-content {
    max-width: none;
  }

  .modal-header {
    padding: 1rem 1rem 0 1rem;
    margin-bottom: 1rem;
  }

  .modal-header h2 {
    font-size: 1.25rem;
  }

  .create-form {
    padding: 0 1rem 1rem 1rem;
  }

  .form-actions {
    flex-direction: column-reverse;
  }

  .cancel-button,
  .create-button {
    width: 100%;
    justify-content: center;
  }

  .suggestion-section {
    padding: 1rem;
  }

  .suggestion-content {
    flex-direction: column;
    text-align: center;
  }
}
</style>