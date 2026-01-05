<template>
  <form @submit.prevent="handleSubmit" class="login-form">
    <h2>Sign In</h2>
    
    <div class="form-group">
      <label for="email">Email</label>
      <input
        id="email"
        v-model="form.email"
        type="email"
        required
        :disabled="loading"
        :class="{ 'error': errors.email }"
        @blur="validateEmail"
        @input="clearError('email')"
      />
      <span v-if="errors.email" class="error-message">{{ errors.email }}</span>
    </div>

    <div class="form-group">
      <label for="password">Password</label>
      <input
        id="password"
        v-model="form.password"
        type="password"
        required
        :disabled="loading"
        :class="{ 'error': errors.password }"
        @input="clearError('password')"
      />
      <span v-if="errors.password" class="error-message">{{ errors.password }}</span>
    </div>

    <div v-if="errors.general" class="error-message general-error">
      {{ errors.general }}
    </div>

    <button 
      type="submit" 
      :disabled="loading || !isFormValid"
      class="submit-button"
    >
      {{ loading ? 'Signing In...' : 'Sign In' }}
    </button>

    <p class="toggle-text">
      Don't have an account? 
      <button type="button" @click="emit('toggle')" class="toggle-button">
        Sign up here
      </button>
    </p>
  </form>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { LoginRequest } from '../../types/api'

// Props and emits
const emit = defineEmits<{
  toggle: []
  submit: [data: LoginRequest]
}>()

// Reactive state
const loading = ref(false)
const form = ref<LoginRequest>({
  email: '',
  password: ''
})

const errors = ref<{
  email?: string
  password?: string
  general?: string
}>({})

// Computed properties
const isFormValid = computed(() => {
  return form.value.email.trim() !== '' && 
         form.value.password !== '' && 
         !errors.value.email &&
         !errors.value.password
})

// Methods
const validateEmail = () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!form.value.email) {
    errors.value.email = 'Email is required'
  } else if (!emailRegex.test(form.value.email)) {
    errors.value.email = 'Please enter a valid email address'
  } else {
    errors.value.email = undefined
  }
}

const clearError = (field: keyof typeof errors.value) => {
  errors.value[field] = undefined
}

const handleSubmit = async () => {
  // Validate form
  validateEmail()
  
  if (!form.value.password) {
    errors.value.password = 'Password is required'
  }

  if (!isFormValid.value) {
    return
  }

  loading.value = true
  errors.value.general = undefined

  try {
    // Emit the form data to parent component
    const loginData: LoginRequest = {
      email: form.value.email.trim(),
      password: form.value.password
    }
    
    // Emit the submit event to parent component
    emit('submit', loginData)
    
  } catch (error) {
    errors.value.general = 'An unexpected error occurred'
    loading.value = false
  }
}

// Expose methods for parent component to call
const setError = (message: string) => {
  errors.value.general = message
  loading.value = false
}

const setLoading = (isLoading: boolean) => {
  loading.value = isLoading
}

defineExpose({
  setError,
  setLoading
})
</script>

<style scoped>
.login-form {
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem;
  background: var(--color-background-soft);
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.login-form h2 {
  text-align: center;
  margin-bottom: 2rem;
  color: var(--color-heading);
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--color-text);
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: var(--color-border-hover);
}

.form-group input.error {
  border-color: #dc3545;
}

.form-group input:disabled {
  background-color: var(--color-background-mute);
  cursor: not-allowed;
}

.error-message {
  color: #dc3545;
  font-size: 0.875rem;
  margin-top: 0.25rem;
  display: block;
}

.general-error {
  text-align: center;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
}

.submit-button {
  width: 100%;
  padding: 0.75rem;
  background-color: var(--color-brand);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.submit-button:hover:not(:disabled) {
  background-color: var(--color-brand-dark);
}

.submit-button:disabled {
  background-color: var(--color-background-mute);
  cursor: not-allowed;
}

.toggle-text {
  text-align: center;
  margin-top: 1.5rem;
  color: var(--color-text-light);
}

.toggle-button {
  background: none;
  border: none;
  color: var(--color-brand);
  cursor: pointer;
  text-decoration: underline;
  font-size: inherit;
}

.toggle-button:hover {
  color: var(--color-brand-dark);
}
</style>