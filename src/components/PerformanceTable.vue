<template>
  <div class="bg-white shadow rounded-lg overflow-hidden">
    <div class="px-4 py-5 sm:p-6">
      <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
        {{ title }}
      </h3>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
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
                Vendas
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Taxa Conversão
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Faturamento
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ticket Médio
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Metas
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              v-for="(member, index) in teamMembers"
              :key="member.id"
              :class="getRowClass(member, index)"
            >
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
                    <div class="text-sm font-medium text-gray-900">{{ member.name }}</div>
                    <div class="text-sm text-gray-500">{{ member.email }}</div>
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
                {{ member.performance.totalPropostas }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ member.performance.propostasConvertidas }}
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
                R$ {{ formatCurrency(member.performance.faturamentoTotal) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                R$ {{ formatCurrency(member.performance.ticketMedio) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">
                  {{ member.goals.achievedGoals }}/{{ member.goals.totalGoals }}
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    class="h-2 rounded-full"
                    :class="getGoalProgressColor(member.goals)"
                    :style="{ width: getGoalProgressPercentage(member.goals) + '%' }"
                  ></div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span 
                  :class="getStatusClass(member)"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                >
                  {{ getStatusLabel(member) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  teamMembers: {
    type: Array,
    required: true
  },
  title: {
    type: String,
    default: 'Performance da Equipe'
  }
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

const getRowClass = (member, index) => {
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

const getGoalProgressColor = (goals) => {
  if (goals.totalGoals === 0) return 'bg-gray-300'
  const percentage = (goals.achievedGoals / goals.totalGoals) * 100
  if (percentage >= 100) return 'bg-green-500'
  if (percentage >= 75) return 'bg-yellow-500'
  return 'bg-red-500'
}

const getGoalProgressPercentage = (goals) => {
  if (goals.totalGoals === 0) return 0
  return Math.min((goals.achievedGoals / goals.totalGoals) * 100, 100)
}

const getStatusClass = (member) => {
  const conversionRate = member.performance.conversionRate
  const goalProgress = member.goals.totalGoals > 0 ? (member.goals.achievedGoals / member.goals.totalGoals) * 100 : 0
  
  if (conversionRate >= 20 && goalProgress >= 75) {
    return 'bg-green-100 text-green-800'
  } else if (conversionRate >= 15 && goalProgress >= 50) {
    return 'bg-yellow-100 text-yellow-800'
  } else {
    return 'bg-red-100 text-red-800'
  }
}

const getStatusLabel = (member) => {
  const conversionRate = member.performance.conversionRate
  const goalProgress = member.goals.totalGoals > 0 ? (member.goals.achievedGoals / member.goals.totalGoals) * 100 : 0
  
  if (conversionRate >= 20 && goalProgress >= 75) {
    return 'Excelente'
  } else if (conversionRate >= 15 && goalProgress >= 50) {
    return 'Bom'
  } else {
    return 'Precisa Melhorar'
  }
}
</script>
