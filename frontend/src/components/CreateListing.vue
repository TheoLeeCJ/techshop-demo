# CreateListing.vue
<template>
  <AppLayout>
    <div class="max-w-3xl mx-auto px-4 py-8">
      <div class="bg-white rounded-lg shadow p-6">
        <h1 class="text-2xl font-semibold mb-6">Create New Listing</h1>
        
        <form @submit.prevent="createListing" class="space-y-6">
          <!-- Image Upload -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Item Photo
            </label>
            <div 
              class="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center"
              :class="{'border-blue-500': isDragging}"
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="handleFileDrop"
            >
              <div v-if="!imagePreview" class="space-y-2">
                <span class="material-symbols-outlined text-4xl text-gray-400">
                  cloud_upload
                </span>
                <p class="text-gray-500">
                  Drag and drop your image here, or
                  <button 
                    type="button"
                    class="text-blue-500 hover:text-blue-600"
                    @click="$refs.fileInput.click()"
                  >
                    browse
                  </button>
                </p>
                <input
                  ref="fileInput"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="handleFileSelect"
                >
              </div>
              <div v-else class="relative">
                <img 
                  :src="imagePreview" 
                  class="max-h-48 mx-auto rounded"
                  alt="Preview"
                >
                <button 
                  type="button"
                  @click="clearImage"
                  class="absolute top-2 right-2 p-1 bg-white rounded-full shadow hover:bg-gray-100"
                >
                  <span class="material-symbols-outlined text-gray-600">close</span>
                </button>
              </div>
            </div>
            <p v-if="errors.image" class="mt-1 text-sm text-red-600">
              {{ errors.image }}
            </p>
          </div>

          <!-- Title -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              v-model="form.title"
              type="text"
              class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              :class="{'border-red-300': errors.title}"
            >
            <p v-if="errors.title" class="mt-1 text-sm text-red-600">
              {{ errors.title }}
            </p>
          </div>

          <!-- Price -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Price
            </label>
            <div class="relative rounded-md shadow-sm">
              <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span class="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                v-model="form.price"
                type="number"
                step="0.01"
                min="0"
                class="block w-full rounded-md border-gray-300 pl-7 focus:border-blue-500 focus:ring-blue-500"
                :class="{'border-red-300': errors.price}"
              >
            </div>
            <p v-if="errors.price" class="mt-1 text-sm text-red-600">
              {{ errors.price }}
            </p>
          </div>

          <!-- Category -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              v-model="form.category"
              class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              :class="{'border-red-300': errors.category}"
            >
              <option value="">Select a category</option>
              <option v-for="category in categories" :key="category" :value="category">
                {{ category }}
              </option>
            </select>
            <p v-if="errors.category" class="mt-1 text-sm text-red-600">
              {{ errors.category }}
            </p>
          </div>

          <!-- Condition -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Condition
            </label>
            <select
              v-model="form.condition"
              class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              :class="{'border-red-300': errors.condition}"
            >
              <option value="">Select condition</option>
              <option v-for="condition in conditions" :key="condition" :value="condition">
                {{ condition }}
              </option>
            </select>
            <p v-if="errors.condition" class="mt-1 text-sm text-red-600">
              {{ errors.condition }}
            </p>
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              v-model="form.description"
              rows="4"
              class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              :class="{'border-red-300': errors.description}"
            ></textarea>
            <p v-if="errors.description" class="mt-1 text-sm text-red-600">
              {{ errors.description }}
            </p>
          </div>

          <!-- Submit Button -->
          <div class="flex justify-end">
            <button
              type="submit"
              class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              :disabled="isSubmitting"
            >
              <span v-if="isSubmitting" class="material-symbols-outlined animate-spin mr-2">
                progress_activity
              </span>
              {{ isSubmitting ? 'Creating...' : 'Create Listing' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </AppLayout>
</template>

<script>
import AppLayout from './AppLayout.vue'

export default {
  name: 'CreateListing',
  
  components: {
    AppLayout
  },
  
  data() {
    return {
      form: {
        title: '',
        price: '',
        category: '',
        condition: '',
        description: ''
      },
      selectedFile: null,
      imagePreview: null,
      isDragging: false,
      isSubmitting: false,
      errors: {},
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

  methods: {
    handleFileSelect(event) {
      const file = event.target.files[0]
      this.handleFile(file)
    },

    handleFileDrop(event) {
      this.isDragging = false
      const file = event.dataTransfer.files[0]
      this.handleFile(file)
    },

    handleFile(file) {
      if (!file) return
      
      if (!file.type.startsWith('image/')) {
        this.errors.image = 'Please select an image file'
        return
      }

      this.selectedFile = file
      this.errors.image = null
      
      // Create preview
      const reader = new FileReader()
      reader.onload = e => this.imagePreview = e.target.result
      reader.readAsDataURL(file)
    },

    clearImage() {
      this.selectedFile = null
      this.imagePreview = null
      if (this.$refs.fileInput) {
        this.$refs.fileInput.value = ''
      }
    },

    validate() {
      const errors = {}
      
      if (!this.selectedFile) {
        errors.image = 'Please select an image'
      }
      if (!this.form.title.trim()) {
        errors.title = 'Title is required'
      }
      if (!this.form.price || this.form.price <= 0) {
        errors.price = 'Please enter a valid price'
      }
      if (!this.form.category) {
        errors.category = 'Please select a category'
      }
      if (!this.form.condition) {
        errors.condition = 'Please select condition'
      }
      if (!this.form.description.trim()) {
        errors.description = 'Description is required'
      }

      this.errors = errors
      return Object.keys(errors).length === 0
    },

    async createListing() {
      if (!this.validate()) return
      
      this.isSubmitting = true
      
      try {
        const formData = new FormData()
        formData.append('file', this.selectedFile)
        formData.append('data', JSON.stringify({
          title: this.form.title,
          description: this.form.description,
          price: parseFloat(this.form.price),
          category: this.form.category,
          condition: this.form.condition
        }))

        const response = await fetch('/api/listings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        })

        if (response.ok) {
          const listing = await response.json()
          this.$router.push(`/listings/${listing.id}`)
        } else {
          const error = await response.json()
          throw new Error(error.message || 'Failed to create listing')
        }
      } catch (err) {
        console.error('Error creating listing:', err)
        alert(err.message || 'Failed to create listing')
      } finally {
        this.isSubmitting = false
      }
    }
  }
}
</script>