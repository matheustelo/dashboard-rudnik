<template>
  <div class="bg-white p-6 rounded-lg shadow">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-medium text-gray-900">Metas e Progresso</h3>
      <button
        @click="refreshGoals"
        class="text-sm text-indigo-600 hover:text-indigo-800"
      >
        Atualizar
      </button>
    </div>
    
    <div v-if="loading" class="text-center py-8">
      <div class="text-gray-500">Carregando metas...</div>
    </div>
    
    <div v-else-if="goals.length === 0" class="text-center py-8">
      <div class="text-gray-500">Nenhuma meta encontrada para este período</div>
    </div>
    
    <div v-else class="space-y-4">
        <div v-if="summary" class="border rounded-lg p-4 bg-gray-50">
        <div class="flex justify-between items-center">
          <div class="text-sm text-gray-600">Progresso Total</div>
          <div class="text-right">
            <div class="text-lg font-semibold text-gray-900">{{ summary.progress.toFixed(1) }}%</div>
            <div class="text-sm text-gray-500">
              {{ formatValue(summary.achieved, 'faturamento') }} / {{ formatValue(summary.target, 'faturamento') }}
            </div>
          </div>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-3 mt-2">
          <div
            class="h-3 rounded-full transition-all duration-300"
            :class="getProgressColor(summary.progress)"
            :style="{ width: Math.min(summary.progress, 100) + '%' }"
          ></div>
        </div>
      </div>
      <div 
        v-for="goal in goals" 
        :key="goal.id"
        class="border rounded-lg p-4"
      >
        <div class="flex justify-between items-start mb-2">
          <div>
            <h4 class="font-medium text-gray-900">
              {{ goal.tipo_meta === 'faturamento' ? 'Meta de Faturamento' : 'Meta de Propostas' }}
            </h4>
            <p class="text-sm text-gray-500">
              {{ goal.isIndividual ? 'Meta Individual' : 'Meta Geral' }}
            </p>
          </div>
          <div class="text-right">
            <div class="text-lg font-semibold text-gray-900">
              {{ goal.progress.toFixed(1) }}%
            </div>
            <div class="text-sm text-gray-500">
              {{ formatValue(goal.achieved, goal.tipo_meta) }} / {{ formatValue(goal.valor_meta, goal.tipo_meta) }}
            </div>
          </div>
        </div>
        
        <div class="w-full bg-gray-200 rounded-full h-3">
          <div 
            class="h-3 rounded-full transition-all duration-300"
            :class="getProgressColor(goal.progress)"
            :style="{ width: Math.min(goal.progress, 100) + '%' }"
          ></div>
        </div>
        
        <div class="mt-2 text-xs text-gray-500">
          Período: {{ formatDate(goal.data_inicio) }} - {{ formatDate(goal.data_fim) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { goalsService } from '../services/api'

const props = defineProps({
  userId: {
    type: [String, Number],
    required: true
  },
  period: {
    type: String,
    default: '2025-07'
  }
})

const goals = ref([])
const summary = ref(null)
const loading = ref(false)

const loadGoals = async () => {
  loading.value = true
  try {
    const response = await goalsService.getSellerTracking(props.userId, props.period)
    goals.value = response.data.goals
    summary.value = response.data.summary
  } catch (error) {
    console.error('Erro ao carregar metas:', error)
  } finally {
    loading.value = false
  }
}

const refreshGoals = () => {
  loadGoals()
}

const formatValue = (value, type) => {
  if (type === 'faturamento') {
    return `R$ ${new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)}`
  }
  return value.toString()
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('pt-BR')
}

const getProgressColor = (progress) => {
  if (progress >= 100) return 'bg-green-500'
  if (progress >= 75) return 'bg-yellow-500'
  if (progress >= 50) return 'bg-orange-500'
  return 'bg-red-500'
}

onMounted(() => {
  loadGoals()
})
</script>
