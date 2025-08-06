<template>
  <div class="bg-white overflow-hidden shadow rounded-lg">
    <div class="p-5">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <div :class="['w-8 h-8 rounded-full flex items-center justify-center', iconBg]">
            <slot name="icon"></slot>
          </div>
        </div>
        <div class="ml-5 w-0 flex-1">
          <dl>
            <dt class="text-sm font-medium text-gray-500 truncate">{{ title }}</dt>
            <dd :class="valueClass">
              <slot name="value">
                {{ value }}
                <span v-if="subValue" class="block text-sm font-normal text-gray-500">{{ subValue }}</span>
              </slot>
            </dd>
            <div v-if="showProgress" class="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div :class="[progressColor, 'h-2 rounded-full transition-all duration-300']" :style="{ width: Math.min(progress, 100) + '%' }"></div>
            </div>
            <div v-if="footerText" class="text-sm text-gray-600 mt-1">{{ footerText }}</div>
          </dl>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: { type: String, required: true },
  value: { type: [String, Number], default: '' },
  subValue: { type: [String, Number], default: null },
  iconBg: { type: String, default: 'bg-blue-500' },
  valueClass: { type: String, default: 'text-2xl font-semibold text-gray-900' },
  progress: { type: Number, default: null },
  progressColor: { type: String, default: 'bg-green-600' },
  footerText: { type: String, default: null },
})

const showProgress = computed(() => props.progress !== null && props.progress !== undefined)
</script>