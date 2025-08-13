<template>
  <div class="bg-white p-8 rounded-lg">
    <h3 class="text-lg font-medium text-gray-900 mb-4">{{ title }}</h3>
    <div class="h-64">
      <component 
        :is="chartComponent" 
        :data="data" 
        :options="options"
        class="w-full h-full"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent } from 'vue'

const LineChart = defineAsyncComponent(() => import('./LineChart.vue'))
const BarChart = defineAsyncComponent(() => import('./BarChart.vue'))

const props = defineProps({
  data: {
    type: Object,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'line',
    validator: (value) => ['line', 'bar'].includes(value)
  },
  options: {
    type: Object,
    default: () => ({})
  }
})

const chartComponent = computed(() => {
  return props.type === 'line' ? LineChart : BarChart
})
</script>
