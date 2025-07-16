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
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Posição</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Propostas</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Meta Prop.</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendas</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Meta Vendas</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tx. Conversão</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Faturamento</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Meta Fat.</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="(member, index) in sortedTeamMembers" :key="member.id" :class="getRowClass(index)" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                <span v-if="index === 0" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">🥇 1º</span>
                <span v-else-if="index === 1" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">🥈 2º</span>
                <span v-else-if="index === 2" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">🥉 3º</span>
                <span v-else class="text-gray-500">{{ index + 1 }}º</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="flex-shrink-0 h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center"><span class="text-sm font-medium text-gray-700">{{ member.name.charAt(0).toUpperCase() }}</span></div>
                  <div class="ml-4">
                    <button @click="$emit('drill-down', member)" class="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline">{{ member.name }}</button>
                    <div class="text-sm text-gray-500">{{ member.email }}</div>
                    <div v-if="member.supervisorName" class="text-xs text-gray-400">Supervisor: {{ member.supervisorName }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap"><span :class="getRoleClass(member.role)" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">{{ getRoleLabel(member.role) }}</span></td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900"><div class="flex flex-col"><span class="font-medium">{{ member.performance.totalPropostas }}</span><div class="w-full bg-gray-200 rounded-full h-1 mt-1"><div class="h-1 rounded-full bg-blue-500" :style="{ width: Math.min((member.performance.totalPropostas / member.targets.metaPropostas) * 100, 100) + '%' }"></div></div></div></td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><div class="flex flex-col"><span>{{ member.targets.metaPropostas }}</span><span class="text-xs" :class="getAchievementColor(member.achievements.propostasAchievement)">{{ member.achievements.propostasAchievement }}%</span></div></td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900"><div class="flex flex-col"><span class="font-medium">{{ member.performance.propostasConvertidas }}</span><div class="w-full bg-gray-200 rounded-full h-1 mt-1"><div class="h-1 rounded-full bg-green-500" :style="{ width: Math.min((member.performance.propostasConvertidas / member.targets.metaVendas) * 100, 100) + '%' }"></div></div></div></td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><div class="flex flex-col"><span>{{ member.targets.metaVendas }}</span><span class="text-xs" :class="getAchievementColor(member.achievements.vendasAchievement)">{{ member.achievements.vendasAchievement }}%</span></div></td>
              <td class="px-6 py-4 whitespace-nowrap"><div class="flex items-center"><div class="flex-1"><div class="text-sm text-gray-900">{{ member.performance.conversionRate }}%</div><div class="w-full bg-gray-200 rounded-full h-2 mt-1"><div class="h-2 rounded-full" :class="getConversionRateColor(member.performance.conversionRate)" :style="{ width: Math.min(member.performance.conversionRate, 100) + '%' }"></div></div></div></div></td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900"><div class="flex flex-col"><span class="font-medium">R$ {{ formatCurrency(member.performance.faturamentoTotal) }}</span><div class="w-full bg-gray-200 rounded-full h-1 mt-1"><div class="h-1 rounded-full bg-purple-500" :style="{ width: Math.min((member.performance.faturamentoTotal / member.targets.metaFaturamento) * 100, 100) + '%' }"></div></div></div></td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><div class="flex flex-col"><span>R$ {{ formatCurrency(member.targets.metaFaturamento) }}</span><span class="text-xs" :class="getAchievementColor(member.achievements.faturamentoAchievement)">{{ member.achievements.faturamentoAchievement }}%</span></div></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  teamMembers: { type: Array, required: true },
  title: { type: String, default: 'Performance Detalhada da Equipe' }
})

const emit = defineEmits(['drill-down'])

const sortedTeamMembers = computed(() => [...props.teamMembers].sort((a, b) => b.performance.faturamentoTotal - a.performance.faturamentoTotal))
const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0)
const getRoleClass = (role) => ({
  vendedor: 'bg-blue-100 text-blue-800',
  representante: 'bg-purple-100 text-purple-800',
  parceiro_comercial: 'bg-green-100 text-green-800',
  supervisor: 'bg-indigo-100 text-indigo-800',
  preposto: 'bg-teal-100 text-teal-800',
  representante_premium: 'bg-yellow-100 text-yellow-800',
}[role] || 'bg-gray-100 text-gray-800')
const getRoleLabel = (role) => ({
  vendedor: 'Vendedor',
  representante: 'Representante',
  parceiro_comercial: 'Parceiro Comercial',
  supervisor: 'Supervisor',
  preposto: 'Preposto',
  representante_premium: 'Representante Premium',
}[role] || role)
const getRowClass = (index) => (index < 3 ? 'bg-yellow-50' : '')
const getConversionRateColor = (rate) => (rate >= 20 ? 'bg-green-500' : rate >= 15 ? 'bg-yellow-500' : 'bg-red-500')
const getAchievementColor = (percentage) => {
  const pct = parseFloat(percentage)
  if (pct >= 100) return 'text-green-600 font-medium'
  if (pct >= 75) return 'text-yellow-600 font-medium'
  return 'text-red-600 font-medium'
}
</script>
