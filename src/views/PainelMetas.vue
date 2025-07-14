<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-6">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Painel de Metas</h1>
            <p class="text-gray-600">Bem-vindo, {{ authStore.user?.name }}</p>
          </div>
          <div class="flex items-center space-x-4">
            <button @click="logout" class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">Sair</button>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div v-if="loading" class="text-center py-12">Carregando...</div>
      <div v-else>
        <section class="mb-8">
          <h2 class="text-xl font-bold mb-2">Meta Geral</h2>
          <div class="flex items-end space-x-4">
            <div>
              <label class="block text-sm">Propostas</label>
              <input v-model.number="general.proposalsTarget" type="number" class="border rounded px-2 py-1" />
            </div>
            <div>
              <label class="block text-sm">Vendas</label>
              <input v-model.number="general.salesTarget" type="number" class="border rounded px-2 py-1" />
            </div>
            <button @click="saveGeneral" class="bg-blue-600 text-white px-4 py-2 rounded">Salvar</button>
          </div>
          <div class="mt-2 text-sm text-gray-700">
            Propostas: {{ general.proposalsAchieved }} / {{ general.proposalsTarget }} |
            Vendas: {{ general.salesAchieved }} / {{ general.salesTarget }}
          </div>
        </section>

        <section>
          <h2 class="text-xl font-bold mb-2">Metas Individuais</h2>
          <table class="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendedor</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Propostas</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendas</th>
                <th class="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="goal in individualGoals" :key="goal.userId">
                <td class="px-6 py-4 whitespace-nowrap">{{ goal.name }}</td>
                <td class="px-6 py-4">
                  <input v-model.number="goal.proposalsTarget" type="number" class="border rounded px-2 py-1 w-24" />
                  <span class="ml-2 text-sm text-gray-600">{{ goal.proposalsAchieved }}/{{ goal.proposalsTarget }}</span>
                </td>
                <td class="px-6 py-4">
                  <input v-model.number="goal.salesTarget" type="number" class="border rounded px-2 py-1 w-24" />
                  <span class="ml-2 text-sm text-gray-600">{{ goal.salesAchieved }}/{{ goal.salesTarget }}</span>
                </td>
                <td class="px-6 py-4">
                  <button @click="saveIndividual(goal)" class="bg-green-600 text-white px-3 py-1 rounded">Salvar</button>
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { goalsService } from '../services/api'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const period = ref(new Date().toISOString().slice(0,7))
const general = ref({ proposalsTarget: 0, salesTarget: 0, proposalsAchieved: 0, salesAchieved: 0 })
const individualGoals = ref([])

const loadGoals = async () => {
  loading.value = true
  try {
    const response = await goalsService.getGoals(period.value)
    general.value = response.data.data.general
    individualGoals.value = response.data.data.individuals
  } catch (e) {
    console.error('Erro ao carregar metas', e)
  } finally {
    loading.value = false
  }
}

const saveGeneral = async () => {
  try {
    await goalsService.saveGeneralGoal({
      period: period.value,
      target_proposals: general.value.proposalsTarget,
      target_sales: general.value.salesTarget,
    })
    loadGoals()
  } catch (e) {
    console.error('Erro ao salvar meta geral', e)
  }
}

const saveIndividual = async (goal) => {
  try {
    await goalsService.saveIndividualGoal({
      user_id: goal.userId,
      period: period.value,
      target_proposals: goal.proposalsTarget,
      target_sales: goal.salesTarget,
    })
    loadGoals()
  } catch (e) {
    console.error('Erro ao salvar meta', e)
  }
}

const logout = () => {
  authStore.logout()
  router.push('/login')
}

onMounted(() => {
  authStore.initializeAuth()
  loadGoals()
})
</script>