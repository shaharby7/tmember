<template>
  <aside class="sidebar" :class="{ 'sidebar-collapsed': isCollapsed }">
    <div class="sidebar-content">
      <!-- Organization Context -->
      <div class="organization-section">
        <div class="organization-selector">
          <OrganizationSelector
            :organizations="organizations"
            :memberships="memberships"
            :current-organization="currentOrganization"
            :is-loading="organizationStore.isLoading"
            @select-organization="handleOrganizationSwitch"
            @create-organization="showCreateOrganization"
          />
        </div>
      </div>

      <!-- Navigation Menu -->
      <nav class="sidebar-nav">
        <ul class="nav-list">
          <li class="nav-item">
            <button 
              @click="setActiveSection('organizations')"
              class="nav-button"
              :class="{ 'active': activeSection === 'organizations' }"
            >
              <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <span class="nav-text">Organizations</span>
            </button>
          </li>
          
          <li class="nav-item">
            <button 
              @click="setActiveSection('members')"
              class="nav-button"
              :class="{ 'active': activeSection === 'members' }"
            >
              <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <path d="M20 8v6M23 11h-6"/>
              </svg>
              <span class="nav-text">Members</span>
            </button>
          </li>
          
          <li class="nav-item">
            <button 
              @click="setActiveSection('settings')"
              class="nav-button"
              :class="{ 'active': activeSection === 'settings' }"
            >
              <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1m11-7a4 4 0 0 1 0 8 4 4 0 0 1 0-8z"/>
              </svg>
              <span class="nav-text">Settings</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>

    <!-- Mobile Toggle Button -->
    <button 
      v-if="isMobile" 
      @click="toggleSidebar" 
      class="sidebar-toggle"
      :class="{ 'sidebar-toggle-collapsed': isCollapsed }"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <line x1="3" y1="6" x2="21" y2="6"/>
        <line x1="3" y1="12" x2="21" y2="12"/>
        <line x1="3" y1="18" x2="21" y2="18"/>
      </svg>
    </button>

    <!-- Mobile Overlay -->
    <div 
      v-if="isMobile && !isCollapsed" 
      class="sidebar-overlay" 
      @click="closeSidebar"
    ></div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useOrganizationStore } from '../../stores/organization'
import OrganizationSelector from '../organization/OrganizationSelector.vue'
import type { Organization, OrganizationMembership } from '../../types/api'

// Props
interface Props {
  activeSection: string | null
}

const props = defineProps<Props>()

// Emits
interface Emits {
  (e: 'update:activeSection', value: string): void
  (e: 'select-organization', organization: Organization): void
  (e: 'create-organization'): void
}

const emit = defineEmits<Emits>()

// State
const isCollapsed = ref(true)
const isMobile = ref(false)

// Store
const organizationStore = useOrganizationStore()

// Computed
const organizations = computed(() => organizationStore.organizations)
const memberships = computed(() => organizationStore.memberships)
const currentOrganization = computed(() => organizationStore.currentOrganization)

// Methods
const setActiveSection = (section: string) => {
  emit('update:activeSection', section)
}

const handleOrganizationSwitch = (organization: Organization) => {
  emit('select-organization', organization)
}

const showCreateOrganization = () => {
  emit('create-organization')
}

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
}

const closeSidebar = () => {
  if (isMobile.value) {
    isCollapsed.value = true
  }
}

const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
  if (!isMobile.value) {
    isCollapsed.value = false
  }
}

// Lifecycle
onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<style scoped>
.sidebar {
  position: fixed;
  top: var(--topbar-height);
  left: 0;
  width: var(--sidebar-width);
  height: calc(100vh - var(--topbar-height));
  background: var(--color-background);
  border-right: 1px solid var(--color-border);
  transition: transform 0.3s ease;
  z-index: 50;
}

.sidebar-collapsed {
  transform: translateX(-100%);
}

.sidebar-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 1.5rem 0;
}

.organization-section {
  padding: 0 1.5rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 1.5rem;
}

.sidebar-nav {
  flex: 1;
  padding: 0 1rem;
}

.nav-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.nav-item {
  margin-bottom: 0.5rem;
}

.nav-button {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  border-radius: 0.5rem;
  color: var(--color-text);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.nav-button:hover {
  background: var(--color-background-soft);
  color: var(--color-brand);
}

.nav-button.active {
  background: var(--color-brand-light);
  color: var(--color-brand);
}

.nav-icon {
  width: 1.25rem;
  height: 1.25rem;
  margin-right: 0.75rem;
  stroke-width: 2;
}

.nav-text {
  flex: 1;
}

.sidebar-toggle {
  position: fixed;
  top: calc(var(--topbar-height) + 12px);
  left: 1rem;
  width: 2.5rem;
  height: 2.5rem;
  background: var(--color-brand);
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  z-index: 60;
}

.sidebar-toggle-collapsed {
  left: 1rem;
}

.sidebar-toggle:hover {
  background: var(--color-brand-dark);
  transform: scale(1.05);
}

.sidebar-toggle svg {
  width: 1.25rem;
  height: 1.25rem;
}

.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 40;
}

/* Desktop */
@media (min-width: 768px) {
  .sidebar {
    position: static;
    transform: none;
    height: calc(100vh - var(--topbar-height));
  }
  
  .sidebar-collapsed {
    transform: none;
  }
  
  .sidebar-toggle {
    display: none;
  }
  
  .sidebar-overlay {
    display: none;
  }
}
</style>