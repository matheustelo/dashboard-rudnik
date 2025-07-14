<template>
  <div class="chart-container">
    <canvas ref="chartRef"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend
)

const props = defineProps({
  data: {
    type: Object,
    required: true
  },
  options: {
    type: Object,
    default: () => ({})
  }
})

const chartRef = ref(null)
let chartInstance = null

const createChart = () => {
  if (chartInstance) {
    chartInstance.destroy()
  }

  const ctx = chartRef.value.getContext('2d')
  chartInstance = new ChartJS(ctx, {
    type: 'bar',
    data: props.data,
    options: props.options
  })
}

onMounted(() => {
  createChart()
})

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.destroy()
  }
})

watch(() => props.data, () => {
  createChart()
}, { deep: true })
</script>

<style scoped>
.chart-container {
  position: relative;
  height: 300px;
}
</style>
