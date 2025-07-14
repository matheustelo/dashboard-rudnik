<template>
  <div class="bg-white p-6 rounded-lg shadow">
    <h3 class="text-lg font-medium text-gray-900 mb-4">Acompanhamento de Metas</h3>
    
    <div v-if="!goals || goals.length === 0" class="text-center py-8 text-gray-500">
      <p>Nenhuma meta definida para este período</p>
    </div>
    
    <div v-else class="space-y-6">
      <!-- Chart -->
      <div class="chart-container">
        <canvas ref="chartRef"></canvas>
      </div>
      
      <!-- Goals Details -->
      <div class="space-y-4">
        <h4 class="text-md font-medium text-gray-900">Detalhes das Metas</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="goal in goals"
            :key="goal.id"
            class="border rounded-lg p-4"
            :class="getGoalCardClass(goal.progress)"
          >
            <div class="flex justify-between items-start mb-2">
              <div>
                <h5 class="font-medium text-gray-900">
                  {{ goal.tipo_meta === 'faturamento' ? 'Meta de Faturamento' : 'Meta de Propostas' }}
                </h5>
                <p class="text-sm text-gray-500">
                  {{ goal.isIndividual ? 'Meta Individual' : 'Meta Geral' }}
                </p>
              </div>
              <span 
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                :class="getProgressBadgeClass(goal.progress)"
              >
                {{ Math.round(goal.progress) }}%
              </span>
            </div>
            
            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Realizado:</span>
                <span class="font-medium">
                  {{ goal.tipo_meta === 'faturamento' 
                    ? `R$ ${formatCurrency(goal.achieved)}` 
                    : goal.achieved 
                  }}
                </span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Meta:</span>
                <span class="font-medium">
                  {{ goal.tipo_meta === 'faturamento' 
                    ? `R$ ${formatCurrency(goal.valor_meta)}` 
                    : goal.valor_meta 
                  }}
                </span>
              </div>
              
              <!-- Progress Bar -->
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div 
                  class="h-2 rounded-full transition-all duration-300"
                  :class="getProgressBarClass(goal.progress)"
                  :style="{ width: Math.min(goal.progress, 100) + '%' }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

const props = defineProps({
  goals: {
    type: Array,
    default: () => []
  }
})

const chartRef = ref(null)
let chartInstance = null

const createChart = () => {
  if (!props.goals || props.goals.length === 0) return
  
  if (chartInstance) {
    chartInstance.destroy()
  }

  const ctx = chartRef.value.getContext('2d')
  
  const labels = props.goals.map(goal => 
    goal.tipo_meta === 'faturamento' ? 'Faturamento' : 'Propostas'
  )
  
  const realizedData = props.goals.map(goal => goal.achieved)
  const targetData = props.goals.map(goal => Number.parseFloat(goal.valor_meta))
  
  chartInstance = new ChartJS(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Realizado',
          data: realizedData,
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 1
        },
        {
          label: 'Meta',
          data: targetData,
          backgroundColor: 'rgba(156, 163, 175, 0.8)',
          borderColor: 'rgba(156, 163, 175, 1)',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const goal = props.goals[context.dataIndex]
              const value = context.parsed.y
              if (goal.tipo_meta === 'faturamento') {
                return context.dataset.label + ': R$ ' + formatCurrency(value)
              }
              return context.dataset.label + ': ' + value
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              // Check if any goal is faturamento type
              const hasFaturamento = props.goals.some(goal => goal.tipo_meta === 'faturamento')
              if (hasFaturamento) {
                return 'R$ ' + formatCurrency(value)
              }
              return value
            }
          }
        }
      }
    }
  })
}

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

const getGoalCardClass = (progress) => {
  if (progress >= 100) return 'border-green-200 bg-green-50'
  if (progress >= 75) return 'border-yellow-200 bg-yellow-50'
  return 'border-blue-200 bg-blue-50'
}

const getProgressBadgeClass = (progress) => {
  if (progress >= 100) return 'bg-green-100 text-green-800'
  if (progress >= 75) return 'bg-yellow-100 text-yellow-800'
  return 'bg-blue-100 text-blue-800'
}

const getProgressBarClass = (progress) => {
  if (progress >= 100) return 'bg-green-500'
  if (progress >= 75) return 'bg-yellow-500'
  return 'bg-blue-500'
}

onMounted(() => {
  createChart()
})

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.destroy()
  }
})

watch(() => props.goals, () => {
  createChart()
}, { deep: true })
</script>

<style scoped>
.chart-container {
  position: relative;
  height: 300px;
}
</style>
