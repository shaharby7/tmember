<template>
  <div class="settings-section">
    <div class="section-header">
      <h2>Settings</h2>
      <p>Manage your account and organization preferences</p>
    </div>
    
    <div class="section-content">
      <div class="settings-tabs">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          @click="activeTab = tab.id"
          class="tab-button"
          :class="{ 'active': activeTab === tab.id }"
        >
          <component :is="tab.icon" class="tab-icon" />
          {{ tab.label }}
        </button>
      </div>
      
      <div class="settings-content">
        <!-- Account Settings -->
        <div v-if="activeTab === 'account'" class="settings-panel">
          <div class="panel-header">
            <h3>Account Settings</h3>
            <p>Manage your personal account information</p>
          </div>
          
          <div class="settings-group">
            <label class="setting-label">Email Address</label>
            <div class="setting-field">
              <input 
                type="email" 
                :value="user?.email" 
                readonly 
                class="setting-input disabled"
              />
              <p class="setting-help">Your email address cannot be changed</p>
            </div>
          </div>
          
          <div class="settings-group">
            <label class="setting-label">Password</label>
            <div class="setting-field">
              <button class="setting-button secondary">
                Change Password
              </button>
              <p class="setting-help">Update your account password</p>
            </div>
          </div>
          
          <div class="settings-group">
            <label class="setting-label">Account Created</label>
            <div class="setting-field">
              <span class="setting-text">{{ formatDate(user?.created_at) }}</span>
            </div>
          </div>
        </div>
        
        <!-- Organization Settings -->
        <div v-if="activeTab === 'organization'" class="settings-panel">
          <div class="panel-header">
            <h3>Organization Settings</h3>
            <p v-if="currentOrganization">
              Settings for {{ currentOrganization.name }}
            </p>
            <p v-else>Select an organization to manage its settings</p>
          </div>
          
          <div v-if="!currentOrganization" class="no-organization">
            <div class="no-org-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <p>Please select an organization from the sidebar to manage its settings.</p>
          </div>
          
          <div v-else>
            <div class="settings-group">
              <label class="setting-label">Organization Name</label>
              <div class="setting-field">
                <input 
                  type="text" 
                  :value="currentOrganization.name" 
                  class="setting-input"
                  placeholder="Organization name"
                />
                <p class="setting-help">The display name for your organization</p>
              </div>
            </div>
            
            <div class="settings-group">
              <label class="setting-label">Description</label>
              <div class="setting-field">
                <textarea 
                  :value="currentOrganization.description || ''" 
                  class="setting-textarea"
                  placeholder="Organization description"
                  rows="3"
                ></textarea>
                <p class="setting-help">A brief description of your organization</p>
              </div>
            </div>
            
            <div class="settings-group">
              <label class="setting-label">Organization ID</label>
              <div class="setting-field">
                <input 
                  type="text" 
                  :value="currentOrganization.id" 
                  readonly 
                  class="setting-input disabled"
                />
                <p class="setting-help">Unique identifier for your organization</p>
              </div>
            </div>
            
            <div class="settings-actions">
              <button class="setting-button primary">
                Save Changes
              </button>
              <button class="setting-button danger">
                Delete Organization
              </button>
            </div>
          </div>
        </div>
        
        <!-- Preferences -->
        <div v-if="activeTab === 'preferences'" class="settings-panel">
          <div class="panel-header">
            <h3>Preferences</h3>
            <p>Customize your experience</p>
          </div>
          
          <div class="settings-group">
            <label class="setting-label">Theme</label>
            <div class="setting-field">
              <select class="setting-select">
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
              <p class="setting-help">Choose your preferred color theme</p>
            </div>
          </div>
          
          <div class="settings-group">
            <label class="setting-label">Email Notifications</label>
            <div class="setting-field">
              <label class="checkbox-label">
                <input type="checkbox" checked />
                <span class="checkbox-text">Member invitations</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" checked />
                <span class="checkbox-text">Organization updates</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" />
                <span class="checkbox-text">Weekly summaries</span>
              </label>
            </div>
          </div>
          
          <div class="settings-group">
            <label class="setting-label">Language</label>
            <div class="setting-field">
              <select class="setting-select">
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
              </select>
              <p class="setting-help">Choose your preferred language</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useOrganizationStore } from '../../stores/organization'

