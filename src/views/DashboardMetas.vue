<template>
  <div class="min-h-screen bg-gray-100">
    <!-- Header -->
    <header class="bg-white shadow-sm">
      <div class="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <h1 class="text-2xl font-bold text-gray-900">Gerenciamento de Metas</h1>
        <router-link to="/dashboard/gerente_comercial" class="text-sm text-blue-600 hover:underline">
          &larr; Voltar ao Dashboard
        </router-link>
      </div>
    </header>

    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <!-- Tabs -->
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            @click="activeTab = 'general'"
            :class="[
              activeTab === 'general'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm',
            ]"
          >
            Metas Gerais (Supervisores)
          </button>
          <button
            @click="activeTab = 'individual'"
            :class="[
              activeTab === 'individual'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm',
            ]"
          >
            Metas Individuais (Vendedores)
          </button>
        </nav>
      </div>

      <!-- Content -->
      <div class="mt-6">
        <div v-if="loading" class="text-center py-10">
          <p class="text-gray-500">Carregando metas...</p>
        </div>
        <div v-else>
          <!-- General Goals Tab -->
          <div v-if="activeTab === 'general'">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl font-semibold">Metas Gerais</h2>
              <button @click="openGoalModal('general')" class="bg-blue-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-blue-700">
                + Nova Meta Geral
              </button>
            </div>
            <div class="bg-white shadow overflow-hidden sm:rounded-lg">
              <ul role="list" class="divide-y divide-gray-200">
                <li v-for="goal in goals.generalGoals" :key="goal.id" class="px-4 py-4 sm:px-6">
                  <div class="flex items-center justify-between">
                    <p class="text-sm font-medium text-indigo-600 truncate">
                      Meta de {{ goal.tipo_meta }}
                    </p>
                    <div class="ml-2 flex-shrink-0 flex space-x-4">
                      <button @click="openGoalModal('general', goal)" class="text-sm font-medium text-gray-500 hover:text-gray-700">Editar</button>
                      <button @click="deleteGoal('general', goal.id)" class="text-sm font-medium text-red-500 hover:text-red-700">Excluir</button>
                    </div>
                  </div>
                  <div class="mt-2 sm:flex sm:justify-between">
                    <div class="sm:flex">
                      <p class="flex items-center text-sm text-gray-500">
                        Valor: R$ {{ formatCurrency(goal.valor_meta) }}
                      </p>
                      <p class="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                        Período: {{ formatDate(goal.data_inicio) }} a {{ formatDate(goal.data_fim) }}
                      </p>
                    </div>
                  </div>
                </li>
                 <li v-if="!goals.generalGoals.length" class="px-4 py-4 sm:px-6 text-center text-gray-500">Nenhuma meta geral encontrada.</li>
              </ul>
            </div>
          </div>

          <!-- Individual Goals Tab -->
          <div v-if="activeTab === 'individual'">
             <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl font-semibold">Metas Individuais</h2>
              <button @click="openGoalModal('individual')" class="bg-blue-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-blue-700">
                + Nova Meta Individual
              </button>
            </div>
            <div class="bg-white shadow overflow-hidden sm:rounded-lg">
              <ul role="list" class="divide-y divide-gray-200">
                <li v-for="goal in goals.individualGoals" :key="goal.id" class="px-4 py-4 sm:px-6">
                   <div class="flex items-center justify-between">
                    <p class="text-sm font-medium text-indigo-600 truncate">
                      {{ goal.user_name }} - Meta de {{ goal.tipo_meta }}
                    </p>
                    <div class="ml-2 flex-shrink-0 flex space-x-4">
                      <button @click="openGoalModal('individual', goal)" class="text-sm font-medium text-gray-500 hover:text-gray-700">Editar</button>
                      <button @click="deleteGoal('individual', goal.id)" class="text-sm font-medium text-red-500 hover:text-red-700">Excluir</button>
                    </div>
                  </div>
                  <div class="mt-2 sm:flex sm:justify-between">
                    <div class="sm:flex">
                      <p class="flex items-center text-sm text-gray-500">
                        Valor: R$ {{ formatCurrency(goal.valor_meta) }}
                      </p>
                      <p class="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                        Período: {{ formatDate(goal.data_inicio) }} a {{ formatDate(goal.data_fim) }}
                      </p>
                    </div>
                  </div>
                </li>
                <li v-if="!goals.individualGoals.length" class="px-4 py-4 sm:px-6 text-center text-gray-500">Nenhuma meta individual encontrada.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Goal Modal -->
      <div v-if="showModal" class="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
        <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
          <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
          <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
            <form @submit.prevent="saveGoal">
              <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">{{ modal.title }}</h3>
                <div class="mt-4 space-y-4">
                  <div v-if="modal.type === 'individual'">
                    <label for="user" class="block text-sm font-medium text-gray-700">Vendedor/Representante</label>
                    <select id="user" v-model="currentGoal.usuario_id" required class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                      <option disabled value="">Selecione um usuário</option>
                      <option v-for="user in users" :key="user.id" :value="user.id">{{ user.name }}</option>
                    </select>
                  </div>
                  <div>
                    <label for="goal-type" class="block text-sm font-medium text-gray-700">Tipo de Meta</label>
                    <select id="goal-type" v-model="currentGoal.tipo_meta" required class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                      <option value="faturamento">Faturamento (R$)</option>
                      <option value="propostas">Propostas (Quantidade)</option>
                    </select>
                  </div>
                  <div>
                    <label for="value" class="block text-sm font-medium text-gray-700">Valor da Meta</label>
                    <input type="number" step="0.01" id="value" v-model="currentGoal.valor_meta" required class="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md">
                  </div>
                  <div>
                    <label for="start-date" class="block text-sm font-medium text-gray-700">Data de Início</label>
                    <input type="date" id="start-date" v-model="currentGoal.data_inicio" required class="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md">
                  </div>
                  <div>
                    <label for="end-date" class="block text-sm font-medium text-gray-700">Data de Fim</label>
                    <input type="date" id="end-date" v-model="currentGoal.data_fim" required class="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md">
                  </div>
                </div>
              </div>
              <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button type="submit" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm">
                  Salvar
                </button>
                <button @click="showModal = false" type="button" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from "vue"
