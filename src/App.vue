<script setup>
import Nav from './components/Nav.vue'
</script>

<template>
  <div>
    <Nav />
    <Suspense>
      <router-view /> 
    </Suspense>
  </div>
</template>

<style scoped>
</style>
