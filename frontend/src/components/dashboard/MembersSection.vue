<template>
  <div class="members-section">
    <div class="section-header">
      <h2>Members</h2>
      <p v-if="currentOrganization">
        Manage members for {{ currentOrganization.name }}
      </p>
      <p v-else>Select an organization to manage members</p>
    </div>
    
    <div class="section-content">
      <div v-if="!currentOrganization" class="no-organization">
        <div class="no-org-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <h3>No Organization Selected</h3>
        <p>Please select an organization from the sidebar to manage its members.</p>
      </div>
      
      <div v-else class="members-content">
        <div class="members-header">
          <div class="members-stats">
            <div class="stat-card">
              <div class="stat-number">{{ mockMembers.length }}</div>
              <div class="stat-label">Total Members</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">{{ activeMembers }}</div>
              <div class="stat-label">Active</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">{{ adminMembers }}</div>
              <div class="stat-label">Admins</div>
            </div>
          </div>
          
          <button class="invite-button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="8.5" cy="7" r="4"/>
              <path d="M20 8v6M23 11h-6"/>
            </svg>
            Invite Member
          </button>
        </div>
        
        <div class="members-table">
          <div class="table-header">
            <div class="header-cell">Member</div>
            <div class="header-cell">Role</div>
            <div class="header-cell">Status</div>
            <div class="header-cell">Joined</div>
            <div class="header-cell">Actions</div>
          </div>
          
          <div class="table-body">
            <div v-for="member in mockMembers" :key="member.id" class="table-row">
              <div class="cell member-cell">
                <div class="member-avatar">
                  {{ member.name.charAt(0).toUpperCase() }}
                </div>
                <div class="member-info">
                  <div class="member-name">{{ member.name }}</div>
                  <div class="member-email">{{ member.email }}</div>
                </div>
              </div>
              
              <div class="cell">
                <span class="role-badge" :class="member.role.toLowerCase()">
                  {{ member.role }}
                </span>
              </div>
              
              <div class="cell">
                <span class="status-badge" :class="member.status.toLowerCase()">
                  {{ member.status }}
                </span>
              </div>
              
              <div class="cell">
                {{ formatDate(member.joinedAt) }}
              </div>
              
              <div class="cell actions-cell">
                <button class="action-button">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="1"/>
                    <circle cx="12" cy="5" r="1"/>
                    <circle cx="12" cy="19" r="1"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useOrganizationStore } from '../../stores/organization'

// Store
const organizationStore = useOrganizationStore()

// Computed
const currentOrganization = computed(() => organizationStore.currentOrganization)

// Mock data for demonstration
const mockMembers = ref([
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'Admin',
    status: 'Active',
    joinedAt: new Date('2024-01-15')
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: 'Member',
    status: 'Active',
    joinedAt: new Date('2024-02-20')
  },
  {
    id: '3',
    name: 'Bob Johnson',
    email: 'bob@example.com',
    role: 'Member',
    status: 'Pending',
    joinedAt: new Date('2024-03-10')
  },
  {
    id: '4',
    name: 'Alice Brown',
    email: 'alice@example.com',
    role: 'Admin',
    status: 'Active',
    joinedAt: new Date('2024-01-30')
  }
])

const activeMembers = computed(() => 
  mockMembers.value.filter(m => m.status === 'Active').length
)

const adminMembers = computed(() => 
  mockMembers.value.filter(m => m.role === 'Admin').length
)

// Methods
const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script>

<style scoped>
.members-section {
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

.no-organization {
  text-align: center;
  padding: 3rem 1rem;
}

.no-org-icon {
  width: 4rem;
  height: 4rem;
  margin: 0 auto 1rem;
  color: var(--color-text-light);
}

.no-org-icon svg {
  width: 100%;
  height: 100%;
}

.no-organization h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-heading);
  margin: 0 0 0.5rem 0;
}

.no-organization p {
  color: var(--color-text-light);
  margin: 0;
}

.members-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 2rem;
  gap: 2rem;
}

.members-stats {
  display: flex;
  gap: 1rem;
}

.stat-card {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  padding: 1rem;
  text-align: center;
  min-width: 80px;
}

.stat-number {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-brand);
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--color-text-light);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.invite-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: var(--color-brand);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.invite-button:hover {
  background: var(--color-brand-dark);
}

.invite-button svg {
  width: 1.25rem;
  height: 1.25rem;
}

.members-table {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr auto;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: var(--color-background-soft);
  border-bottom: 1px solid var(--color-border);
}

.header-cell {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-light);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.table-body {
  display: flex;
  flex-direction: column;
}

.table-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr auto;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
  transition: background-color 0.2s;
}

.table-row:hover {
  background: var(--color-background-soft);
}

.table-row:last-child {
  border-bottom: none;
}

.cell {
  display: flex;
  align-items: center;
}

.member-cell {
  gap: 0.75rem;
}

.member-avatar {
  width: 2.5rem;
  height: 2.5rem;
  background: var(--color-brand);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
}

.member-info {
  display: flex;
  flex-direction: column;
}

.member-name {
  font-weight: 500;
  color: var(--color-heading);
}

.member-email {
  font-size: 0.875rem;
  color: var(--color-text-light);
}

.role-badge, .status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.role-badge.admin {
  background: rgba(var(--color-danger-rgb), 0.1);
  color: var(--color-danger);
}

.role-badge.member {
  background: var(--color-brand-light);
  color: var(--color-brand);
}

.status-badge.active {
  background: rgba(34, 197, 94, 0.1);
  color: rgb(34, 197, 94);
}

.status-badge.pending {
  background: rgba(251, 191, 36, 0.1);
  color: rgb(251, 191, 36);
}

.actions-cell {
  justify-content: flex-end;
}

.action-button {
  width: 2rem;
  height: 2rem;
  background: none;
  border: none;
  border-radius: 0.25rem;
  color: var(--color-text-light);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.action-button:hover {
  background: var(--color-background-soft);
  color: var(--color-text);
}

.action-button svg {
  width: 1rem;
  height: 1rem;
}

@media (max-width: 768px) {
  .members-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .members-stats {
    justify-content: space-between;
  }
  
  .table-header, .table-row {
    grid-template-columns: 2fr 1fr 1fr;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
  }
  
  .header-cell:nth-child(4),
  .cell:nth-child(4),
  .header-cell:nth-child(5),
  .cell:nth-child(5) {
    display: none;
  }
}
</style>