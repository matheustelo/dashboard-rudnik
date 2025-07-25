<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <!-- Background overlay -->
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="$emit('close')"></div>

      <!-- Modal panel -->
      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
        <!-- Header -->
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <div class="flex-shrink-0 h-12 w-12">
                <div class="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
                  <span class="text-lg font-medium text-gray-700">
                    {{ representative?.name?.charAt(0).toUpperCase() }}
                  </span>
                </div>
              </div>
              <div class="ml-4">
                <h3 class="text-lg leading-6 font-medium text-gray-900">
                  {{ representative?.name }}
                </h3>
                <p class="text-sm text-gray-500">{{ representative?.email }}</p>
                <p v-if="representative?.supervisorName" class="text-xs text-gray-400">
                  Supervisor: {{ representative.supervisorName }}
                </p>
              </div>
            </div>
            <button
              @click="$emit('close')"
              class="bg-white rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <span class="sr-only">Fechar</span>
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Content -->
        <div class="bg-gray-50 px-4 py-5 sm:px-6">
          <div v-if="loading" class="text-center py-12">
            <div class="text-lg">Carregando detalhes...</div>
          </div>

          <div v-else-if="details" class="space-y-6">
            <!-- Summary Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div class="bg-white overflow-hidden shadow rounded-lg">
                <div class="p-5">
                  <div class="flex items-center">
                    <div class="flex-shrink-0">
                      <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <span class="text-white text-sm font-bold">📋</span>
                      </div>
                    </div>
                    <div class="ml-5 w-0 flex-1">
                      <dl>
                        <dt class="text-sm font-medium text-gray-500 truncate">
                          Total Propostas
                        </dt>
                        <dd class="text-lg font-medium text-gray-900">
                          {{ details.summary.totalPropostas }}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div class="bg-white overflow-hidden shadow rounded-lg">
                <div class="p-5">
                  <div class="flex items-center">
                    <div class="flex-shrink-0">
                      <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <span class="text-white text-sm font-bold">✅</span>
                      </div>
                    </div>
                    <div class="ml-5 w-0 flex-1">
                      <dl>
                        <dt class="text-sm font-medium text-gray-500 truncate">
                          Vendas Fechadas
                        </dt>
                        <dd class="text-lg font-medium text-gray-900">
                          {{ details.summary.vendasFechadas }}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div class="bg-white overflow-hidden shadow rounded-lg">
                <div class="p-5">
                  <div class="flex items-center">
                    <div class="flex-shrink-0">
                      <div class="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                        <span class="text-white text-sm font-bold">📈</span>
                      </div>
                    </div>
                    <div class="ml-5 w-0 flex-1">
                      <dl>
                        <dt class="text-sm font-medium text-gray-500 truncate">
                          Taxa Conversão
                        </dt>
                        <dd class="text-lg font-medium text-gray-900">
                          {{ details.summary.conversionRate }}%
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div class="bg-white overflow-hidden shadow rounded-lg">
                <div class="p-5">
                  <div class="flex items-center">
                    <div class="flex-shrink-0">
                      <div class="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                        <span class="text-white text-sm font-bold">💰</span>
                      </div>
                    </div>
                    <div class="ml-5 w-0 flex-1">
                      <dl>
                        <dt class="text-sm font-medium text-gray-500 truncate">
                          Faturamento Total
                        </dt>
                        <dd class="text-lg font-medium text-gray-900">
                          R$ {{ formatCurrency(details.summary.faturamentoTotal) }}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Charts -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- Monthly Trend Chart -->
              <div class="bg-white p-6 rounded-lg shadow">
                <h4 class="text-lg font-medium text-gray-900 mb-4">Tendência Mensal</h4>
                <LineChart
                  v-if="monthlyChartData"
                  :data="monthlyChartData"
                  :options="chartOptions.monthly"
                />
              </div>

              <!-- Weekly Trend Chart -->
              <div class="bg-white p-6 rounded-lg shadow">
                <h4 class="text-lg font-medium text-gray-900 mb-4">Tendência Semanal</h4>
                <BarChart
                  v-if="weeklyChartData"
                  :data="weeklyChartData"
                  :options="chartOptions.weekly"
                />
              </div>
            </div>

            <!-- Conversion Funnel -->
            <div class="bg-white p-6 rounded-lg shadow">
              <h4 class="text-lg font-medium text-gray-900 mb-4">Funil de Conversão</h4>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="text-center">
                  <div class="text-3xl font-bold text-blue-600">
                    {{ details.summary.totalPropostas }}
                  </div>
                  <div class="text-sm text-gray-500">Propostas Criadas</div>
                  <div class="text-lg text-gray-600">
                    R$ {{ formatCurrency(details.summary.valorTotalPropostas) }}
                  </div>
                </div>
                
                <div class="flex items-center justify-center">
                  <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </div>
                
                <div class="text-center">
                  <div class="text-3xl font-bold text-green-600">
                    {{ details.summary.vendasFechadas }}
                  </div>
                  <div class="text-sm text-gray-500">Vendas Fechadas</div>
                  <div class="text-lg text-gray-600">
                    R$ {{ formatCurrency(details.summary.faturamentoTotal) }}
                  </div>
                </div>
              </div>
              
              <div class="mt-4 text-center">
                <div class="text-lg font-medium text-gray-900">
                  Taxa de Conversão: {{ details.summary.conversionRate }}%
                </div>
                <div class="text-sm text-gray-500">
                  Ticket Médio: R$ {{ formatCurrency(details.summary.ticketMedio) }}
                </div>
              </div>
            </div>

            <!-- Proposals Table -->
            <div class="bg-white shadow rounded-lg">
              <div class="px-4 py-5 sm:p-6">
                <h4 class="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Propostas Detalhadas ({{ filteredProposals.length }})
                </h4>
                <div class="mb-4 flex items-center space-x-2">
                  <label class="text-sm font-medium text-gray-700">Origem:</label>
                  <select v-model="originFilter" class="border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="all">Todos</option>
                    <option value="self">{{ selfLabel }}</option>
                    <option value="child">Usuários Filhos</option>
                    <option value="converted">Convertida</option>
                  </select>
                </div>
                <div class="overflow-hidden">
                  <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                      <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cliente
                        </th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Telefone
                        </th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Origem
                        </th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Valor
                        </th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data
                        </th>
                      </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                      <tr v-for="proposal in sortedProposals" :key="proposal.id">
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {{ proposal.clientName + ' #' +  proposal.id}}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {{ formatPhone(proposal.clientPhone) }}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {{ proposal.proposerName }}
                        </td>

                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          R$ {{ formatCurrency(proposal.totalPrice) }}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                          <span 
                            :class="proposal.hasGeneratedSale ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'"
                            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          >
                            {{ proposal.status }}
                          </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {{ formatDate(proposal.createdAt) }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button
            @click="$emit('close')"
            type="button"
            class="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, watch, ref } from 'vue'
import LineChart from './LineChart.vue'
import BarChart from './BarChart.vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  representative: {
    type: Object,
    default: null
  },
  details: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const uniqueProposals = computed(() => {
  if (!props.details?.proposals) return []
  const groups = {}
  for (const p of props.details.proposals) {
    if (!groups[p.clientPhone]) groups[p.clientPhone] = []
    groups[p.clientPhone].push(p)
  }
  const result = []
  Object.values(groups).forEach((list) => {
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    const activeConversions = list.filter(
      (p) => p.status === 'Convertida' && p.saleStatus !== 'suspenso'
    )
    if (activeConversions.length > 1) {
      result.push(...activeConversions)
    } else {
      result.push(list[0])
    }
  })
  return result
})

