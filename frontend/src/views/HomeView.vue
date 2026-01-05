<script setup lang="ts">
// Home view - can be used for landing page or redirect to dashboard
</script>

<template>
  <main>
    <div class="home-content">
      <h1>Welcome to TMember</h1>
      <p>Your organization management platform</p>
      <router-link to="/auth" class="cta-button">Get Started</router-link>
    </div>
  </main>
</template>

<style scoped>
.home-content {
  text-align: center;
  padding: 4rem 2rem;
  max-width: 600px;
  margin: 0 auto;
}

.home-content h1 {
  font-size: 3rem;
  margin-bottom: 1rem;
  color: var(--color-heading);
}

.home-content p {
  font-size: 1.2rem;
  margin-bottom: 2rem;
  color: var(--color-text-light);
}

.cta-button {
  display: inline-block;
  padding: 1rem 2rem;
  background-color: var(--color-brand);
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.cta-button:hover {
  background-color: var(--color-brand-dark);
}
</style>
