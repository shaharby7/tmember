<template>
  <div class="auth-view">
    <div class="auth-container">
      <div class="auth-header">
        <h1>TMember</h1>
        <p>Welcome to your organization management platform</p>
      </div>

      <div class="auth-forms">
        <LoginForm 
          v-if="!showSignup"
          ref="loginFormRef"
          @toggle="toggleForm"
          @submit="handleLogin"
        />
        
        <SignupForm 
          v-else
          ref="signupFormRef"
          @toggle="toggleForm"
          @submit="handleSignup"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import LoginForm from '../components/auth/LoginForm.vue'
import SignupForm from '../components/auth/SignupForm.vue'
import { useAuthStore } from '../stores/auth'
import type { LoginRequest, RegisterRequest } from '../types/api'

// Router and store
const router = useRouter()
const authStore = useAuthStore()

// Reactive state
const showSignup = ref(false)
const loginFormRef = ref<InstanceType<typeof LoginForm> | null>(null)
const signupFormRef = ref<InstanceType<typeof SignupForm> | null>(null)

// Methods
const toggleForm = () => {
  showSignup.value = !showSignup.value
}

const handleLogin = async (loginData: LoginRequest) => {
  try {
    if (loginFormRef.value?.setLoading) {
      loginFormRef.value.setLoading(true)
    }
    
    const result = await authStore.login(loginData)
    
    if (result.success) {
      // Redirect to dashboard on successful login
      router.push('/dashboard')
    } else {
      // Display error message
      const errorMessage = result.error?.message || 'Login failed. Please check your credentials.'
      if (loginFormRef.value?.setError) {
        loginFormRef.value.setError(errorMessage)
      }
    }
  } catch (error) {
    if (loginFormRef.value?.setError) {
      loginFormRef.value.setError('An unexpected error occurred. Please try again.')
    }
  }
}

const handleSignup = async (registerData: RegisterRequest) => {
  try {
    if (signupFormRef.value?.setLoading) {
      signupFormRef.value.setLoading(true)
    }
    
    const result = await authStore.register(registerData)
    
    if (result.success) {
      // Redirect to dashboard on successful registration
      router.push('/dashboard')
    } else {
      // Display error message
      const errorMessage = result.error?.message || 'Registration failed. Please try again.'
      if (signupFormRef.value?.setError) {
        signupFormRef.value.setError(errorMessage)
      }
    }
  } catch (error) {
    if (signupFormRef.value?.setError) {
      signupFormRef.value.setError('An unexpected error occurred. Please try again.')
    }
  }
}
</script>

<style scoped>
.auth-view {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-background) 0%, var(--color-background-soft) 100%);
  padding: 2rem 1rem;
}

.auth-container {
  width: 100%;
  max-width: 500px;
}

.auth-header {
  text-align: center;
  margin-bottom: 3rem;
}

.auth-header h1 {
  font-size: 3rem;
  font-weight: bold;
  color: var(--color-heading);
  margin: 0 0 1rem 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.auth-header p {
  font-size: 1.1rem;
  color: var(--color-text-light);
  margin: 0;
}

.auth-forms {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .auth-view {
    padding: 1rem 0.5rem;
  }
  
  .auth-header h1 {
    font-size: 2.5rem;
  }
  
  .auth-header p {
    font-size: 1rem;
  }
  
  .auth-header {
    margin-bottom: 2rem;
  }
}
</style>