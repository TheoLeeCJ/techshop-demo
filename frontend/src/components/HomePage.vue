# HomePage.vue
<template>
  <AppLayout>
    <!-- Search and Filters -->
    <div class="bg-white shadow-sm">
      <div class="max-w-6xl mx-auto px-4 py-4">
        <div class="flex flex-col space-y-4">
          <!-- Search -->
          <div class="flex items-center border rounded-md p-2 bg-gray-50">
            <span class="material-symbols-outlined text-gray-400 mr-2">search</span>
            <input v-model="filters.search" type="text" placeholder="Search listings..."
              class="w-full bg-transparent focus:outline-none" @input="debouncedFetch" />
          </div>

          <!-- Filter Controls -->
          <div class="flex flex-wrap gap-4 items-center">
            <!-- Categories -->
            <div class="flex-1 min-w-[200px]">
              <select v-model="filters.category" class="w-full p-2 border rounded-md bg-gray-50"
                @change="fetchListings">
                <option value="">All Categories</option>
                <option v-for="cat in categories" :key="cat" :value="cat">
                  {{ cat }}
                </option>
              </select>
            </div>

            <!-- Condition -->
            <div class="flex-1 min-w-[200px]">
              <select v-model="filters.condition" class="w-full p-2 border rounded-md bg-gray-50"
                @change="fetchListings">
                <option value="">Any Condition</option>
                <option v-for="cond in conditions" :key="cond" :value="cond">
                  {{ cond }}
                </option>
              </select>
            </div>

            <!-- Price Range -->
            <div class="flex gap-2 items-center min-w-[300px]">
              <input v-model.number="filters.minPrice" type="number" placeholder="Min Price"
                class="w-24 p-2 border rounded-md bg-gray-50" @change="fetchListings" />
              <span>-</span>
              <input v-model.number="filters.maxPrice" type="number" placeholder="Max Price"
                class="w-24 p-2 border rounded-md bg-gray-50" @change="fetchListings" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Listings Grid -->
    <main class="max-w-7xl mx-auto px-4 py-8">
      <div v-if="loading" class="text-center py-8">
        <span class="material-symbols-outlined text-4xl animate-spin">progress_activity</span>
      </div>

      <div v-else-if="listings.length === 0" class="text-center py-8">
        <p class="text-gray-500">No listings found.</p>
      </div>

      <div v-else class="grid grid-cols-2 gap-6">
        <div v-for="listing in listings" :key="listing.id"
          class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
          <div class="flex h-48">
            <div class="w-48 flex-shrink-0">
              <img :src="listing.image_url" :alt="listing.title" class="w-full h-full object-cover" />
            </div>
            <div class="flex-1 p-4 overflow-hidden">
              <div class="flex justify-between items-start">
                <div class="min-w-0">
                  <h2 class="text-lg font-medium text-gray-800 truncate">{{ listing.title }}</h2>
                  <div class="flex items-center mt-1 space-x-2">
                    <span class="text-xl font-semibold text-gray-900">
                      ${{ listing.price.toFixed(2) }}
                    </span>
                    <span class="text-sm px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
                      {{ listing.category }}
                    </span>
                    <span class="text-sm px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
                      {{ listing.condition }}
                    </span>
                  </div>
                </div>
                <button @click="toggleLike(listing)" class="p-1.5 hover:bg-gray-100 rounded-full flex-shrink-0"
                  v-if="isLoggedIn">
                  <span class="material-symbols-outlined" :class="listing.likes > 0 ? 'text-red-500' : 'text-gray-400'">
                    favorite
                  </span>
                </button>
              </div>

              <div v-if="isLoggedIn" class="mt-2">
                <button 
                  v-if="listing.user_id !== userId" 
                  @click.prevent="startChat(listing.id)"
                  class="flex items-center space-x-2 text-blue-500 hover:text-blue-600"
                >
                  <span class="material-symbols-outlined">chat</span>
                  <span>Contact Seller</span>
                </button>
                <router-link 
                  v-else 
                  to="/chat" 
                  class="flex items-center space-x-2 text-green-500 hover:text-green-600"
                >
                  <span class="material-symbols-outlined">forum</span>
                  <span>View Messages</span>
                </router-link>
              </div>

              <p class="text-sm text-gray-600 mt-2 line-clamp-2">{{ listing.description }}</p>
              <div class="mt-3 flex items-center justify-between">
                <div class="flex items-center space-x-2">
                  <span class="material-symbols-outlined text-gray-400">person</span>
                  <span class="text-sm text-gray-600">{{ listing.username }}</span>
                </div>
                <span class="text-sm text-gray-500">
                  {{ new Date(listing.created_at).toLocaleDateString() }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="mt-8 flex justify-center space-x-2">
        <button v-for="page in totalPages" :key="page" @click="changePage(page)" class="px-3 py-1 rounded"
          :class="currentPage === page ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'">
          {{ page }}
        </button>
      </div>
    </main>
  </AppLayout>
</template>

<script>
import AppLayout from './AppLayout.vue'
import { debounce } from 'lodash'

export default {
  name: 'HomePage',

  components: {
    AppLayout
  },

  data() {
    return {
      listings: [],
      loading: true,
      currentPage: 1,
      totalPages: 0,
      filters: {
        search: '',
        category: '',
        condition: '',
        minPrice: null,
        maxPrice: null
      },
      categories: [
        'Electronics',
        'Computer Parts',
        'Laptops',
        'Phones',
        'Gaming',
        'Software',
        'Office',
        'Photography',
        'Audio'
      ],
      conditions: ['New', 'Like New', 'Good', 'Fair', 'Poor']
    }
  },

  computed: {
    isLoggedIn() {
      return !!localStorage.getItem('token')
    },
    userId() {
      const token = localStorage.getItem('token')
      if (token) {
        return JSON.parse(atob(token.split('.')[1])).id
      }
      return null
    }
  },

  created() {
    this.debouncedFetch = debounce(this.fetchListings, 300)
    this.fetchListings()
  },

  methods: {
    async fetchListings() {
      this.loading = true
      try {
        const queryParams = new URLSearchParams({
          page: this.currentPage,
          ...Object.fromEntries(
            Object.entries(this.filters).filter(([_, v]) => v != null && v !== '')
          )
        })

        const response = await fetch(`/api/listings?${queryParams}`)
        const data = await response.json()

        this.listings = data.listings
        this.totalPages = data.pages
      } catch (err) {
        console.error('Error fetching listings:', err)
      } finally {
        this.loading = false
      }
    },

    async startChat(listingId) {
      if (!this.isLoggedIn) {
        // Show auth modal
        this.$parent.showAuth('login');
        return;
      }

      try {
        const response = await fetch(`/api/chat/start/${listingId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const { chatId } = await response.json();
          this.$router.push(`/chat/${chatId}`);
        }
      } catch (err) {
        console.error('Error starting chat:', err);
      }
    },

    async toggleLike(listing) {
      if (!this.isLoggedIn) return

      try {
        const response = await fetch(`/api/listings/${listing.id}/like`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })

        if (response.ok) {
          const { liked } = await response.json()
          listing.likes = liked ? listing.likes + 1 : listing.likes - 1
        }
      } catch (err) {
        console.error('Error toggling like:', err)
      }
    },

    changePage(page) {
      this.currentPage = page
      this.fetchListings()
      window.scrollTo(0, 0)
    }
  }
}
</script>