import { goalsService, userService } from "../services/api"
import { useAuthStore } from "../stores/auth"

const loading = ref(true)
const activeTab = ref("general")
const goals = ref({ generalGoals: [], individualGoals: [] })
const users = ref([])
const showModal = ref(false)
const modal = reactive({ title: "", type: "" })
const currentGoal = ref({})
const authStore = useAuthStore()

const fetchGoals = async () => {
  loading.value = true
  try {
    const { data } = await goalsService.getGoals()
    goals.value = data
  } catch (error) {
    console.error("Erro ao buscar metas:", error)
  } finally {
    loading.value = false
  }
}

const fetchUsers = async () => {
  try {
    const { data } = await userService.getUsers()
    users.value = data.filter((u) => u.role === "vendedor" || u.role === "representante")
  } catch (error) {
    console.error("Erro ao buscar usuários:", error)
  }
}

const openGoalModal = (type, goal = null) => {
  modal.type = type
  if (goal) {
    modal.title = `Editar Meta ${type === "general" ? "Geral" : "Individual"}`
    currentGoal.value = { 
      ...goal,
      data_inicio: goal.data_inicio.split('T')[0],
      data_fim: goal.data_fim.split('T')[0]
    }
  } else {
    modal.title = `Nova Meta ${type === "general" ? "Geral" : "Individual"}`
    currentGoal.value = { tipo_meta: "faturamento", usuario_id: "" }
  }
  showModal.value = true
}

const saveGoal = async () => {
  try {
    await goalsService.saveGoal(modal.type, currentGoal.value)
    showModal.value = false
    fetchGoals()
  } catch (error) {
    console.error("Erro ao salvar meta:", error)
    alert("Falha ao salvar a meta.")
  }
}

const deleteGoal = async (type, id) => {
  if (confirm("Tem certeza que deseja excluir esta meta?")) {
    try {
      await goalsService.deleteGoal(type, id)
      fetchGoals()
    } catch (error) {
      console.error("Erro ao excluir meta:", error)
      alert("Falha ao excluir a meta.")
    }
  }
}

const formatDate = (dateString) => {
  if (!dateString) return ""
  return new Date(dateString).toLocaleDateString("pt-BR", { timeZone: "UTC" })
}

const formatCurrency = (value) => {
  if (typeof value !== 'number') return value;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

onMounted(() => {
  authStore.initializeAuth()
  fetchGoals()
  fetchUsers()
})
</script>
