<template>
  <div class="organizations-section">
    <div class="section-header">
      <h2>Organizations</h2>
      <p>Manage your organizations and their settings</p>
    </div>
    
    <div class="section-content">
      <div v-if="isLoading" class="loading-state">
        <p>Loading organizations...</p>
      </div>
      
      <div v-else-if="organizations.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <h3>No Organizations Yet</h3>
        <p>Create your first organization to get started with team management.</p>
        <button @click="$emit('create-organization')" class="create-button">
          Create Organization
        </button>
      </div>
      
      <div v-else class="organizations-grid">
        <div 
          v-for="org in organizations" 
          :key="org.id"
          class="organization-card"
          :class="{ 'current': currentOrganization?.id === org.id }"
        >
          <div class="org-header">
            <h3>{{ org.name }}</h3>
            <span class="org-role">{{ getUserRole(org.id) }}</span>
          </div>
          <p class="org-description">{{ org.description || 'No description provided' }}</p>
          <div class="org-stats">
            <span class="stat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <path d="M20 8v6M23 11h-6"/>
              </svg>
              {{ getMemberCount(org.id) }} members
            </span>
          </div>
          <div class="org-actions">
            <button 
              v-if="currentOrganization?.id !== org.id"
              @click="$emit('select-organization', org)"
              class="switch-button"
            >
              Switch to
            </button>
            <span v-else class="current-badge">Current</span>
          </div>
        </div>
        
        <div class="organization-card create-card">
          <div class="create-content">
            <div class="create-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </div>
            <h3>Create New Organization</h3>
            <p>Start a new organization to manage another team or project.</p>
            <button @click="$emit('create-organization')" class="create-button">
              Create Organization
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useOrganizationStore } from '../../stores/organization'
import type { Organization } from '../../types/api'

// Emits
interface Emits {
  (e: 'select-organization', organization: Organization): void
  (e: 'create-organization'): void
}

defineEmits<Emits>()

// Store
const organizationStore = useOrganizationStore()

// Computed
const organizations = computed(() => organizationStore.organizations)
const memberships = computed(() => organizationStore.memberships)
const currentOrganization = computed(() => organizationStore.currentOrganization)
const isLoading = computed(() => organizationStore.isLoading)

// Methods
const getUserRole = (orgId: string) => {
  const membership = memberships.value.find(m => m.organization_id === orgId)
  return membership?.role || 'Member'
}

const getMemberCount = (orgId: string) => {
  // This would come from API in real implementation
  return Math.floor(Math.random() * 20) + 1
}
</script>

<style scoped>
.organizations-section {
  max-width: 1200px;
}

.section-header {
  margin-bottom: 2rem;
}

.section-header h2 {
  font-size: 1.875rem;
  font-weight: 600;
  color: var(--color-heading);
  margin: 0 0 0.5rem 0;
}

.section-header p {
  color: var(--color-text-light);
  margin: 0;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 3rem 1rem;
}

.empty-icon {
  width: 4rem;
  height: 4rem;
  margin: 0 auto 1rem;
  color: var(--color-text-light);
}

.empty-icon svg {
  width: 100%;
  height: 100%;
}

.empty-state h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-heading);
  margin: 0 0 0.5rem 0;
}

.empty-state p {
  color: var(--color-text-light);
  margin: 0 0 1.5rem 0;
}

.organizations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.organization-card {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  padding: 1.5rem;
  transition: all 0.2s;
}

.organization-card:hover {
  border-color: var(--color-brand);
  box-shadow: 0 4px 12px rgba(var(--color-brand-rgb), 0.15);
}

.organization-card.current {
  border-color: var(--color-brand);
  background: var(--color-brand-soft);
}

.org-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.org-header h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-heading);
  margin: 0;
}

.org-role {
  background: var(--color-brand-light);
  color: var(--color-brand);
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.org-description {
  color: var(--color-text-light);
  margin: 0 0 1rem 0;
  line-height: 1.5;
}

.org-stats {
  margin-bottom: 1rem;
}

.stat {
  display: flex;
  align-items: center;
  color: var(--color-text-light);
  font-size: 0.875rem;
}

.stat svg {
  width: 1rem;
  height: 1rem;
  margin-right: 0.5rem;
}

.org-actions {
  display: flex;
  justify-content: flex-end;
}

.switch-button {
  padding: 0.5rem 1rem;
  background: var(--color-brand);
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.switch-button:hover {
  background: var(--color-brand-dark);
}

.current-badge {
  background: var(--color-brand);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.create-card {
  border: 2px dashed var(--color-border);
  background: var(--color-background-soft);
}

.create-card:hover {
  border-color: var(--color-brand);
  background: var(--color-brand-soft);
}

.create-content {
  text-align: center;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.create-icon {
  width: 2.5rem;
  height: 2.5rem;
  margin: 0 auto 1rem;
  color: var(--color-brand);
}

.create-icon svg {
  width: 100%;
  height: 100%;
}

.create-content h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-heading);
  margin: 0 0 0.5rem 0;
}

.create-content p {
  color: var(--color-text-light);
  margin: 0 0 1.5rem 0;
  font-size: 0.875rem;
}

.create-button {
  padding: 0.75rem 1.5rem;
  background: var(--color-brand);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.create-button:hover {
  background: var(--color-brand-dark);
}
</style>