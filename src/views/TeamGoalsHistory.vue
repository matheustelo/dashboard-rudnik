<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <h1 class="text-xl font-semibold text-gray-900">Histórico de Metas da Equipe</h1>
        <div class="space-x-4">
          <router-link to="/dashboard/gerente_comercial" class="text-blue-600 hover:underline text-sm">Voltar</router-link>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto p-4">
      <div class="bg-white p-4 rounded shadow mb-4 flex flex-wrap items-end gap-2">
        <div>
          <label class="text-sm text-gray-700">Equipe</label>
          <select v-model="filters.leader" class="border border-gray-300 rounded px-2 py-1 text-sm">
            <option value="">Selecione</option>
            <option v-for="l in teamLeaders" :key="l.id" :value="l.id">{{ l.name }}</option>
          </select>
        </div>
        <div>
          <label class="text-sm text-gray-700">Status</label>
          <select v-model="filters.status" class="border border-gray-300 rounded px-2 py-1 text-sm">
            <option value="">Todos</option>
            <option value="active">Ativa</option>
            <option value="completed">Concluída</option>
            <option value="overdue">Vencida</option>
          </select>
        </div>
        <div>
          <label class="text-sm text-gray-700">Início</label>
          <input type="date" v-model="filters.start" class="border border-gray-300 rounded px-2 py-1 text-sm" />
        </div>
        <div>
          <label class="text-sm text-gray-700">Fim</label>
          <input type="date" v-model="filters.end" class="border border-gray-300 rounded px-2 py-1 text-sm" />
        </div>
        <button @click="fetchGoals" class="bg-blue-600 text-white px-3 py-1 rounded text-sm">Filtrar</button>
        <button @click="exportCSV" class="bg-green-600 text-white px-3 py-1 rounded text-sm">CSV</button>
        <button @click="exportPDF" class="bg-purple-600 text-white px-3 py-1 rounded text-sm">PDF</button>
      </div>

      <div v-if="loading" class="text-center text-gray-500 py-10">Carregando...</div>
      <table v-else class="min-w-full divide-y divide-gray-200 text-sm">
        <thead class="bg-gray-100">
          <tr>
            <th class="px-2 py-2 text-left">Equipe</th>
            <th class="px-2 py-2 text-left">Período</th>
            <th class="px-2 py-2 text-left">Tipo</th>
            <th class="px-2 py-2 text-left">Meta</th>
            <th class="px-2 py-2 text-left">Realizado</th>
            <th class="px-2 py-2 text-left">Progresso</th>
            <th class="px-2 py-2 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="g in sortedGoals" :key="g.id" class="bg-white border-b">
            <td class="px-2 py-1">{{ g.supervisor_name }}</td>
            <td class="px-2 py-1">{{ formatDate(g.data_inicio) }} - {{ formatDate(g.data_fim) }}</td>
            <td class="px-2 py-1">{{ g.tipo_meta }}</td>
            <td class="px-2 py-1">{{ formatCurrency(g.valor_meta) }}</td>
            <td class="px-2 py-1">{{ formatValue(g.achieved, g.tipo_meta) }}</td>
            <td class="px-2 py-1">{{ g.progress.toFixed(1) }}%</td>
            <td class="px-2 py-1">{{ g.status }}</td>
          </tr>
          <tr v-if="!sortedGoals.length">
            <td colspan="7" class="text-center text-gray-500 py-4">Nenhuma meta encontrada</td>
          </tr>
        </tbody>
      </table>

      <div class="mt-8">
        <TeamPerformanceChart v-if="chartData.labels.length" :data="chartData" title="Metas vs Realizado" type="bar" />
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { teamLeaderService, goalsService } from '../services/api'
import TeamPerformanceChart from '../components/TeamPerformanceChart.vue'

const teamLeaders = ref([])
const goals = ref([])
const loading = ref(false)

const filters = ref({ leader: '', status: '', start: '', end: '' })

const fetchLeaders = async () => {
  const { data } = await teamLeaderService.getTeamLeaders()
  teamLeaders.value = Array.isArray(data) ? data : []
}

const fetchGoals = async () => {
  if (!filters.value.leader) return
  loading.value = true
  try {
    const params = { startDate: filters.value.start || undefined, endDate: filters.value.end || undefined, status: filters.value.status || undefined }
    const { data } = await goalsService.getTeamGoals(filters.value.leader, params)
    goals.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.error('Erro ao carregar metas', err)
    goals.value = []
  } finally {
    loading.value = false
  }
}

const sortedGoals = computed(() => {
  return [...goals.value].sort((a, b) => a.data_inicio.localeCompare(b.data_inicio))
})

const formatDate = (d) => new Date(d).toLocaleDateString('pt-BR')
const formatCurrency = (v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
const formatValue = (v, type) => type === 'faturamento' ? formatCurrency(v) : v

const chartData = computed(() => {
  const labels = sortedGoals.value.map(g => g.data_inicio.slice(0,7))
  return {
    labels,
    datasets: [
      { label: 'Meta', backgroundColor: '#60a5fa', data: sortedGoals.value.map(g => parseFloat(g.valor_meta)) },
      { label: 'Realizado', backgroundColor: '#16a34a', data: sortedGoals.value.map(g => parseFloat(g.achieved || 0)) }
    ]
  }
})

const exportCSV = () => {
  const header = ['Equipe','Inicio','Fim','Tipo','Meta','Realizado','Progresso','Status']
  const rows = sortedGoals.value.map(g => [g.supervisor_name, g.data_inicio, g.data_fim, g.tipo_meta, g.valor_meta, g.achieved, g.progress.toFixed(1)+'%', g.status])
  const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'team-goals.csv'
  link.click()
}

const exportPDF = () => {
  const printContent = document.createElement('div')
  const rows = sortedGoals.value.map(g => `<tr><td>${g.supervisor_name}</td><td>${formatDate(g.data_inicio)} - ${formatDate(g.data_fim)}</td><td>${g.tipo_meta}</td><td>${formatCurrency(g.valor_meta)}</td><td>${formatValue(g.achieved, g.tipo_meta)}</td><td>${g.progress.toFixed(1)}%</td><td>${g.status}</td></tr>`).join('')
  printContent.innerHTML = `<table><thead><tr><th>Equipe</th><th>Periodo</th><th>Tipo</th><th>Meta</th><th>Realizado</th><th>Progresso</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`
  const w = window.open('', '')
  w.document.write(printContent.innerHTML)
  w.document.close()
  w.print()
}

onMounted(() => {
  fetchLeaders()
})
</script>

<style scoped>
 table th, table td { border-collapse: collapse; }
</style>