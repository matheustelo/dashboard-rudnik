<template>
  <div class="chart-container">
    <canvas ref="chartRef"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'

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
let ChartJS = null

const loadChartJs = async () => {
  if (ChartJS) return
  const chartJs = await import('chart.js')
  const {
    Chart,
    CategoryScale,
    LinearScale,
    BarElement,
    BarController,
    Title,
    Tooltip,
    Legend
  } = chartJs
  Chart.register(
    CategoryScale,
    LinearScale,
    BarElement,
    BarController,
    Title,
    Tooltip,
    Legend
  )
  ChartJS = Chart
}

const createChart = async () => {
  await loadChartJs()
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

watch(
  () => props.data,
  () => {
    createChart()
  },
  { deep: true }
)
</script>

<style scoped>
.chart-container {
  position: relative;
  height: 300px;
}
</style>
