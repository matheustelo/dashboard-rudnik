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
            @click="activeTab = 'team'"
            :class="[
              activeTab === 'team'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm',
            ]"
          >
            Metas por Equipe (Supervisores/Parceiros)
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
          <div v-if="errorMessage" class="mb-4 text-center text-red-600">
            {{ errorMessage }}
          </div>
          <!-- Team Goals Tab -->
          <div v-if="activeTab === 'team'">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl font-semibold">Metas por Equipe</h2>
              <button @click="openGoalModal('team')" class="bg-blue-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-blue-700">
                + Nova Meta de Equipe
              </button>
            </div>
            <div class="bg-white shadow overflow-hidden sm:rounded-lg">
              <ul role="list" class="divide-y divide-gray-200">
                <li v-for="goal in goals.generalGoals" :key="goal.id" class="px-4 py-4 sm:px-6">
                  <div class="flex items-center justify-between">
                    <p class="text-sm font-medium text-indigo-600 truncate">
                      {{ goal.supervisor_name }} - Meta de {{ goal.tipo_meta }}
                    </p>
                    <div class="ml-2 flex-shrink-0 flex space-x-4">
                      <button @click="deleteGoal('general', goal.id)" class="text-sm font-medium text-red-500 hover:text-red-700">Excluir</button>
                    </div>
                  </div>
                  <div class="mt-2 sm:flex sm:justify-between">
                    <div class="sm:flex">
                      <p class="flex items-center text-sm text-gray-500">
                        Valor Total: R$ {{ formatCurrency(goal.valor_meta) }}
                      </p>
                      <p class="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                        Período: {{ formatDate(goal.data_inicio) }} a {{ formatDate(goal.data_fim) }}
                      </p>
                    </div>
                  </div>
                </li>
                <li v-if="!goals.generalGoals.length" class="px-4 py-4 sm:px-6 text-center text-gray-500">Nenhuma meta de equipe encontrada.</li>
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
                  <div v-if="modal.type === 'team'">
                    <label for="leader" class="block text-sm font-medium text-gray-700">Líder de Equipe</label>
                    <select id="leader" v-model="currentGoal.usuario_id" @change="onLeaderChange" required class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                      <option disabled value="">Selecione um líder</option>
                      <option v-for="leader in teamLeaders" :key="leader.id" :value="leader.id">{{ leader.name }} ({{ leader.role }})</option>
                    </select>
                    
                    <!-- Manual Goal Distribution Interface -->
                    <div v-if="currentGoal.usuario_id && teamMembers.length > 0" class="mt-4 p-4 bg-gray-50 rounded-lg border">
                      <h4 class="text-sm font-medium text-gray-900 mb-3">Distribuição Manual de Metas</h4>
                      
                      <!-- Summary Section -->
                      <div class="mb-4 p-3 bg-white rounded border">
                        <div class="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span class="text-gray-600">Meta Total:</span>
                            <div class="font-semibold text-lg">{{ formatCurrency(currentGoal.valor_meta || 0) }}</div>
                          </div>
                          <div>
                            <span class="text-gray-600">Total Distribuído:</span>
                            <div class="font-semibold text-lg" :class="totalDistributed > (currentGoal.valor_meta || 0) ? 'text-red-600' : 'text-green-600'">
                              {{ formatCurrency(totalDistributed) }}
                            </div>
                          </div>
                          <div>
                            <span class="text-gray-600">Restante:</span>
                            <div class="font-semibold text-lg" :class="remainingAmount < 0 ? 'text-red-600' : 'text-blue-600'">
                              {{ formatCurrency(remainingAmount) }}
                            </div>
                          </div>
                        </div>
                        
                        <!-- Progress Bar -->
                        <div class="mt-2">
                          <div class="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              class="h-2 rounded-full transition-all duration-300"
                              :class="distributionProgress > 100 ? 'bg-red-500' : distributionProgress === 100 ? 'bg-green-500' : 'bg-blue-500'"
                              :style="{ width: Math.min(distributionProgress, 100) + '%' }"
                            ></div>
                          </div>
                          <div class="text-xs text-gray-500 mt-1">{{ distributionProgress.toFixed(1) }}% distribuído</div>
                        </div>
                      </div>
                      
                      <!-- Team Members Goal Assignment -->
                      <div class="space-y-3 max-h-60 overflow-y-auto">
                        <div v-for="member in teamMembers" :key="member.id" class="flex items-center justify-between p-3 bg-white rounded border">
                          <div class="flex-1">
                            <div class="font-medium text-sm text-gray-900">{{ member.name }}</div>
                            <div class="text-xs text-gray-500">{{ member.email }}</div>
                          </div>
                          <div class="flex items-center space-x-2">
                            <span class="text-sm text-gray-600">Meta:</span>
                            <div class="relative">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                :value="member.goalAmount || 0"
                                @input="updateMemberGoal(member.id, $event.target.value)"
                                @blur="validateMemberGoal(member.id)"
                                class="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                :class="member.hasError ? 'border-red-500 bg-red-50' : ''"
                              />
                              <div v-if="member.hasError" class="absolute -bottom-5 left-0 text-xs text-red-600">
                                {{ member.errorMessage }}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <!-- Quick Actions -->
                      <div class="mt-4 flex space-x-2">
                        <button
                          type="button"
                          @click="distributeEqually"
                          class="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          Distribuir Igualmente
                        </button>
                        <button
                          type="button"
                          @click="clearAllGoals"
                          class="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                          Limpar Tudo
                        </button>
                        <button
                          type="button"
                          @click="autoAdjustRemainder"
                          v-if="remainingAmount !== 0"
                          class="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                        >
                          Ajustar Restante
                        </button>
                      </div>
                      
                      <!-- Validation Messages -->
                      <div v-if="validationErrors.length > 0" class="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                        <div class="text-sm text-red-800 font-medium">Erros de Validação:</div>
                        <ul class="text-sm text-red-700 mt-1 list-disc list-inside">
                          <li v-for="error in validationErrors" :key="error">{{ error }}</li>
                        </ul>
                      </div>
                    </div>
                    
                    <div v-else-if="currentGoal.usuario_id && teamMembers.length === 0" class="mt-2 text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
                      <b>Atenção:</b> Este líder não possui vendedores na equipe. A meta não pode ser distribuída.
                    </div>
                  </div>
                  <div v-if="modal.type === 'individual'">
                    <label for="user" class="block text-sm font-medium text-gray-700">Vendedor/Representante</label>
                    <select id="user" v-model="currentGoal.usuario_id" required class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                      <option disabled value="">Selecione um usuário</option>
                      <option v-for="user in individualUsers" :key="user.id" :value="user.id">{{ user.name }}</option>
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
import { ref, onMounted, reactive, computed } from "vue"
import { goalsService, userService, teamLeaderService } from "../services/api"