const originFilter = ref('all')

const selfLabel = computed(() => {
  const role = props.representative?.role || 'supervisor'
  return role === 'parceiro_comercial' ? 'Parceiro' : 'Supervisor'
})

const filteredProposals = computed(() => {
  if (originFilter.value === 'all') return uniqueProposals.value
  if (originFilter.value === 'converted') {
    return uniqueProposals.value.filter((p) => p.status === 'Convertida')
  }
  return uniqueProposals.value.filter((p) =>
    originFilter.value === 'self' ? p.origin === 'self' : p.origin === 'child'
  )
})

const sortedProposals = computed(() => {
  return [...filteredProposals.value].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  )
})

const monthlyChartData = computed(() => {
  if (!props.details?.monthlyTrend) return null

  return {
    labels: props.details.monthlyTrend.map(item => 
      new Date(item.mes).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
    ),
    datasets: [
      {
        label: 'Propostas',
        data: props.details.monthlyTrend.map(item => item.propostas),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4
      },
      {
        label: 'Vendas',
        data: props.details.monthlyTrend.map(item => item.vendas),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4
      }
    ]
  }
})

const weeklyChartData = computed(() => {
  if (!props.details?.weeklyTrend) return null

  return {
    labels: props.details.weeklyTrend.map(item => 
      new Date(item.semana).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })
    ),
    datasets: [
      {
        label: 'Faturamento (R$)',
        data: props.details.weeklyTrend.map(item => item.faturamento),
        backgroundColor: 'rgba(147, 51, 234, 0.8)',
      }
    ]
  }
})

const chartOptions = {
  monthly: {
    responsive: true,
    plugins: {
      legend: {
        position: 'top'
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  },
  weekly: {
    responsive: true,
    plugins: {
      legend: {
        position: 'top'
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  }
}

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('pt-BR')
}

const formatPhone = (phone) => {
  if (!phone) return ''
  const clean = phone.replace(/[^\d]/g, '')
  if (clean.length === 10) {
    return clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }
  if (clean.length === 11) {
    return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }
  return phone
}

// Close modal on Escape key
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        emit('close')
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }
})
</script>
