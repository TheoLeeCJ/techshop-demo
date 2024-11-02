<template>
  <AppLayout>
    <div class="max-w-4xl mx-auto px-4 py-8">
      <div class="bg-white rounded-lg shadow-md h-[600px] flex flex-col">
        <!-- Chat Header -->
        <div class="p-4 border-b flex items-center space-x-4">
          <router-link 
            :to="'/chat'"
            class="p-1 hover:bg-gray-100 rounded-full"
          >
            <span class="material-symbols-outlined">arrow_back</span>
          </router-link>
          
          <template v-if="chatInfo">
            <div class="flex-shrink-0">
              <img 
                :src="chatInfo.listing_image" 
                :alt="chatInfo.listing_title"
                class="w-12 h-12 rounded object-cover"
              >
            </div>
            <div class="min-w-0">
              <h2 class="font-medium truncate">{{ chatInfo.listing_title }}</h2>
              <p class="text-sm text-gray-500">
                {{ isUserBuyer ? chatInfo.seller_username : chatInfo.buyer_username }}
              </p>
            </div>
          </template>
        </div>

        <!-- Messages -->
        <div 
          ref="messageContainer"
          class="flex-1 overflow-y-auto p-4 space-y-4"
        >
          <div v-if="loading" class="text-center">
            <span class="material-symbols-outlined text-4xl animate-spin">
              progress_activity
            </span>
          </div>

          <template v-else>
            <div
              v-for="message in messages"
              :key="message.id"
              class="flex"
              :class="[message.sender_id === userId ? 'justify-end' : 'justify-start']"
            >
              <div 
                class="max-w-[70%] rounded-lg px-4 py-2"
                :class="[
                  message.sender_id === userId 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-900'
                ]"
              >
                <p>{{ message.message }}</p>
                <p class="text-xs mt-1 opacity-75">
                  {{ formatDate(message.created_at) }}
                </p>
              </div>
            </div>
          </template>
        </div>

        <!-- Message Input -->
        <div class="p-4 border-t">
          <form @submit.prevent="sendMessage" class="flex space-x-2">
            <input
              v-model="newMessage"
              type="text"
              placeholder="Type a message..."
              class="flex-1 rounded-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              :disabled="sending"
            >
            <button 
              type="submit"
              class="p-2 rounded-full bg-blue-500 text-white disabled:opacity-50"
              :disabled="!newMessage.trim() || sending"
            >
              <span class="material-symbols-outlined">send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script>
import AppLayout from './AppLayout.vue'
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { useRoute } from 'vue-router'

export default {
  name: 'ChatRoom',
  
  components: {
    AppLayout
  },

  setup() {
    const route = useRoute()
    const messageContainer = ref(null)
    const messages = ref([])
    const chatInfo = ref(null)
    const loading = ref(true)
    const newMessage = ref('')
    const sending = ref(false)
    const pollInterval = ref(null)
    
    // Get user ID from token
    const userId = JSON.parse(atob(localStorage.getItem('token').split('.')[1])).id
    const isUserBuyer = computed(() => chatInfo.value?.buyer_id === userId)

    const scrollToBottom = () => {
      nextTick(() => {
        if (messageContainer.value) {
          messageContainer.value.scrollTop = messageContainer.value.scrollHeight
        }
      })
    }

    const fetchMessages = async () => {
      try {
        const response = await fetch(`/api/chats/${route.params.id}/messages`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        if (response.ok) {
          messages.value = await response.json()
          scrollToBottom()
        }
      } catch (err) {
        console.error('Error fetching messages:', err)
      } finally {
        loading.value = false
      }
    }

    const fetchChatInfo = async () => {
      try {
        const response = await fetch('/api/chats', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        if (response.ok) {
          const chats = await response.json()
          chatInfo.value = chats.find(c => c.id === parseInt(route.params.id))
        }
      } catch (err) {
        console.error('Error fetching chat info:', err)
      }
    }

    const sendMessage = async () => {
      if (!newMessage.value.trim() || sending.value) return
      
      sending.value = true
      try {
        const response = await fetch(`/api/chats/${route.params.id}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ message: newMessage.value })
        })
        
        if (response.ok) {
          const message = await response.json()
          messages.value.push(message)
          newMessage.value = ''
          scrollToBottom()
        }
      } catch (err) {
        console.error('Error sending message:', err)
      } finally {
        sending.value = false
      }
    }

    const formatDate = (date) => {
      if (!date) return ''
      const d = new Date(date)
      return d.toLocaleString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        month: 'short',
        day: 'numeric'
      })
    }

    onMounted(() => {
      fetchChatInfo()
      fetchMessages()
      // Poll for new messages every 5 seconds
      pollInterval.value = setInterval(fetchMessages, 5000)
    })

    onUnmounted(() => {
      if (pollInterval.value) {
        clearInterval(pollInterval.value)
      }
    })

    return {
      messages,
      chatInfo,
      loading,
      newMessage,
      sending,
      messageContainer,
      userId,
      isUserBuyer,
      sendMessage,
      formatDate
    }
  }
}
</script>