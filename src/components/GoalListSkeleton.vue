<template>
  <div class="bg-white shadow overflow-hidden sm:rounded-lg">
    <ul role="list" class="divide-y divide-gray-200 animate-pulse">
      <li v-for="i in 3" :key="i" class="px-4 py-4 sm:px-6">
        <div class="flex items-center justify-between">
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-gray-200 rounded w-1/3"></div>
            <div class="flex space-x-2">
              <div class="h-3 bg-gray-200 rounded w-24"></div>
              <div class="h-3 bg-gray-200 rounded w-20"></div>
            </div>
          </div>
          <div class="ml-2 flex-shrink-0 flex space-x-4">
            <div class="h-4 bg-gray-200 rounded w-16"></div>
            <div class="h-4 bg-gray-200 rounded w-16"></div>
          </div>
        </div>
        <div class="mt-2 sm:flex sm:justify-between">
          <div class="sm:flex space-y-2 sm:space-y-0 sm:space-x-6">
            <div class="h-4 bg-gray-200 rounded w-32"></div>
            <div class="h-4 bg-gray-200 rounded w-40"></div>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
</script>