<template>
  <div class="dashboard-view">
    <MainLayout
      @select-organization="handleOrganizationSwitch"
      @create-organization="showCreateOrganization"
    >
      <template #default="{ activeSection }">
        <div class="dashboard-content">
          <!-- Default Dashboard Content (when no section is selected) -->
          <div v-if="!activeSection" class="dashboard-welcome">
            <div class="welcome-header">
              <h1>Welcome back, {{ user?.email?.split('@')[0] }}!</h1>
              <p v-if="currentOrganization">
                You're currently managing <strong>{{ currentOrganization.name }}</strong>
              </p>
              <p v-else>
                Select an organization from the sidebar to get started
              </p>
            </div>

            <!-- Organization creation suggestion for new users -->
            <div v-if="shouldShowOrganizationSuggestion" class="organization-suggestion">
              <div class="suggestion-content">
                <div class="suggestion-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <div class="suggestion-text">
                  <h3>Create Your First Organization</h3>
                  <p>Get started by creating an organization to manage your team and projects.</p>
                </div>
                <div class="suggestion-actions">
                  <button @click="showCreateOrganization" class="create-org-btn">
                    Create Organization
                  </button>
                  <button @click="dismissSuggestion" class="dismiss-btn">
                    Maybe Later
                  </button>
                </div>
              </div>
            </div>

            <!-- Quick Stats -->
            <div v-else class="dashboard-stats">
              <div class="stat-card">
                <div class="stat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <div class="stat-content">
                  <div class="stat-number">{{ organizations.length }}</div>
                  <div class="stat-label">Organizations</div>
                </div>
              </div>
              
              <div class="stat-card">
                <div class="stat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="8.5" cy="7" r="4"/>
                    <path d="M20 8v6M23 11h-6"/>
                  </svg>
                </div>
                <div class="stat-content">
                  <div class="stat-number">{{ totalMembers }}</div>
                  <div class="stat-label">Total Members</div>
                </div>
              </div>
              
              <div class="stat-card">
                <div class="stat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1m11-7a4 4 0 0 1 0 8 4 4 0 0 1 0-8z"/>
                  </svg>
                </div>
                <div class="stat-content">
                  <div class="stat-number">{{ userRole }}</div>
                  <div class="stat-label">Your Role</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Section Components -->
          <OrganizationsSection
            v-if="activeSection === 'organizations'"
            @select-organization="handleOrganizationSwitch"
            @create-organization="showCreateOrganization"
          />
          
          <MembersSection v-if="activeSection === 'members'" />
          
          <SettingsSection v-if="activeSection === 'settings'" />
        </div>
      </template>
    </MainLayout>

    <!-- Create Organization Modal -->
    <CreateOrganization
      v-if="showCreateModal"
      :is-loading="organizationStore.isLoading"
      :error-message="organizationStore.lastError || ''"
      :show-suggestion="shouldShowOrganizationSuggestion"
      @create="handleCreateOrganization"
      @cancel="hideCreateOrganization"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useOrganizationStore } from '../stores/organization'
import MainLayout from '../components/layout/MainLayout.vue'
import OrganizationsSection from '../components/dashboard/OrganizationsSection.vue'
import MembersSection from '../components/dashboard/MembersSection.vue'
import SettingsSection from '../components/dashboard/SettingsSection.vue'
import CreateOrganization from '../components/organization/CreateOrganization.vue'
import type { Organization } from '../types/api'

// Stores
const authStore = useAuthStore()
const organizationStore = useOrganizationStore()

// State
const showCreateModal = ref(false)
const suggestionDismissed = ref(false)

// Computed properties
const user = computed(() => authStore.user)
const organizations = computed(() => organizationStore.organizations)
const memberships = computed(() => organizationStore.memberships)
const currentOrganization = computed(() => organizationStore.currentOrganization)

const shouldShowOrganizationSuggestion = computed(() => {
  return !suggestionDismissed.value && 
         organizations.value.length === 0 && 
         !organizationStore.isLoading &&
         !showCreateModal.value
})

const totalMembers = computed(() => {
  // This would come from API in real implementation
  return organizations.value.reduce((total, org) => total + Math.floor(Math.random() * 10) + 1, 0)
})

const userRole = computed(() => {
  if (!currentOrganization.value) return 'N/A'
  const membership = memberships.value.find(m => m.organization_id === currentOrganization.value?.id)
  return membership?.role || 'Member'
})

// Methods
const showCreateOrganization = () => {
  showCreateModal.value = true
  organizationStore.clearError()
}

const hideCreateOrganization = () => {
  showCreateModal.value = false
  organizationStore.clearError()
}

const handleCreateOrganization = async (name: string) => {
  const success = await organizationStore.createOrganization(name)
  if (success) {
    hideCreateOrganization()
    suggestionDismissed.value = true
  }
}

const handleOrganizationSwitch = async (organization: Organization) => {
  await organizationStore.switchOrganization(organization.id)
}

const dismissSuggestion = () => {
  suggestionDismissed.value = true
}

// Lifecycle
onMounted(async () => {
  // Load organizations when component mounts
  await organizationStore.loadOrganizations()
})
</script>

<style scoped>
.dashboard-view {
  min-height: 100vh;
  background: var(--color-background-soft);
}

.dashboard-content {
  max-width: 1200px;
}

.dashboard-welcome {
  margin-bottom: 2rem;
}

.welcome-header {
  margin-bottom: 2rem;
}

.welcome-header h1 {
  font-size: 2rem;
  font-weight: 600;
  color: var(--color-heading);
  margin: 0 0 0.5rem 0;
}

.welcome-header p {
  color: var(--color-text-light);
  margin: 0;
  font-size: 1.1rem;
}

.organization-suggestion {
  background: linear-gradient(135deg, var(--color-brand-light), var(--color-brand-soft));
  border: 1px solid var(--color-brand);
  border-radius: 0.75rem;
  padding: 2rem;
  margin-bottom: 2rem;
}

.suggestion-content {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.suggestion-icon {
  flex-shrink: 0;
  width: 3rem;
  height: 3rem;
  background: var(--color-brand);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.suggestion-icon svg {
  width: 1.5rem;
  height: 1.5rem;
}

.suggestion-text {
  flex: 1;
}

.suggestion-text h3 {
  margin: 0 0 0.5rem 0;
  color: var(--color-heading);
  font-size: 1.25rem;
  font-weight: 600;
}

.suggestion-text p {
  margin: 0;
  color: var(--color-text);
}

.suggestion-actions {
  display: flex;
  gap: 1rem;
  flex-shrink: 0;
}

.create-org-btn,
.dismiss-btn {
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.create-org-btn {
  background: var(--color-brand);
  color: white;
  border: none;
}

.create-org-btn:hover {
  background: var(--color-brand-dark);
}

.dismiss-btn {
  background: transparent;
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.dismiss-btn:hover {
  background: var(--color-background-soft);
}

.dashboard-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.2s;
}

.stat-card:hover {
  border-color: var(--color-brand);
  box-shadow: 0 4px 12px rgba(var(--color-brand-rgb), 0.15);
}

.stat-icon {
  width: 2.5rem;
  height: 2.5rem;
  background: var(--color-brand-light);
  color: var(--color-brand);
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon svg {
  width: 1.25rem;
  height: 1.25rem;
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-heading);
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--color-text-light);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

@media (max-width: 768px) {
  .suggestion-content {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
  }

  .suggestion-actions {
    flex-direction: column;
    width: 100%;
  }

  .create-org-btn,
  .dismiss-btn {
    width: 100%;
  }

  .dashboard-stats {
    grid-template-columns: 1fr;
  }
}
</style>