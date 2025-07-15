<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" @click="closeModal"></div>
      
      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
      
      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <!-- Header -->
          <div class="flex items-center justify-between mb-6">
            <div>
              <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                Detalhes de Performance - {{ representative?.name }}
              </h3>
              <p class="mt-1 text-sm text-gray-500">
                {{ representative?.email }} • {{ representative?.role }}
              </p>
            </div>
            <button
              @click="closeModal"
              class="bg-white rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <span class="sr-only">Fechar</span>
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Loading State -->
          <div v-if="loading" class="flex justify-center items-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>

          <!-- Content -->
          <div v-else-if="data" class="space-y-6">
            <!-- Summary Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div class="bg-blue-50 p-4 rounded-lg">
                <div class="text-2xl font-bold text-blue-600">{{ data.summary.totalPropostas }}</div>
                <div class="text-sm text-blue-800">Total de Propostas</div>
              </div>
              <div class="bg-green-50 p-4 rounded-lg">
                <div class="text-2xl font-bold text-green-600">{{ data.summary.vendasFechadas }}</div>
                <div class="text-sm text-green-800">Vendas Fechadas</div>
              </div>
              <div class="bg-purple-50 p-4 rounded-lg">
                <div class="text-2xl font-bold text-purple-600">{{ data.summary.conversionRate }}%</div>
                <div class="text-sm text-purple-800">Taxa de Conversão</div>
              </div>
              <div class="bg-yellow-50 p-4 rounded-lg">
                <div class="text-2xl font-bold text-yellow-600">{{ formatCurrency(data.summary.faturamentoTotal) }}</div>
                <div class="text-sm text-yellow-800">Faturamento Total</div>
              </div>
            </div>

            <!-- Charts Row -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- Monthly Trend Chart -->
              <div class="bg-white p-6 rounded-lg border border-gray-200">
                <h4 class="text-lg font-medium text-gray-900 mb-4">Tendência Mensal</h4>
                <div class="h-64">
                  <canvas ref="monthlyChart"></canvas>
                </div>
              </div>

              <!-- Weekly Trend Chart -->
              <div class="bg-white p-6 rounded-lg border border-gray-200">
                <h4 class="text-lg font-medium text-gray-900 mb-4">Tendência Semanal</h4>
                <div class="h-64">
                  <canvas ref="weeklyChart"></canvas>
                </div>
              </div>
            </div>

            <!-- Proposals Table -->
            <div class="bg-white rounded-lg border border-gray-200">
              <div class="px-6 py-4 border-b border-gray-200">
                <h4 class="text-lg font-medium text-gray-900">Propostas Detalhadas</h4>
              </div>
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cliente
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
                    <tr v-for="proposal in data.proposals" :key="proposal.id">
                      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {{ proposal.clientName }}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {{ formatCurrency(proposal.totalPrice) }}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <span 
                          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          :class="proposal.status === 'Convertida' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'"
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
    </div>
  </div>
</template>

<script>
import { Chart, registerables } from 'chart.js'
import { performanceService } from '@/services/api'

Chart.register(...registerables)

export default {
  name: 'RepresentativeDetailModal',
  props: {
    isOpen: {
      type: Boolean,
      default: false
    },
    representativeId: {
      type: [String, Number],
      default: null
    },
    filters: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      loading: false,
      data: null,
      representative: null,
      monthlyChart: null,
      weeklyChart: null
    }
  },
  watch: {
    isOpen(newVal) {
      if (newVal && this.representativeId) {
        this.fetchData()
      } else if (!newVal) {
        this.destroyCharts()
      }
    },
    representativeId(newVal) {
      if (newVal && this.isOpen) {
        this.fetchData()
      }
    }
  },
  methods: {
    async fetchData() {
      if (!this.representativeId) return
      
      this.loading = true
      try {
        const response = await performanceService.getRepresentativeDetails(this.representativeId, this.filters)
        this.data = response.data
        this.representative = response.data.representative
        
        this.$nextTick(() => {
          this.createCharts()
        })
      } catch (error) {
        console.error('Error fetching representative details:', error)
      } finally {
        this.loading = false
      }
    },
    
    createCharts() {
      this.destroyCharts()
      
      if (this.data?.monthlyTrend) {
        this.createMonthlyChart()
      }
      
      if (this.data?.weeklyTrend) {
        this.createWeeklyChart()
      }
    },
    
    createMonthlyChart() {
      const ctx = this.$refs.monthlyChart?.getContext('2d')
      if (!ctx) return
      
      const labels = this.data.monthlyTrend.map(item => 
        new Date(item.mes).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
      )
      
      this.monthlyChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Propostas',
              data: this.data.monthlyTrend.map(item => item.propostas),
              borderColor: 'rgb(59, 130, 246)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              tension: 0.4
            },
            {
              label: 'Vendas',
              data: this.data.monthlyTrend.map(item => item.vendas),
              borderColor: 'rgb(16, 185, 129)',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              tension: 0.4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      })
    },
    
    createWeeklyChart() {
      const ctx = this.$refs.weeklyChart?.getContext('2d')
      if (!ctx) return
      
      const labels = this.data.weeklyTrend.map(item => 
        new Date(item.semana).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })
      )
      
      this.weeklyChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Faturamento',
              data: this.data.weeklyTrend.map(item => item.faturamento),
              backgroundColor: 'rgba(168, 85, 247, 0.8)',
              borderColor: 'rgb(168, 85, 247)',
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  return new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                    minimumFractionDigits: 0
                  }).format(value)
                }
              }
            }
          }
        }
      })
    },
    
    destroyCharts() {
      if (this.monthlyChart) {
        this.monthlyChart.destroy()
        this.monthlyChart = null
      }
      if (this.weeklyChart) {
        this.weeklyChart.destroy()
        this.weeklyChart = null
      }
    },
    
    closeModal() {
      this.$emit('close')
    },
    
    formatCurrency(value) {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value || 0)
    },
    
    formatDate(dateString) {
      return new Date(dateString).toLocaleDateString('pt-BR')
    }
  },
  
  beforeUnmount() {
    this.destroyCharts()
  }
}
</script>
