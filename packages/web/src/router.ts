import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('./pages/Home.vue'),
  },
  {
    path: '/leaderboard',
    name: 'leaderboard',
    component: () => import('./pages/Leaderboard.vue'),
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('./pages/Dashboard.vue'),
  },
  {
    path: '/tasks',
    name: 'tasks',
    component: () => import('./pages/TaskFeed.vue'),
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
