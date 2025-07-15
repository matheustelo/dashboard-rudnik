<template>
  <div class="bg-white shadow rounded-lg overflow-hidden">
    <div class="px-4 py-5 sm:p-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg leading-6 font-medium text-gray-900">
          {{ title }}
        </h3>
        
        <!-- Enhanced Filters -->
        <div class="flex space-x-4">
          <!-- Date Range Filter -->
          <div class="flex space-x-2">
            <input
              v-model="filters.startDate"
              type="date"
              class="border border-gray-300 rounded-md px-3 py-2 text-sm"
              @change="$emit('filter-change', filters)"
            />
            <input
              v-model="filters.endDate"
              type="date"
              class="border border-gray-300 rounded-md px-3 py-2 text-sm"
              @change="$emit('filter-change', filters)"
            />
          </div>
          
          <!-- Supervisor Filter -->
          <select
            v-model="filters.supervisor"
            @change="$emit('filter-change', filters)"
            class="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="all">Todos os Supervisores</option>
            <option 
              v-for="supervisor in supervisors" 
              :key="supervisor.id" 
              :value="supervisor.id"
            >
              {{ supervisor.name }}
            </option>
          </select>
          
          <!-- Period Filter -->
          <select
            v-model="filters.period"
            @change="$emit('filter-change', filters)"
            class="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">Período Personalizado</option>
            <option value="2025-01">Janeiro 2025</option>
            <option value="2025-02">Fevereiro 2025</option>
            <option value="2025-03">Março 2025</option>
            <option value="2025-04">Abril 2025</option>
            <option value="2025-05">Maio 2025</option>
            <option value="2025-06">Junho 2025</option>
            <option value="2025-07">Julho 2025</option>
          </select>
        </div>
      </div>
      
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Posição
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nome
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Propostas
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Meta Propostas
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vendas
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Meta Vendas
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Taxa Conversão
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Faturamento
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Meta Faturamento
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              v-for="(member, index) in sortedTeamMembers"
              :key="member.id"
              :class="getRowClass(index)"
              class="hover:bg-gray-50 transition-colors duration-200"
            >
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                <span
                  v-if="index === 0"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
                >
                  🥇 1º
                </span>
                <span
                  v-else-if="index === 1"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                >
                  🥈 2º
                </span>
                <span
                  v-else-if="index === 2"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800"
                >
                  🥉 3º
                </span>
                <span v-else class="text-gray-500">{{ index + 1 }}º</span>
              </td>
              
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="flex-shrink-0 h-10 w-10">
                    <div class="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <span class="text-sm font-medium text-gray-700">
                        {{ member.name.charAt(0).toUpperCase() }}
                      </span>
                    </div>
                  </div>
                  <div class="ml-4">
                    <button
                      @click="$emit('drill-down', member)"
                      class="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    >
                      {{ member.name }}
                    </button>
                    <div class="text-sm text-gray-500">{{ member.email }}</div>
                    <div v-if="member.supervisorName" class="text-xs text-gray-400">
                      Supervisor: {{ member.supervisorName }}
                    </div>
                  </div>
                </div>
              </td>
              
              <td class="px-6 py-4 whitespace-nowrap">
                <span 
                  :class="getRoleClass(member.role)"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                >
                  {{ getRoleLabel(member.role) }}
                </span>
              </td>
              
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <div class="flex flex-col">
                  <span class="font-medium">{{ member.performance.totalPropostas }}</span>
                  <div class="w-full bg-gray-200 rounded-full h-1 mt-1">
                    <div 
                      class="h-1 rounded-full bg-blue-500"
                      :style="{ width: Math.min((member.performance.totalPropostas / member.targets.metaPropostas) * 100, 100) + '%' }"
                    ></div>
                  </div>
                </div>
              </td>
              
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div class="flex flex-col">
                  <span>{{ member.targets.metaPropostas }}</span>
                  <span class="text-xs" :class="getAchievementColor(member.achievements.propostasAchievement)">
                    {{ member.achievements.propostasAchievement }}%
                  </span>
                </div>
              </td>
              
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <div class="flex flex-col">
                  <span class="font-medium">{{ member.performance.propostasConvertidas }}</span>
                  <div class="w-full bg-gray-200 rounded-full h-1 mt-1">
                    <div 
                      class="h-1 rounded-full bg-green-500"
                      :style="{ width: Math.min((member.performance.propostasConvertidas / member.targets.metaVendas) * 100, 100) + '%' }"
                    ></div>
                  </div>
                </div>
              </td>
              
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div class="flex flex-col">
                  <span>{{ member.targets.metaVendas }}</span>
                  <span class="text-xs" :class="getAchievementColor(member.achievements.vendasAchievement)">
                    {{ member.achievements.vendasAchievement }}%
                  </span>
                </div>
              </td>
              
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="flex-1">
                    <div class="text-sm text-gray-900">{{ member.performance.conversionRate }}%</div>
                    <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        class="h-2 rounded-full"
                        :class="getConversionRateColor(member.performance.conversionRate)"
                        :style="{ width: Math.min(member.performance.conversionRate, 100) + '%' }"
                      ></div>
                    </div>
                  </div>
                </div>
              </td>
              
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <div class="flex flex-col">
                  <span class="font-medium">R$ {{ formatCurrency(member.performance.faturamentoTotal) }}</span>
                  <div class="w-full bg-gray-200 rounded-full h-1 mt-1">
                    <div 
                      class="h-1 rounded-full bg-purple-500"
                      :style="{ width: Math.min((member.performance.faturamentoTotal / member.targets.metaFaturamento) * 100, 100) + '%' }"
                    ></div>
                  </div>
                </div>
              </td>
              
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div class="flex flex-col">
                  <span>R$ {{ formatCurrency(member.targets.metaFaturamento) }}</span>
                  <span class="text-xs" :class="getAchievementColor(member.achievements.faturamentoAchievement)">
                    {{ member.achievements.faturamentoAchievement }}%
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  teamMembers: {
    type: Array,
    required: true
  },
  supervisors: {
    type: Array,
    default: () => []
  },
  title: {
    type: String,
    default: 'Performance Detalhada da Equipe'
  }
})

const emit = defineEmits(['filter-change', 'drill-down'])

const filters = ref({
  startDate: '',
  endDate: '',
  supervisor: 'all',
  period: ''
})

// Sort team members by faturamento (descending)
const sortedTeamMembers = computed(() => {
  return [...props.teamMembers].sort((a, b) => 
    b.performance.faturamentoTotal - a.performance.faturamentoTotal
  )
})

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

const getRoleClass = (role) => {
  switch (role) {
    case 'vendedor':
      return 'bg-blue-100 text-blue-800'
    case 'representante':
      return 'bg-purple-100 text-purple-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const getRoleLabel = (role) => {
  switch (role) {
    case 'vendedor':
      return 'Vendedor'
    case 'representante':
      return 'Representante'
    default:
      return role
  }
}

const getRowClass = (index) => {
  if (index < 3) {
    return 'bg-yellow-50'
  }
  return ''
}

const getConversionRateColor = (rate) => {
  if (rate >= 20) return 'bg-green-500'
  if (rate >= 15) return 'bg-yellow-500'
  return 'bg-red-500'
}

const getAchievementColor = (percentage) => {
  const pct = parseFloat(percentage)
  if (pct >= 100) return 'text-green-600 font-medium'
  if (pct >= 75) return 'text-yellow-600 font-medium'
  return 'text-red-600 font-medium'
}
</script>
