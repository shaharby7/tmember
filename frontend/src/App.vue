<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <div id="app">
    <header class="app-header">
      <h1>TMember Echo App</h1>
      <p>A simple frontend-backend communication test</p>
    </header>

    <main class="app-main">
      <RouterView />
    </main>

    <footer class="app-footer">
      <p>Built with Vue.js + Vite and Go</p>
    </footer>
  </div>
</template>

<style scoped>
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background-color: var(--color-background-soft);
  border-bottom: 1px solid var(--color-border);
  padding: 2rem 1rem;
  text-align: center;
}

.app-header h1 {
  margin: 0 0 0.5rem 0;
  color: var(--color-heading);
  font-size: 2.5rem;
}

.app-header p {
  margin: 0;
  color: var(--color-text-light);
  font-size: 1.1rem;
}

.app-main {
  flex: 1;
  padding: 2rem 1rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.app-footer {
  background-color: var(--color-background-soft);
  border-top: 1px solid var(--color-border);
  padding: 1rem;
  text-align: center;
  color: var(--color-text-light);
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .app-header h1 {
    font-size: 2rem;
  }

  .app-header p {
    font-size: 1rem;
  }

  .app-main {
    padding: 1rem 0.5rem;
  }
}
</style>
