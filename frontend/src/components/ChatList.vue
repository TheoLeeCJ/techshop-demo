<template>
  <AppLayout>
    <div class="max-w-4xl mx-auto px-4 py-8">
      <div class="bg-white rounded-lg shadow-md">
        <div class="p-4 border-b">
          <h1 class="text-2xl font-semibold">Messages</h1>
        </div>

        <div v-if="loading" class="p-8 text-center">
          <span class="material-symbols-outlined text-4xl animate-spin">progress_activity</span>
        </div>

        <div v-else-if="chats.length === 0" class="p-8 text-center text-gray-500">
          No messages yet. Start browsing listings to chat with sellers!
        </div>

        <div v-else class="divide-y">
          <router-link
            v-for="chat in chats"
            :key="chat.id"
            :to="'/chat/' + chat.id"
            class="block p-4 hover:bg-gray-50 transition-colors"
          >
            <div class="flex space-x-4">
              <!-- Listing Image -->
              <div class="w-16 h-16 flex-shrink-0">
                <img
                  :src="chat.listing_image"
                  :alt="chat.listing_title"
                  class="w-full h-full object-cover rounded"
                >
              </div>

              <!-- Chat Info -->
              <div class="flex-1 min-w-0">
                <div class="flex justify-between items-start">
                  <div>
                    <h3 class="font-medium truncate">{{ chat.listing_title }}</h3>
                    <p class="text-sm text-gray-500">
                      {{ isUserBuyer(chat) ? chat.seller_username : chat.buyer_username }}
                    </p>
                  </div>
                  <span class="text-sm text-gray-500">
                    {{ formatDate(chat.last_message_at) }}
                  </span>
                </div>

                <div class="mt-1 flex justify-between items-end">
                  <p class="text-sm text-gray-600 truncate">
                    {{ chat.last_message || 'No messages yet' }}
                  </p>
                  <div 
                    v-if="chat.unread_count > 0"
                    class="ml-2 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full"
                  >
                    {{ chat.unread_count }}
                  </div>
                </div>
              </div>
            </div>
          </router-link>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script>
import AppLayout from './AppLayout.vue'
import { ref, onMounted } from 'vue'

export default {
  name: 'ChatList',
  
  components: {
    AppLayout
  },

  setup() {
    const chats = ref([])
    const loading = ref(true)
    
    const fetchChats = async () => {
      try {
        const response = await fetch('/api/chats', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        if (response.ok) {
          chats.value = await response.json()
        }
      } catch (err) {
        console.error('Error fetching chats:', err)
      } finally {
        loading.value = false
      }
    }

    onMounted(fetchChats)

    const formatDate = (date) => {
      if (!date) return ''
      const d = new Date(date)
      const now = new Date()
      const diff = now - d
      
      if (diff < 24 * 60 * 60 * 1000) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      return d.toLocaleDateString()
    }

    const isUserBuyer = (chat) => {
      const userId = JSON.parse(atob(localStorage.getItem('token').split('.')[1])).id
      return chat.buyer_id === userId
    }

    return {
      chats,
      loading,
      formatDate,
      isUserBuyer
    }
  }
}
</script>