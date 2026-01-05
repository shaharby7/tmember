import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useOrganizationStore } from '../stores/organization'
import HomeView from '../views/HomeView.vue'
import AuthView from '../views/AuthView.vue'
import DashboardView from '../views/DashboardView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/auth',
      name: 'auth',
      component: AuthView,
      meta: {
        requiresGuest: true, // Only accessible when not authenticated
      },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView,
      meta: {
        requiresAuth: true, // Only accessible when authenticated
      },
    },
    // Redirect any unknown routes to home
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

// Navigation guards
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  const organizationStore = useOrganizationStore()

  // Initialize auth state if not already initialized
  if (!authStore.isInitialized) {
    await authStore.initializeAuth()
  }

  // Initialize organization state if authenticated
  if (authStore.isAuthenticated) {
    organizationStore.initializeOrganizations()
  }

  // Check if route requires authentication
  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated) {
      // Redirect to auth page if not authenticated
      next({ name: 'auth' })
      return
    }
  }

  // Check if route requires guest (not authenticated)
  if (to.meta.requiresGuest) {
    if (authStore.isAuthenticated) {
      // Redirect to dashboard if already authenticated
      next({ name: 'dashboard' })
      return
    }
  }

  // If going to root and authenticated, redirect to dashboard
  if (to.path === '/' && authStore.isAuthenticated) {
    next({ name: 'dashboard' })
    return
  }

  // If going to root and not authenticated, redirect to auth
  if (to.path === '/' && !authStore.isAuthenticated) {
    next({ name: 'auth' })
    return
  }

  next()
})

export default router
