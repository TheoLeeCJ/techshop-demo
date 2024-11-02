# UserProfile.vue
<template>
  <AppLayout>
    <div class="max-w-6xl mx-auto px-4 py-8">
      <div v-if="loading" class="text-center py-8">
        <span class="material-symbols-outlined text-4xl animate-spin">progress_activity</span>
      </div>
      
      <div v-else-if="error" class="text-center py-8">
        <p class="text-red-500">{{ error }}</p>
      </div>
      
      <template v-else>
        <!-- Profile Header -->
        <div class="bg-white rounded-lg shadow-md p-6 mb-8">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <div class="h-16 w-16 bg-gray-200 rounded-full flex items-center justify-center">
                <span class="material-symbols-outlined text-4xl text-gray-400">person</span>
              </div>
              <div>
                <h1 class="text-2xl font-bold">{{ profile.username }}</h1>
                <p class="text-gray-500">
                  Member since {{ new Date(profile.created_at).toLocaleDateString() }}
                </p>
              </div>
            </div>
            
            <!-- Edit Profile Button (only shown if viewing own profile) -->
            <button 
              v-if="isOwnProfile"
              @click="showEditModal = true"
              class="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              <span class="material-symbols-outlined">edit</span>
              <span>Edit Profile</span>
            </button>
          </div>
        </div>

        <!-- Listings Tabs -->
        <div class="bg-white rounded-lg shadow-md">
          <div class="border-b">
            <nav class="flex">
              <button
                v-for="tab in tabs"
                :key="tab.id"
                @click="activeTab = tab.id"
                class="px-6 py-3 text-sm font-medium"
                :class="[
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-500 text-blue-500'
                    : 'text-gray-500 hover:text-gray-700'
                ]"
              >
                <div class="flex items-center space-x-2">
                  <span class="material-symbols-outlined">{{ tab.icon }}</span>
                  <span>{{ tab.name }}</span>
                </div>
              </button>
            </nav>
          </div>

          <!-- Tab Content -->
          <div class="p-6">
            <!-- Active Listings -->
            <div v-if="activeTab === 'listings'" class="space-y-6">
              <div v-if="profile.listings.length === 0" class="text-center py-8">
                <p class="text-gray-500">No listings yet.</p>
              </div>
              
              <div 
                v-for="listing in profile.listings" 
                :key="listing.id"
                class="flex bg-gray-50 rounded-lg overflow-hidden hover:bg-gray-100 transition-colors"
              >
                <div class="w-48 h-32 flex-shrink-0">
                  <img
                    :src="listing.image_url"
                    :alt="listing.title"
                    class="w-full h-full object-cover"
                  />
                </div>
                <div class="flex-1 p-4">
                  <div class="flex justify-between">
                    <div>
                      <h3 class="font-medium">{{ listing.title }}</h3>
                      <div class="flex items-center space-x-2 mt-1">
                        <span class="text-lg font-semibold">${{ listing.price.toFixed(2) }}</span>
                        <span class="text-sm px-2 py-0.5 bg-white rounded-full text-gray-600">
                          {{ listing.category }}
                        </span>
                      </div>
                    </div>
                    <div class="flex items-center space-x-2">
                      <span class="flex items-center space-x-1 text-gray-500">
                        <span class="material-symbols-outlined">favorite</span>
                        <span>{{ listing.likes }}</span>
                      </span>
                      <button 
                        v-if="isOwnProfile"
                        @click="deleteListing(listing.id)"
                        class="p-1 hover:bg-red-100 rounded-full text-red-500"
                      >
                        <span class="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </div>
                  <p class="mt-2 text-sm text-gray-600 line-clamp-2">{{ listing.description }}</p>
                </div>
              </div>
            </div>

            <!-- Liked Items -->
            <div v-if="activeTab === 'likes'" class="space-y-6">
              <div v-if="likedListings.length === 0" class="text-center py-8">
                <p class="text-gray-500">No liked items yet.</p>
              </div>
              
              <div 
                v-for="listing in likedListings" 
                :key="listing.id"
                class="flex bg-gray-50 rounded-lg overflow-hidden hover:bg-gray-100 transition-colors"
              >
                <div class="w-48 h-32 flex-shrink-0">
                  <img
                    :src="listing.image_url"
                    :alt="listing.title"
                    class="w-full h-full object-cover"
                  />
                </div>
                <div class="flex-1 p-4">
                  <div class="flex justify-between">
                    <div>
                      <h3 class="font-medium">{{ listing.title }}</h3>
                      <div class="flex items-center space-x-2 mt-1">
                        <span class="text-lg font-semibold">${{ listing.price.toFixed(2) }}</span>
                        <span class="text-sm px-2 py-0.5 bg-white rounded-full text-gray-600">
                          {{ listing.category }}
                        </span>
                      </div>
                      <div class="mt-1 text-sm text-gray-500">
                        by {{ listing.username }}
                      </div>
                    </div>
                    <button 
                      @click="toggleLike(listing)"
                      class="p-1.5 hover:bg-gray-200 rounded-full"
                    >
                      <span class="material-symbols-outlined text-red-500">favorite</span>
                    </button>
                  </div>
                  <p class="mt-2 text-sm text-gray-600 line-clamp-2">{{ listing.description }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Edit Profile Modal -->
    <Teleport to="body">
      <div v-if="showEditModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <div class="bg-white p-6 rounded-lg shadow-xl w-96">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold">Edit Profile</h2>
            <button @click="showEditModal = false" class="text-gray-500 hover:text-gray-700">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          
          <form @submit.prevent="updateProfile">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">Username</label>
                <input 
                  v-model="editForm.username" 
                  type="text" 
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700">Email</label>
                <input 
                  v-model="editForm.email" 
                  type="email" 
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
              </div>
            </div>

            <div class="mt-6">
              <button 
                type="submit"
                class="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </AppLayout>
</template>

<script>
import AppLayout from './AppLayout.vue'

export default {
  name: 'UserProfile',
  
  components: {
    AppLayout
  },
  
  data() {
    return {
      loading: true,
      error: null,
      profile: null,
      likedListings: [],
      activeTab: 'listings',
      showEditModal: false,
      editForm: {
        username: '',
        email: ''
      },
      tabs: [
        { id: 'listings', name: 'Listings', icon: 'grid_view' },
        { id: 'likes', name: 'Liked Items', icon: 'favorite' }
      ]
    }
  },

  computed: {
    isOwnProfile() {
      return this.profile?.username === this.$route.params.username
    }
  },

  watch: {
    '$route.params.username': {
      immediate: true,
      handler(username) {
        this.fetchProfile(username)
      }
    },
    activeTab(tab) {
      if (tab === 'likes' && this.isOwnProfile) {
        this.fetchLikedListings()
      }
    }
  },

  methods: {
    async fetchProfile(username) {
      this.loading = true
      this.error = null
      
      try {
        const response = await fetch(`/api/users/${username}`)
        if (!response.ok) throw new Error('User not found')
        this.profile = await response.json()
        
        if (this.isOwnProfile) {
          this.editForm.username = this.profile.username
          this.editForm.email = this.profile.email
        }
      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    async fetchLikedListings() {
      if (!this.isOwnProfile) return
      
      try {
        const response = await fetch('/api/users/me/likes', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        if (response.ok) {
          this.likedListings = await response.json()
        }
      } catch (err) {
        console.error('Error fetching liked listings:', err)
      }
    },

    async updateProfile() {
      try {
        const response = await fetch('/api/users/me', {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(this.editForm)
        })
        
        if (response.ok) {
          const updated = await response.json()
          this.profile = { ...this.profile, ...updated }
          this.showEditModal = false
          
          if (updated.username !== this.$route.params.username) {
            this.$router.push(`/user/${updated.username}`)
          }
        } else {
          const error = await response.json()
          alert(error.error)
        }
      } catch (err) {
        console.error('Error updating profile:', err)
        alert('Failed to update profile')
      }
    },

    async deleteListing(listingId) {
      if (!confirm('Are you sure you want to delete this listing?')) return
      
      try {
        const response = await fetch(`/api/listings/${listingId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        
        if (response.ok) {
          this.profile.listings = this.profile.listings.filter(l => l.id !== listingId)
        }
      } catch (err) {
        console.error('Error deleting listing:', err)
        alert('Failed to delete listing')
      }
    },

    async toggleLike(listing) {
      try {
        const response = await fetch(`/api/listings/${listing.id}/like`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        
        if (response.ok) {
          this.likedListings = this.likedListings.filter(l => l.id !== listing.id)
        }
      } catch (err) {
        console.error('Error unliking listing:', err)
      }
    }
  }
}
</script>