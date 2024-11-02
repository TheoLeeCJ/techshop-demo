import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import HomePage from './components/HomePage.vue'
import CreateListing from './components/CreateListing.vue'
import UserProfile from './components/UserProfile.vue'
import ChatList from './components/ChatList.vue'
import ChatRoom from './components/ChatRoom.vue'

// Router configuration
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage
    },
    {
      path: '/create',
      name: 'create-listing',
      component: CreateListing,
      meta: { requiresAuth: true }
    },
    {
      path: '/user/:username',
      name: 'profile',
      component: UserProfile
    },
    {
      path: '/chat',
      name: 'chat-list',
      component: ChatList,
      meta: { requiresAuth: true }
    },
    {
      path: '/chat/:id',
      name: 'chat-room',
      component: ChatRoom,
      meta: { requiresAuth: true }
    }
  ]
})

// Navigation guard for protected routes
router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !localStorage.getItem('token')) {
    next('/')
  } else {
    next()
  }
})

// Create and mount app
const app = createApp(App)
app.use(router)
app.mount('#app')