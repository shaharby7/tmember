<template>
  <div class="main-layout">
    <TopBar />
    
    <div class="layout-body">
      <Sidebar 
        :active-section="activeSection"
        @update:active-section="setActiveSection"
        @select-organization="handleOrganizationSwitch"
        @create-organization="showCreateOrganization"
      />
      
      <main class="main-content">
        <slot :activeSection="activeSection" />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import TopBar from './TopBar.vue'
import Sidebar from './Sidebar.vue'
import type { Organization } from '../../types/api'

// State
const activeSection = ref<string | null>(null)

// Emits
interface Emits {
  (e: 'select-organization', organization: Organization): void
  (e: 'create-organization'): void
}

const emit = defineEmits<Emits>()

// Methods
const setActiveSection = (section: string) => {
  activeSection.value = section
}

const handleOrganizationSwitch = (organization: Organization) => {
  emit('select-organization', organization)
}

const showCreateOrganization = () => {
  emit('create-organization')
}
</script>

<style scoped>
.main-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.layout-body {
  display: flex;
  flex: 1;
}

.main-content {
  flex: 1;
  padding: 2rem;
  margin-left: var(--sidebar-width);
  min-height: calc(100vh - var(--topbar-height));
  background: var(--color-background-soft);
}

/* Mobile */
@media (max-width: 767px) {
  .main-content {
    margin-left: 0;
    padding: 1rem;
  }
}
</style>