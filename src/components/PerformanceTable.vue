<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200">
    <div class="px-6 py-4 border-b border-gray-200">
      <h3 class="text-lg font-semibold text-gray-900">Performance Detalhada da Equipe</h3>
      <p class="text-sm text-gray-600 mt-1">Desempenho individual com metas e progresso</p>
    </div>

    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Representante
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Supervisor
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Propostas
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Vendas
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Faturamento
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Meta Propostas
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Meta Vendas
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Meta Faturamento
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Taxa Conversão
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr 
            v-for="member in teamMembers" 
            :key="member.id"
            class="hover:bg-gray-50 transition-colors duration-150"
          >
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex items-center">
                <div class="flex-shrink-0 h-10 w-10">
                  <div class="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                    <span class="text-sm font-medium text-indigo-800">
                      {{ member.name.charAt(0).toUpperCase() }}
                    </span>
                  </div>
                </div>
                <div class="ml-4">
                  <button
                    @click="$emit('view-details', member.id)"
                    class="text-sm font-medium text-indigo-600 hover:text-indigo-900 cursor-pointer"
                  >
                    {{ member.name }}
                  </button>
                  <div class="text-sm text-gray-500">{{ member.email }}</div>
                </div>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ member.supervisorName || 'N/A' }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-gray-900">{{ member.performance.totalPropostas }}</div>
              <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div 
                  class="h-2 rounded-full transition-all duration-300"
                  :class="getProgressColor(member.achievements.propostasAchievement)"
                  :style="{ width: Math.min(member.achievements.propostasAchievement, 100) + '%' }"
                ></div>
              </div>
              <div class="text-xs text-gray-500 mt-1">
                {{ member.achievements.propostasAchievement }}% da meta
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-gray-900">{{ member.performance.propostasConvertidas }}</div>
              <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div 
                  class="h-2 rounded-full transition-all duration-300"
                  :class="getProgressColor(member.achievements.vendasAchievement)"
                  :style="{ width: Math.min(member.achievements.vendasAchievement, 100) + '%' }"
                ></div>
              </div>
              <div class="text-xs text-gray-500 mt-1">
                {{ member.achievements.vendasAchievement }}% da meta
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-medium text-gray-900">
                {{ formatCurrency(member.performance.faturamentoTotal) }}
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div 
                  class="h-2 rounded-full transition-all duration-300"
                  :class="getProgressColor(member.achievements.faturamentoAchievement)"
                  :style="{ width: Math.min(member.achievements.faturamentoAchievement, 100) + '%' }"
                ></div>
              </div>
              <div class="text-xs text-gray-500 mt-1">
                {{ member.achievements.faturamentoAchievement }}% da meta
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ member.targets.metaPropostas }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ member.targets.metaVendas }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ formatCurrency(member.targets.metaFaturamento) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span 
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                :class="getConversionRateClass(member.performance.conversionRate)"
              >
                {{ member.performance.conversionRate.toFixed(1) }}%
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty state -->
    <div v-if="!teamMembers || teamMembers.length === 0" class="text-center py-12">
      <div class="text-gray-500">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">Nenhum membro da equipe encontrado</h3>
        <p class="mt-1 text-sm text-gray-500">Ajuste os filtros para ver os dados da equipe.</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PerformanceTable',
  props: {
    teamMembers: {
      type: Array,
      default: () => []
    }
  },
  emits: ['view-details'],
  methods: {
    formatCurrency(value) {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value || 0)
    },
    getProgressColor(percentage) {
      if (percentage >= 100) return 'bg-green-500'
      if (percentage >= 80) return 'bg-yellow-500'
      if (percentage >= 60) return 'bg-orange-500'
      return 'bg-red-500'
    },
    getConversionRateClass(rate) {
      if (rate >= 30) return 'bg-green-100 text-green-800'
      if (rate >= 20) return 'bg-yellow-100 text-yellow-800'
      if (rate >= 10) return 'bg-orange-100 text-orange-800'
      return 'bg-red-100 text-red-800'
    }
  }
}
</script>
