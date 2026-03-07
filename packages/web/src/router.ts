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
  {
    path: '/task-center',
    name: 'task-center',
    component: () => import('./pages/TaskCenter.vue'),
  },
  {
    path: '/verify-email',
    name: 'verify-email',
    component: () => import('./pages/VerifyEmail.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('./pages/NotFound.vue'),
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
