<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { useOrganizationStore } from './stores/organization'

const authStore = useAuthStore()
const organizationStore = useOrganizationStore()

// Initialize authentication state when app starts
onMounted(async () => {
  await authStore.initializeAuth()
  
  // Initialize organization state if authenticated
  if (authStore.isAuthenticated) {
    organizationStore.initializeOrganizations()
  }
})
</script>

<template>
  <div id="app">
    <RouterView />
  </div>
</template>

<style scoped>
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>
