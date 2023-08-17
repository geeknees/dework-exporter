import { createRouter, createWebHistory } from 'vue-router';
import Home from './components/Home.vue';
import Old from './components/Old.vue';

const routes = [
  { path: '/', component: Home },
  { path: '/old', component: Old }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
