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
    path: '/disclosures',
    name: 'disclosures',
    component: () => import('./pages/Disclosures.vue'),
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('./pages/Admin.vue'),
  },
  {
    path: '/verify-email',
    name: 'verify-email',
    component: () => import('./pages/VerifyEmail.vue'),
  },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: () => import('./pages/ResetPassword.vue'),
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