const loading = ref(true)
const activeTab = ref("team")
const errorMessage = ref("")
const goals = ref({ generalGoals: [], individualGoals: [] })
const allUsers = ref([])
const teamLeaders = ref([])
const showModal = ref(false)
const modal = reactive({ title: "", type: "" })
const currentGoal = ref({})

const individualUsers = computed(() => allUsers.value.filter((u) => u.role === "vendedor" || u.role === "representante"))

// Add these new reactive variables
const teamMembers = ref([])
const validationErrors = ref([])

// Add these computed properties
const totalDistributed = computed(() => {
  return teamMembers.value.reduce((sum, member) => sum + (parseFloat(member.goalAmount) || 0), 0)
})

const remainingAmount = computed(() => {
  return (parseFloat(currentGoal.value.valor_meta) || 0) - totalDistributed.value
})

const distributionProgress = computed(() => {
  const total = parseFloat(currentGoal.value.valor_meta) || 0
  return total > 0 ? (totalDistributed.value / total) * 100 : 0
})

// Add these new methods
const onLeaderChange = async () => {
  if (!currentGoal.value.usuario_id) {
    teamMembers.value = []
    return
  }
  
  try {
    // Fetch team members for the selected leader
    const leader = allUsers.value.find(u => u.id === currentGoal.value.usuario_id)
    if (leader) {
      // Get team members using supervisor relationship
      teamMembers.value = allUsers.value
        .filter(u => u.supervisor === leader.id && (u.role === 'vendedor' || u.role === 'representante'))
        .map(member => ({
          id: member.id,
          name: member.name,
          email: member.email,
          goalAmount: 0,
          hasError: false,
          errorMessage: ''
        }))
    }
  } catch (error) {
    console.error('Erro ao buscar membros da equipe:', error)
    teamMembers.value = []
  }
}

const updateMemberGoal = (memberId, value) => {
  const member = teamMembers.value.find(m => m.id === memberId)
  if (member) {
    member.goalAmount = parseFloat(value) || 0
    member.hasError = false
    member.errorMessage = ''
    validateDistribution()
  }
}

const validateMemberGoal = (memberId) => {
  const member = teamMembers.value.find(m => m.id === memberId)
  if (member) {
    const value = parseFloat(member.goalAmount) || 0
    if (value < 0) {
      member.hasError = true
      member.errorMessage = 'Valor não pode ser negativo'
    } else if (isNaN(value)) {
      member.hasError = true
      member.errorMessage = 'Valor inválido'
    } else {
      member.hasError = false
      member.errorMessage = ''
    }
  }
}

