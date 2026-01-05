<template>
  <form @submit.prevent="handleSubmit" class="signup-form">
    <h2>Create Account</h2>
    
    <div class="form-group">
      <label for="signup-email">Email</label>
      <input
        id="signup-email"
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
      <label for="signup-password">Password</label>
      <input
        id="signup-password"
        v-model="form.password"
        type="password"
        required
        :disabled="loading"
        :class="{ 'error': errors.password }"
        @blur="validatePassword"
        @input="clearError('password')"
      />
      <span v-if="errors.password" class="error-message">{{ errors.password }}</span>
      <div class="password-requirements">
        <p>Password must:</p>
        <ul>
          <li :class="{ 'valid': passwordChecks.length }">Be at least 8 characters long</li>
          <li :class="{ 'valid': passwordChecks.uppercase }">Contain at least one uppercase letter</li>
          <li :class="{ 'valid': passwordChecks.lowercase }">Contain at least one lowercase letter</li>
          <li :class="{ 'valid': passwordChecks.number }">Contain at least one number</li>
        </ul>
      </div>
    </div>

    <div class="form-group">
      <label for="confirm-password">Confirm Password</label>
      <input
        id="confirm-password"
        v-model="confirmPassword"
        type="password"
        required
        :disabled="loading"
        :class="{ 'error': errors.confirmPassword }"
        @blur="validateConfirmPassword"
        @input="clearError('confirmPassword')"
      />
      <span v-if="errors.confirmPassword" class="error-message">{{ errors.confirmPassword }}</span>
    </div>

    <div v-if="errors.general" class="error-message general-error">
      {{ errors.general }}
    </div>

    <button 
      type="submit" 
      :disabled="loading || !isFormValid"
      class="submit-button"
    >
      {{ loading ? 'Creating Account...' : 'Create Account' }}
    </button>

    <p class="toggle-text">
      Already have an account? 
      <button type="button" @click="emit('toggle')" class="toggle-button">
        Sign in here
      </button>
    </p>
  </form>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { RegisterRequest } from '../../types/api'

// Props and emits
const emit = defineEmits<{
  toggle: []
  submit: [data: RegisterRequest]
}>()

// Reactive state
const loading = ref(false)
const form = ref<RegisterRequest>({
  email: '',
  password: ''
})
const confirmPassword = ref('')

const errors = ref<{
  email?: string
  password?: string
  confirmPassword?: string
  general?: string
}>({})

// Computed properties
const passwordChecks = computed(() => {
  const password = form.value.password
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password)
  }
})

const isPasswordValid = computed(() => {
  return Object.values(passwordChecks.value).every(check => check)
})

const isFormValid = computed(() => {
  return form.value.email.trim() !== '' && 
         form.value.password !== '' &&
         confirmPassword.value !== '' &&
         !errors.value.email &&
         !errors.value.password &&
         !errors.value.confirmPassword &&
         isPasswordValid.value
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

const validatePassword = () => {
  if (!form.value.password) {
    errors.value.password = 'Password is required'
  } else if (!isPasswordValid.value) {
    errors.value.password = 'Password does not meet security requirements'
  } else {
    errors.value.password = undefined
  }
  
  // Re-validate confirm password if it has been entered
  if (confirmPassword.value) {
    validateConfirmPassword()
  }
}

const validateConfirmPassword = () => {
  if (!confirmPassword.value) {
    errors.value.confirmPassword = 'Please confirm your password'
  } else if (confirmPassword.value !== form.value.password) {
    errors.value.confirmPassword = 'Passwords do not match'
  } else {
    errors.value.confirmPassword = undefined
  }
}

const clearError = (field: keyof typeof errors.value) => {
  errors.value[field] = undefined
}

const handleSubmit = async () => {
  // Validate all fields
  validateEmail()
  validatePassword()
  validateConfirmPassword()

  if (!isFormValid.value) {
    return
  }

  loading.value = true
  errors.value.general = undefined

  try {
    // Emit the form data to parent component
    const registerData: RegisterRequest = {
      email: form.value.email.trim(),
      password: form.value.password
    }
    
    // Emit the submit event to parent component
    emit('submit', registerData)
    
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
.signup-form {
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem;
  background: var(--color-background-soft);
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.signup-form h2 {
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

.password-requirements {
  margin-top: 0.5rem;
  padding: 0.75rem;
  background-color: var(--color-background-mute);
  border-radius: 4px;
  font-size: 0.875rem;
}

.password-requirements p {
  margin: 0 0 0.5rem 0;
  font-weight: 500;
  color: var(--color-text);
}

.password-requirements ul {
  margin: 0;
  padding-left: 1.25rem;
  list-style: none;
}

.password-requirements li {
  margin-bottom: 0.25rem;
  color: #dc3545;
  position: relative;
}

.password-requirements li::before {
  content: '✗';
  position: absolute;
  left: -1.25rem;
  font-weight: bold;
}

.password-requirements li.valid {
  color: #28a745;
}

.password-requirements li.valid::before {
  content: '✓';
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