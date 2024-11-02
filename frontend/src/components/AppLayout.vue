# AppLayout.vue
<template>
  <div class="min-h-screen bg-gray-100">
    <!-- Navigation -->
    <nav class="bg-gray-800 text-white">
      <div class="max-w-6xl mx-auto">
        <!-- Upper nav with auth -->
        <div class="flex justify-end space-x-4 py-1 px-4 bg-gray-900 text-sm" v-if="!user">
          <button @click="showAuth('login')" class="hover:text-gray-300">Sign In</button>
          <span class="text-gray-600">|</span>
          <button @click="showAuth('register')" class="hover:text-gray-300">Register</button>
        </div>
        <div v-else class="flex justify-end space-x-4 py-1 px-4 bg-gray-900 text-sm">
          <span class="text-gray-300">Welcome, {{ user.username }}</span>
          <button @click="logout" class="hover:text-gray-300">Logout</button>
        </div>
        
        <!-- Main nav -->
        <div class="flex items-center justify-between px-4 py-3">
          <div class="flex items-center space-x-12">
            <router-link to="/" class="text-xl font-bold tracking-tight">TechMarket</router-link>
            <div class="flex space-x-6">
              <router-link to="/" class="hover:text-blue-400">Browse</router-link>
              <router-link to="/create" v-if="user" class="hover:text-blue-400">Sell Item</router-link>
              <router-link to="/chat" v-if="user" class="hover:text-blue-400 flex items-center space-x-2">
                <span class="material-symbols-outlined">chat</span>
                <span>Messages</span>
                <span v-if="unreadMessages" class="text-sm px-2 py-0.5 bg-blue-500 rounded-full">
                  {{ unreadMessages }}
                </span>
              </router-link>
              <router-link :to="'/user/' + user?.username" v-if="user" class="hover:text-blue-400">Profile</router-link>
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <router-link to="/likes" v-if="user" class="flex items-center space-x-2">
              <span class="material-symbols-outlined">favorite</span>
              <span class="text-sm px-2 py-0.5 bg-blue-500 rounded-full">{{ likedCount }}</span>
            </router-link>
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <slot></slot>
  </div>

  <!-- Auth Modal -->
  <Teleport to="body">
    <div v-if="showAuthModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div class="bg-white p-6 rounded-lg shadow-xl w-96">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold">{{ authMode === 'login' ? 'Sign In' : 'Register' }}</h2>
          <button @click="showAuthModal = false" class="text-gray-500 hover:text-gray-700">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <form @submit.prevent="handleAuth">
          <div class="space-y-4">
            <div v-if="authMode === 'register'">
              <label class="block text-sm font-medium text-gray-700">Username</label>
              <input 
                v-model="authForm.username" 
                type="text" 
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">Email</label>
              <input 
                v-model="authForm.email" 
                type="email" 
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">Password</label>
              <input 
                v-model="authForm.password" 
                type="password" 
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
            </div>
          </div>

          <div class="mt-6">
            <button 
              type="submit"
              class="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {{ authMode === 'login' ? 'Sign In' : 'Register' }}
            </button>
          </div>

          <div class="mt-4 text-center">
            <button 
              type="button"
              @click="authMode = authMode === 'login' ? 'register' : 'login'"
              class="text-sm text-blue-500 hover:text-blue-600"
            >
              {{ authMode === 'login' ? 'Need an account? Register' : 'Already have an account? Sign in' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script>
export default {
  name: 'AppLayout',
  
  data() {
    return {
      showAuthModal: false,
      authMode: 'login',
      authForm: {
        username: '',
        email: '',
        password: ''
      },
      user: null,
      likedCount: 0,
      unreadMessages: 0,
      messageCheckInterval: null
    }
  },

  created() {
    // Check for existing token
    const token = localStorage.getItem('token')
    if (token) {
      this.fetchUser(token)
    }
  },

  mounted() {
    // Start polling for unread messages if user is logged in
    if (this.user) {
      this.startMessageChecking()
    }
  },

  beforeUnmount() {
    this.stopMessageChecking()
  },

  watch: {
    user(newUser) {
      if (newUser) {
        this.startMessageChecking()
      } else {
        this.stopMessageChecking()
      }
    }
  },

  methods: {
    showAuth(mode) {
      this.authMode = mode
      this.showAuthModal = true
      this.resetForm()
    },
    
    async handleAuth() {
      try {
        const endpoint = this.authMode === 'login' ? '/api/auth/login' : '/api/auth/register'
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(this.authForm)
        })
        
        const data = await response.json()
        
        if (response.ok) {
          localStorage.setItem('token', data.token)
          await this.fetchUser(data.token)
          this.showAuthModal = false
          this.resetForm()
        } else {
          alert(data.error)
        }
      } catch (err) {
        console.error('Auth error:', err)
        alert('Authentication failed')
      }
    },

    async fetchUser(token) {
      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          this.user = await response.json()
          this.fetchLikedCount()
        } else {
          this.logout()
        }
      } catch (err) {
        console.error('Error fetching user:', err)
        this.logout()
      }
    },

    async fetchLikedCount() {
      try {
        const response = await fetch('/api/users/me/likes', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        
        if (response.ok) {
          const likes = await response.json()
          this.likedCount = likes.length
        }
      } catch (err) {
        console.error('Error fetching likes:', err)
      }
    },

    async fetchUnreadMessages() {
      try {
        const response = await fetch('/api/chats', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        
        if (response.ok) {
          const chats = await response.json()
          this.unreadMessages = chats.reduce((total, chat) => total + (chat.unread_count || 0), 0)
        }
      } catch (err) {
        console.error('Error fetching unread messages:', err)
      }
    },

    startMessageChecking() {
      this.fetchUnreadMessages()
      this.messageCheckInterval = setInterval(this.fetchUnreadMessages, 30000) // Check every 30 seconds
    },

    stopMessageChecking() {
      if (this.messageCheckInterval) {
        clearInterval(this.messageCheckInterval)
        this.messageCheckInterval = null
      }
    },

    logout() {
      localStorage.removeItem('token')
      this.user = null
      this.likedCount = 0
      this.unreadMessages = 0
      this.stopMessageChecking()
      this.$router.push('/')
    },

    resetForm() {
      this.authForm = {
        username: '',
        email: '',
        password: ''
      }
    }
  }
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined');
</style>