const validateDistribution = () => {
  validationErrors.value = []
  
  // Check for negative values
  const negativeValues = teamMembers.value.filter(m => (parseFloat(m.goalAmount) || 0) < 0)
  if (negativeValues.length > 0) {
    validationErrors.value.push('Alguns valores são negativos')
  }
  
  // Check for invalid values
  const invalidValues = teamMembers.value.filter(m => isNaN(parseFloat(m.goalAmount)))
  if (invalidValues.length > 0) {
    validationErrors.value.push('Alguns valores são inválidos')
  }
  
  // Check total distribution
  const totalGoal = parseFloat(currentGoal.value.valor_meta) || 0
  if (totalDistributed.value > totalGoal) {
    validationErrors.value.push('Total distribuído excede a meta total')
  }
}

const distributeEqually = () => {
  const totalGoal = parseFloat(currentGoal.value.valor_meta) || 0
  const memberCount = teamMembers.value.length
  
  if (memberCount > 0 && totalGoal > 0) {
    const equalAmount = Math.floor((totalGoal / memberCount) * 100) / 100
    const remainder = parseFloat((totalGoal - (equalAmount * memberCount)).toFixed(2))
    
    teamMembers.value.forEach((member, index) => {
      member.goalAmount = index === 0 ? equalAmount + remainder : equalAmount
      member.hasError = false
      member.errorMessage = ''
    })
    
    validateDistribution()
  }
}

const clearAllGoals = () => {
  teamMembers.value.forEach(member => {
    member.goalAmount = 0
    member.hasError = false
    member.errorMessage = ''
  })
  validateDistribution()
}

const autoAdjustRemainder = () => {
  const remaining = remainingAmount.value
  if (remaining !== 0 && teamMembers.value.length > 0) {
    // Add remainder to the first member with a goal > 0, or first member if all are 0
    let targetMember = teamMembers.value.find(m => (parseFloat(m.goalAmount) || 0) > 0)
    if (!targetMember) {
      targetMember = teamMembers.value[0]
    }
    
    if (targetMember) {
      targetMember.goalAmount = parseFloat(targetMember.goalAmount || 0) + remaining
      validateDistribution()
    }
  }
}

// Update the saveGoal method to handle manual distribution
const saveGoal = async () => {
  try {
    validateDistribution()
    
    if (validationErrors.value.length > 0) {
      alert('Por favor, corrija os erros de validação antes de salvar.')
      return
    }
    
    if (modal.type === 'team') {
      // Check if total matches
      const totalGoal = parseFloat(currentGoal.value.valor_meta) || 0
      if (Math.abs(totalDistributed.value - totalGoal) > 0.01) {
        const confirmMessage = `A soma das metas individuais (${formatCurrency(totalDistributed.value)}) não corresponde à meta total (${formatCurrency(totalGoal)}). Deseja continuar mesmo assim?`
        if (!confirm(confirmMessage)) {
          return
        }
      }
      
      // Prepare goal data with manual distribution
      const goalDataWithDistribution = {
        ...currentGoal.value,
        manualDistribution: teamMembers.value.map(member => ({
          usuario_id: member.id,
          valor_meta: parseFloat(member.goalAmount) || 0
        }))
      }
      
      await goalsService.saveGoal('general', goalDataWithDistribution)
    } else {
      await goalsService.saveGoal('individual', currentGoal.value)
    }
    
    showModal.value = false
    fetchGoals()
  } catch (error) {
    console.error("Erro ao salvar meta:", error)
    const errorMessage = error.response?.data?.message || "Falha ao salvar a meta."
    alert(errorMessage)
  }
}

const formatDate = (dateString) => {
  if (!dateString) return ""
  return new Date(dateString).toLocaleDateString("pt-BR", { timeZone: "UTC" })
}

const formatCurrency = (value) => {
  if (typeof value !== 'number' && typeof value !== 'string') return 'R$ 0,00';
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return 'R$ 0,00';
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numValue)
}

const fetchGoals = async () => {
  loading.value = true
  errorMessage.value = ""
  try {
    const response = await goalsService.getGoals()
    goals.value.generalGoals = response.data.generalGoals || []
    goals.value.individualGoals = response.data.individualGoals || []
  } catch (error) {
    console.error("Erro ao buscar metas:", error)
    errorMessage.value =
    error.response?.data?.message || "Falha ao carregar metas."
  } finally {
    loading.value = false
  }
}

const fetchAllData = async () => {
  try {
    const usersResponse = await userService.getUsers()
    allUsers.value = usersResponse.data
    teamLeaders.value = allUsers.value.filter(u => u.role === "supervisor" || u.role === "parceiro")
    fetchGoals()
  } catch (error) {
    console.error("Erro ao buscar dados:", error)
  }
}

onMounted(fetchAllData)
</script>
