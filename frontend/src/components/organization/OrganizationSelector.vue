<template>
  <div class="organization-selector">
    <div class="current-organization" @click="toggleDropdown">
      <div class="org-info">
        <span class="org-name">{{ currentOrganization?.name || 'No Organization' }}</span>
        <span class="org-role" v-if="currentOrganization">{{ currentRole }}</span>
      </div>
      <svg class="dropdown-icon" :class="{ 'open': isDropdownOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <polyline points="6,9 12,15 18,9"></polyline>
      </svg>
    </div>

    <div v-if="isDropdownOpen" class="dropdown-menu">
      <div class="dropdown-header">
        <span>Switch Organization</span>
      </div>

      <div v-if="isLoading" class="dropdown-loading">
        <span>Loading organizations...</span>
      </div>

      <div v-else-if="organizations.length === 0" class="dropdown-empty">
        <span>No organizations found</span>
        <button @click="showCreateForm" class="create-org-button">
          Create Organization
        </button>
      </div>

      <div v-else class="organizations-list">
        <div
          v-for="org in organizations"
          :key="org.id"
          class="organization-item"
          :class="{ 'active': currentOrganization?.id === org.id }"
          @click="selectOrganization(org)"
        >
          <div class="org-details">
            <span class="org-name">{{ org.name }}</span>
            <span class="org-role">{{ getUserRole(org.id) }}</span>
          </div>
          <svg v-if="currentOrganization?.id === org.id" class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="20,6 9,17 4,12"></polyline>
          </svg>
        </div>
      </div>

      <div class="dropdown-footer">
        <button @click="showCreateForm" class="create-org-button">
          <svg class="plus-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Create New Organization
        </button>
      </div>
    </div>

    <!-- Overlay to close dropdown when clicking outside -->
    <div v-if="isDropdownOpen" class="dropdown-overlay" @click="closeDropdown"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { Organization, OrganizationMembership } from '../../types/api'

// Props
interface Props {
  organizations: Organization[]
  memberships: OrganizationMembership[]
  currentOrganization: Organization | null
  isLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false
})

// Emits
interface Emits {
  (e: 'select-organization', organization: Organization): void
  (e: 'create-organization'): void
}

const emit = defineEmits<Emits>()

// State
const isDropdownOpen = ref(false)

// Computed
const currentRole = computed(() => {
  if (!props.currentOrganization) return ''
  
  const membership = props.memberships.find(
    m => m.organization_id === props.currentOrganization!.id
  )
  return membership?.role === 'admin' ? 'Admin' : 'Member'
})

// Methods
const toggleDropdown = () => {
  isDropdownOpen.value = !isDropdownOpen.value
}

const closeDropdown = () => {
  isDropdownOpen.value = false
}

const selectOrganization = (organization: Organization) => {
  if (organization.id !== props.currentOrganization?.id) {
    emit('select-organization', organization)
  }
  closeDropdown()
}

const showCreateForm = () => {
  emit('create-organization')
  closeDropdown()
}

const getUserRole = (organizationId: number): string => {
  const membership = props.memberships.find(m => m.organization_id === organizationId)
  return membership?.role === 'admin' ? 'Admin' : 'Member'
}

// Handle escape key to close dropdown
const handleEscapeKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isDropdownOpen.value) {
    closeDropdown()
  }
}

// Lifecycle
onMounted(() => {
  document.addEventListener('keydown', handleEscapeKey)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscapeKey)
})
</script>

<style scoped>
.organization-selector {
  position: relative;
  display: inline-block;
}

.current-organization {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 200px;
}

.current-organization:hover {
  background-color: var(--color-background-mute);
  border-color: var(--color-border-hover);
}

.org-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.org-name {
  font-weight: 500;
  color: var(--color-text);
  font-size: 0.9rem;
}

.org-role {
  font-size: 0.75rem;
  color: var(--color-text-light);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.dropdown-icon {
  width: 16px;
  height: 16px;
  color: var(--color-text-light);
  transition: transform 0.2s;
}

.dropdown-icon.open {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  margin-top: 4px;
  max-height: 300px;
  overflow-y: auto;
}

.dropdown-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
}

.dropdown-header {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
  font-weight: 500;
  color: var(--color-text);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.dropdown-loading,
.dropdown-empty {
  padding: 2rem 1rem;
  text-align: center;
  color: var(--color-text-light);
}

.organizations-list {
  max-height: 200px;
  overflow-y: auto;
}

.organization-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.organization-item:hover {
  background-color: var(--color-background-soft);
}

.organization-item.active {
  background-color: var(--color-brand-light);
}

.org-details {
  display: flex;
  flex-direction: column;
}

.organization-item .org-name {
  font-weight: 500;
  color: var(--color-text);
  font-size: 0.9rem;
}

.organization-item .org-role {
  font-size: 0.75rem;
  color: var(--color-text-light);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.check-icon {
  width: 16px;
  height: 16px;
  color: var(--color-brand);
}

.dropdown-footer {
  border-top: 1px solid var(--color-border);
  padding: 0.5rem;
}

.create-org-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 1rem;
  background-color: transparent;
  color: var(--color-brand);
  border: 1px solid var(--color-brand);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s;
}

.create-org-button:hover {
  background-color: var(--color-brand);
  color: white;
}

.plus-icon {
  width: 14px;
  height: 14px;
}

/* Scrollbar styling for dropdown */
.dropdown-menu::-webkit-scrollbar,
.organizations-list::-webkit-scrollbar {
  width: 6px;
}

.dropdown-menu::-webkit-scrollbar-track,
.organizations-list::-webkit-scrollbar-track {
  background: var(--color-background-soft);
}

.dropdown-menu::-webkit-scrollbar-thumb,
.organizations-list::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 3px;
}

.dropdown-menu::-webkit-scrollbar-thumb:hover,
.organizations-list::-webkit-scrollbar-thumb:hover {
  background: var(--color-border-hover);
}
</style>