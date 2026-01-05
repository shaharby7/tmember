<template>
  <header class="top-bar">
    <div class="top-bar-content">
      <div class="top-bar-left">
        <h1 class="app-title">TMember</h1>
      </div>
      
      <div class="top-bar-right">
        <div class="user-info">
          <span class="user-email">{{ user?.email }}</span>
          <button @click="handleLogout" class="logout-button">
            Logout
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
const router = useRouter()

const user = computed(() => authStore.user)

const handleLogout = async () => {
  await authStore.logout()
  router.push('/auth')
}
</script>

<style scoped>
.top-bar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--color-background);
  border-bottom: 1px solid var(--color-border);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.top-bar-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  max-width: none;
  width: 100%;
}

.top-bar-left {
  display: flex;
  align-items: center;
}

.app-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-brand);
  margin: 0;
}

.top-bar-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-email {
  color: var(--color-text);
  font-weight: 500;
}

.logout-button {
  padding: 0.5rem 1rem;
  background: var(--color-danger);
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.logout-button:hover {
  background: #c0392b;
}

@media (max-width: 768px) {
  .top-bar-content {
    padding: 1rem;
  }
  
  .user-email {
    display: none;
  }
}
</style>