// Stores
const authStore = useAuthStore()
const organizationStore = useOrganizationStore()

// State
const activeTab = ref('account')

// Computed
const user = computed(() => authStore.user)
const currentOrganization = computed(() => organizationStore.currentOrganization)

// Tab configuration
const tabs = [
  {
    id: 'account',
    label: 'Account',
    icon: 'UserIcon'
  },
  {
    id: 'organization',
    label: 'Organization',
    icon: 'BuildingIcon'
  },
  {
    id: 'preferences',
    label: 'Preferences',
    icon: 'CogIcon'
  }
]

// Methods
const formatDate = (dateString: string | undefined) => {
  if (!dateString) return 'Unknown'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Icon components (inline SVG)
const UserIcon = {
  template: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  `
}

const BuildingIcon = {
  template: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M3 21h18"/>
      <path d="M5 21V7l8-4v18"/>
      <path d="M19 21V11l-6-4"/>
    </svg>
  `
}

const CogIcon = {
  template: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1m11-7a4 4 0 0 1 0 8 4 4 0 0 1 0-8z"/>
    </svg>
  `
}
</script>

<style scoped>
.settings-section {
  max-width: 1000px;
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

.settings-tabs {
  display: flex;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 2rem;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--color-text-light);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-button:hover {
  color: var(--color-text);
  background: var(--color-background-soft);
}

.tab-button.active {
  color: var(--color-brand);
  border-bottom-color: var(--color-brand);
}

.tab-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.settings-panel {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  padding: 2rem;
}

.panel-header {
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.panel-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-heading);
  margin: 0 0 0.5rem 0;
}

.panel-header p {
  color: var(--color-text-light);
  margin: 0;
}

.settings-group {
  margin-bottom: 2rem;
}

.settings-group:last-child {
  margin-bottom: 0;
}

.setting-label {
  display: block;
  font-weight: 500;
  color: var(--color-heading);
  margin-bottom: 0.5rem;
}

.setting-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.setting-input, .setting-textarea, .setting-select {
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  transition: border-color 0.2s;
}

.setting-input:focus, .setting-textarea:focus, .setting-select:focus {
  outline: none;
  border-color: var(--color-brand);
}

.setting-input.disabled {
  background: var(--color-background-soft);
  color: var(--color-text-light);
  cursor: not-allowed;
}

.setting-textarea {
  resize: vertical;
  min-height: 80px;
}

.setting-help {
  font-size: 0.75rem;
  color: var(--color-text-light);
  margin: 0;
}

.setting-text {
  color: var(--color-text);
  font-weight: 500;
}

.setting-button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.setting-button.primary {
  background: var(--color-brand);
  color: white;
}

.setting-button.primary:hover {
  background: var(--color-brand-dark);
}

.setting-button.secondary {
  background: var(--color-background-soft);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.setting-button.secondary:hover {
  background: var(--color-background-mute);
}

.setting-button.danger {
  background: var(--color-danger);
  color: white;
}

.setting-button.danger:hover {
  background: #c0392b;
}

.settings-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--color-border);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  margin: 0;
}

.checkbox-text {
  color: var(--color-text);
}

.no-organization {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-light);
}

.no-org-icon {
  width: 3rem;
  height: 3rem;
  margin: 0 auto 1rem;
  color: var(--color-text-light);
}

.no-org-icon svg {
  width: 100%;
  height: 100%;
}

@media (max-width: 768px) {
  .settings-tabs {
    flex-direction: column;
  }
  
  .tab-button {
    justify-content: flex-start;
    border-bottom: none;
    border-left: 2px solid transparent;
  }
  
  .tab-button.active {
    border-bottom-color: transparent;
    border-left-color: var(--color-brand);
  }
  
  .settings-panel {
    padding: 1.5rem;
  }
  
  .settings-actions {
    flex-direction: column;
  }
}
</style>