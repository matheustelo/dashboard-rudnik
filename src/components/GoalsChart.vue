<template>
  <div class="bg-white p-6 rounded-lg shadow">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-medium text-gray-900">Metas e Progresso</h3>
      <button @click="refreshGoals" class="text-sm text-indigo-600 hover:text-indigo-800">
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
       <div v-if="showSummary && goals.length" class="space-y-4">
        <div class="border rounded-lg p-4 bg-gray-50">
          <div class="flex justify-between items-center">
            <div class="text-sm text-gray-600">Progresso Faturamento</div>
            <div class="text-right">
              <div class="text-lg font-semibold text-gray-900">{{ revenueSummary.progress.toFixed(1) }}%</div>
              <div class="text-sm text-gray-500">
                {{ formatValue(revenueSummary.achieved, 'faturamento') }} / {{ formatValue(revenueSummary.target,
                'faturamento') }}
              </div>
            </div>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-3 mt-2">
            <div class="h-3 rounded-full transition-all duration-300" :class="getProgressColor(revenueSummary.progress)"
              :style="{ width: Math.min(revenueSummary.progress, 100) + '%' }"></div>
          </div>
        </div>
        <div class="border rounded-lg p-4 bg-gray-50">
          <div class="flex justify-between items-center">
            <div class="text-sm text-gray-600">Progresso Propostas</div>
            <div class="text-right">
              <div class="text-lg font-semibold text-gray-900">{{ proposalSummary.progress.toFixed(1) }}%</div>
              <div class="text-sm text-gray-500">
                {{ formatValue(proposalSummary.achieved, 'propostas') }} / {{ formatValue(proposalSummary.target,
                'propostas') }}
              </div>
            </div>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-3 mt-2">
            <div class="h-3 rounded-full transition-all duration-300"
              :class="getProgressColor(proposalSummary.progress)"
              :style="{ width: Math.min(proposalSummary.progress, 100) + '%' }"></div>
          </div>
        </div>
        <div class="border rounded-lg p-4 bg-gray-50">
          <div class="flex justify-between items-center">
            <div class="text-sm text-gray-600">Progresso Vendas</div>
            <div class="text-right">
              <div class="text-lg font-semibold text-gray-900">{{ salesSummary.progress.toFixed(1) }}%</div>
              <div class="text-sm text-gray-500">
                {{ formatValue(salesSummary.achieved, 'vendas') }} / {{ formatValue(salesSummary.target,
                'vendas') }}
              </div>
            </div>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-3 mt-2">
            <div class="h-3 rounded-full transition-all duration-300"
              :class="getProgressColor(salesSummary.progress)"
              :style="{ width: Math.min(salesSummary.progress, 100) + '%' }"></div>
          </div>
        </div>
        <div class="border rounded-lg p-4 bg-gray-50">
          <div class="flex justify-between items-center">
            <div class="text-sm text-gray-600">Progresso Taxa de Conversão</div>
            <div class="text-right">
              <div class="text-lg font-semibold text-gray-900">{{ conversionSummary.progress.toFixed(1) }}%</div>
              <div class="text-sm text-gray-500">
                {{ formatValue(conversionSummary.achieved, 'taxa_conversao') }} /
                {{ formatValue(conversionSummary.target, 'taxa_conversao') }}
              </div>
            </div>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-3 mt-2">
            <div class="h-3 rounded-full transition-all duration-300"
              :class="getProgressColor(conversionSummary.progress)"
              :style="{ width: Math.min(conversionSummary.progress, 100) + '%' }"></div>
          </div>
        </div>
      </div>
      <div v-for="goal in goals" :key="goal.id" class="border rounded-lg p-4">
        <div class="flex justify-between items-start mb-2">
          <div>
            <h4 class="font-medium text-gray-900">
              {{ goal.tipo_meta === 'faturamento'
                ? 'Meta de Faturamento'
                : goal.tipo_meta === 'propostas'
                  ? 'Meta de Propostas'
                  : goal.tipo_meta === 'vendas'
                    ? 'Meta de Vendas'
                    : 'Meta de Taxa de Conversão' }}
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
          <div class="h-3 rounded-full transition-all duration-300" :class="getProgressColor(goal.progress)"
            :style="{ width: Math.min(goal.progress, 100) + '%' }"></div>
        </div>

        <div class="mt-2 text-xs text-gray-500">
          Período: {{ formatDate(goal.data_inicio) }} - {{ formatDate(goal.data_fim) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { goalsService } from '../services/api'

const props = defineProps({
  userId: {
    type: [String, Number],
    default: null
  },
  period: {
    type: String,
    default: '2025-07'
  },
  goals: {
    type: Array,
    default: () => []
  },
  summary: {
    type: Object,
    default: null
  },
  showSummary: {
    type: Boolean,
    default: true
  }
})

const goals = ref(props.goals)
const summary = ref(props.summary)
const loading = ref(false)

const calcSummary = (items) => {
  const target = items.reduce((s, g) => s + parseFloat(g.valor_meta || 0), 0)
  const achieved = items.reduce((s, g) => s + parseFloat(g.achieved || 0), 0)
  const progress = target > 0 ? (achieved / target) * 100 : 0
  return { target, achieved, progress }
}

const revenueSummary = computed(() =>
  calcSummary(goals.value.filter((g) => g.tipo_meta === 'faturamento')),
)

const proposalSummary = computed(() =>
  calcSummary(goals.value.filter((g) => g.tipo_meta === 'propostas')),
)

const salesSummary = computed(() =>
  calcSummary(goals.value.filter((g) => g.tipo_meta === 'vendas')),
)

const conversionSummary = computed(() =>
  calcSummary(goals.value.filter((g) => g.tipo_meta === 'taxa_conversao')),
)

const loadGoals = async () => {
  if (!props.userId) return
  loading.value = true
  try {
    const response = await goalsService.getSellerTracking(
      props.userId,
      props.period
    )
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
  if (type === 'taxa_conversao') {
    return `${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
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
  if (props.goals && props.goals.length) {
    goals.value = props.goals
    summary.value = props.summary
  } else {
    loadGoals()
  }
})

watch(
  () => [props.userId, props.period],
  () => {
    if (!props.goals || props.goals.length === 0) {
      loadGoals()
    }
  }
)

watch(
  () => props.goals,
  (newGoals) => {
    if (newGoals && newGoals.length) {
      goals.value = newGoals
      summary.value = props.summary
    }
  }
)

watch(
  () => props.summary,
  (newSummary) => {
    if (props.goals && props.goals.length) {
      summary.value = newSummary
    }
  }
)
</script>
