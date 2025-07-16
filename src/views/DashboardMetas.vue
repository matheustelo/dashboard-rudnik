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
          <div class="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-blue-500 bg-blue-100">
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Carregando metas...
          </div>
        </div>
        <div v-else-if="error" class="text-center py-10">
          <div class="bg-red-50 border border-red-200 rounded-md p-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-red-800">Erro ao carregar dados</h3>
                <div class="mt-2 text-sm text-red-700">
                  <p>{{ error }}</p>
                </div>
                <div class="mt-4">
                  <button
                    @click="fetchAllData"
                    class="bg-red-100 px-2 py-1 text-xs font-medium text-red-800 rounded hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    Tentar novamente
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else>
          <!-- Team Goals Tab -->
          <div v-if="activeTab === 'team'">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl font-semibold">Metas por Equipe</h2>
              <button @click="openGoalModal('team')" class="bg-blue-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                + Nova Meta de Equipe
              </button>
            </div>
            <div class="bg-white shadow overflow-hidden sm:rounded-lg">
              <ul role="list" class="divide-y divide-gray-200">
                <li v-for="goal in goals.generalGoals" :key="goal.id" class="px-4 py-4 sm:px-6">
                  <div class="flex items-center justify-between">
                    <div class="flex-1">
                      <p class="text-sm font-medium text-indigo-600 truncate">
                        {{ goal.supervisor_name }} ({{ goal.supervisor_role }}) - Meta de {{ goal.tipo_meta }}
                      </p>
                      <div class="mt-1 text-xs text-gray-500">
                        <span v-if="goal.team_members_count > 0" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          {{ goal.team_members_count }} membro(s) na equipe
                        </span>
                        <span v-else class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          Sem membros na equipe
                        </span>
                      </div>
                    </div>
                    <div class="ml-2 flex-shrink-0 flex space-x-4">
                      <button @click="viewGoalDetails(goal)" class="text-sm font-medium text-blue-500 hover:text-blue-700">Ver Detalhes</button>
                      <button @click="deleteGoal('general', goal.id)" class="text-sm font-medium text-red-500 hover:text-red-700">Excluir</button>
                    </div>
                  </div>
                  <div class="mt-2 sm:flex sm:justify-between">
                    <div class="sm:flex">
                      <p class="flex items-center text-sm text-gray-500">
                        Valor Total: {{ formatCurrency(goal.valor_meta) }}
                      </p>
                      <p class="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                        Período: {{ formatDate(goal.data_inicio) }} a {{ formatDate(goal.data_fim) }}
                      </p>
                    </div>
                  </div>
                </li>
                <li v-if="!goals.generalGoals.length" class="px-4 py-4 sm:px-6 text-center text-gray-500">
                  <div class="text-center">
                    <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    <h3 class="mt-2 text-sm font-medium text-gray-900">Nenhuma meta de equipe</h3>
                    <p class="mt-1 text-sm text-gray-500">Comece criando uma nova meta de equipe.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <!-- Individual Goals Tab -->
          <div v-if="activeTab === 'individual'">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl font-semibold">Metas Individuais</h2>
              <button @click="openGoalModal('individual')" class="bg-blue-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                + Nova Meta Individual
              </button>
            </div>
            <div class="bg-white shadow overflow-hidden sm:rounded-lg">
              <ul role="list" class="divide-y divide-gray-200">
                <li v-for="goal in goals.individualGoals" :key="goal.id" class="px-4 py-4 sm:px-6">
                  <div class="flex items-center justify-between">
                    <div class="flex-1">
                      <p class="text-sm font-medium text-indigo-600 truncate">
                        {{ goal.user_name }} ({{ goal.user_role }}) - Meta de {{ goal.tipo_meta }}
                      </p>
                      <div class="mt-1 text-xs text-gray-500" v-if="goal.supervisors && goal.supervisors.length > 0">
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          Supervisores: {{ goal.supervisors.length }}
                        </span>
                      </div>
                    </div>
                    <div class="ml-2 flex-shrink-0 flex space-x-4">
                      <button @click="openGoalModal('individual', goal)" class="text-sm font-medium text-gray-500 hover:text-gray-700">Editar</button>
                      <button @click="deleteGoal('individual', goal.id)" class="text-sm font-medium text-red-500 hover:text-red-700">Excluir</button>
                    </div>
                  </div>
                  <div class="mt-2 sm:flex sm:justify-between">
                    <div class="sm:flex">
                      <p class="flex items-center text-sm text-gray-500">
                        Valor: {{ formatCurrency(goal.valor_meta) }}
                      </p>
                      <p class="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                        Período: {{ formatDate(goal.data_inicio) }} a {{ formatDate(goal.data_fim) }}
                      </p>
                    </div>
                  </div>
                </li>
                <li v-if="!goals.individualGoals.length" class="px-4 py-4 sm:px-6 text-center text-gray-500">
                  <div class="text-center">
                    <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <h3 class="mt-2 text-sm font-medium text-gray-900">Nenhuma meta individual</h3>
                    <p class="mt-1 text-sm text-gray-500">Comece criando uma nova meta individual.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Goal Modal -->
      <div v-if="showModal" class="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
        <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" @click="closeModal"></div>
          <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
          <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
            <form @submit.prevent="saveGoal">
              <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">{{ modal.title }}</h3>
                <div class="mt-4 space-y-4">
                  <div v-if="modal.type === 'team'">
                    <label for="leader" class="block text-sm font-medium text-gray-700">Líder de Equipe</label>
                    <select 
                      id="leader" 
                      v-model="currentGoal.usuario_id" 
                      @change="onLeaderChange" 
                      required 
                      class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                      <option disabled value="">Selecione um líder</option>
                      <option v-for="leader in teamLeaders" :key="leader.id" :value="leader.id">
                        {{ leader.name }} ({{ leader.role }}) 
                        <span v-if="leader.has_team">- {{ leader.team_members_count }} membro(s)</span>
                        <span v-else>- Sem equipe</span>
                      </option>
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
                            <div class="text-xs text-gray-500">{{ member.email }} ({{ member.role }})</div>
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
                          class="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          Distribuir Igualmente
                        </button>
                        <button
                          type="button"
                          @click="clearAllGoals"
                          class="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                        >
                          Limpar Tudo
                        </button>
                        <button
                          type="button"
                          @click="autoAdjustRemainder"
                          v-if="remainingAmount !== 0"
                          class="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-500"
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
                      <div class="flex">
                        <div class="flex-shrink-0">
                          <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                          </svg>
                        </div>
                        <div class="ml-3">
                          <h3 class="text-sm font-medium text-red-800">Atenção</h3>
                          <div class="mt-2 text-sm text-red-700">
                            <p>Este líder não possui vendedores, representantes, representantes premium ou prepostos na equipe. A meta não pode ser distribuída manualmente.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div v-else-if="currentGoal.usuario_id && loadingTeamMembers" class="mt-2 text-sm text-blue-600 bg-blue-50 p-3 rounded-md border border-blue-200">
                      <div class="flex items-center">
                        <svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Carregando membros da equipe...
                      </div>
                    </div>
                  </div>

                  <div v-if="modal.type === 'individual'">
                    <label for="user" class="block text-sm font-medium text-gray-700">Vendedor/Representante</label>
                    <select 
                      id="user" 
                      v-model="currentGoal.usuario_id" 
                      required 
                      class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                      <option disabled value="">Selecione um usuário</option>
                      <option v-for="user in individualUsers" :key="user.id" :value="user.id">
                        {{ user.name }} ({{ user.role }})
                        <span v-if="user.direct_supervisor_name"> - Supervisor: {{ user.direct_supervisor_name }}</span>
                      </option>
                    </select>
                  </div>

                  <div>
                    <label for="goal-type" class="block text-sm font-medium text-gray-700">Tipo de Meta</label>
                    <select 
                      id="goal-type" 
                      v-model="currentGoal.tipo_meta" 
                      required 
                      class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                      <option value="faturamento">Faturamento (R$)</option>
                      <option value="propostas">Propostas (Quantidade)</option>
                    </select>
                  </div>

                  <div>
                    <label for="value" class="block text-sm font-medium text-gray-700">Valor da Meta</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      id="value" 
                      v-model="currentGoal.valor_meta" 
                      required 
                      class="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      @input="validateDistribution"
                    >
                  </div>

                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label for="start-date" class="block text-sm font-medium text-gray-700">Data de Início</label>
                      <input 
                        type="date" 
                        id="start-date" 
                        v-model="currentGoal.data_inicio" 
                        required 
                        class="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      >
                    </div>
                    <div>
                      <label for="end-date" class="block text-sm font-medium text-gray-700">Data de Fim</label>
                      <input 
                        type="date" 
                        id="end-date" 
                        v-model="currentGoal.data_fim" 
                        required 
                        class="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      >
                    </div>
                  </div>
                </div>
              </div>
              <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button 
                  type="submit" 
                  :disabled="saving"
                  class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg v-if="saving" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {{ saving ? 'Salvando...' : 'Salvar' }}
                </button>
                <button 
                  @click="closeModal" 
                  type="button" 
                  class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Goal Details Modal -->
      <div v-if="showDetailsModal" class="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="details-modal-title" role="dialog" aria-modal="true">
        <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" @click="showDetailsModal = false"></div>
          <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
          <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
            <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <h3 class="text-lg leading-6 font-medium text-gray-900" id="details-modal-title">Detalhes da Meta</h3>
              <div v-if="selectedGoal" class="mt-4">
                <dl class="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                  <div>
                    <dt class="text-sm font-medium text-gray-500">Líder</dt>
                    <dd class="mt-1 text-sm text-gray-900">{{ selectedGoal.supervisor_name }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500">Tipo</dt>
                    <dd class="mt-1 text-sm text-gray-900">{{ selectedGoal.tipo_meta }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500">Valor Total</dt>
                    <dd class="mt-1 text-sm text-gray-900">{{ formatCurrency(selectedGoal.valor_meta) }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500">Membros da Equipe</dt>
                    <dd class="mt-1 text-sm text-gray-900">{{ selectedGoal.team_members_count || 0 }}</dd>
                  </div>
                  <div class="sm:col-span-2">
                    <dt class="text-sm font-medium text-gray-500">Período</dt>
                    <dd class="mt-1 text-sm text-gray-900">{{ formatDate(selectedGoal.data_inicio) }} a {{ formatDate(selectedGoal.data_fim) }}</dd>
                  </div>
                </dl>
                
                <div v-if="selectedGoal.team_members && selectedGoal.team_members.length > 0" class="mt-6">
                  <h4 class="text-sm font-medium text-gray-900 mb-3">Membros da Equipe</h4>
                  <div class="bg-gray-50 rounded-lg p-3">
                    <ul class="space-y-2">
                      <li v-for="member in selectedGoal.team_members" :key="member.id" class="flex justify-between items-center text-sm">
                        <span>{{ member.name }} ({{ member.role }})</span>
                        <span class="text-gray-500">{{ member.email }}</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div v-if="selectedGoal.child_goals && selectedGoal.child_goals.length > 0" class="mt-6">
                  <h4 class="text-sm font-medium text-gray-900 mb-3">Metas Individuais Distribuídas</h4>
                  <div class="bg-gray-50 rounded-lg p-3">
                    <ul class="space-y-2">
                      <li v-for="cg in selectedGoal.child_goals" :key="cg.id" class="flex justify-between items-center text-sm">
                        <span>{{ cg.user_name }} - {{ cg.tipo_meta }}</span>
                        <span class="text-gray-500">{{ formatCurrency(cg.valor_meta) }}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button 
                @click="showDetailsModal = false" 
                type="button" 
                class="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 sm:w-auto sm:text-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed, watch } from "vue"
import { goalsService, userService, teamLeaderService } from "../services/api"

// Initialize all reactive variables with proper default values
const loading = ref(true)
const error = ref(null)
const saving = ref(false)
const loadingTeamMembers = ref(false)
const activeTab = ref("team")
const goals = ref({ 
  generalGoals: [], 
  individualGoals: [] 
})
const allUsers = ref([]) // Initialize as empty array
const teamLeaders = ref([]) // Initialize as empty array
const showModal = ref(false)
const showDetailsModal = ref(false)
const selectedGoal = ref(null)
const modal = reactive({ title: "", type: "" })
const currentGoal = ref({})
const teamMembers = ref([]) // Initialize as empty array
const validationErrors = ref([]) // Initialize as empty array

// Computed properties with proper null checks
const individualUsers = computed(() => {
  // Ensure allUsers.value is an array before filtering
  if (!Array.isArray(allUsers.value)) {
    console.warn('allUsers.value is not an array:', allUsers.value)
    return []
  }
  return allUsers.value.filter((u) =>
    u.role === "vendedor" ||
    u.role === "representante" ||
    u.role === "representante_premium" ||
    u.role === "preposto"
  )
})

const totalDistributed = computed(() => {
  // Ensure teamMembers.value is an array before reducing
  if (!Array.isArray(teamMembers.value)) {
    console.warn('teamMembers.value is not an array:', teamMembers.value)
    return 0
  }
  return teamMembers.value.reduce((sum, member) => sum + (parseFloat(member.goalAmount) || 0), 0)
})

const remainingAmount = computed(() => {
  return (parseFloat(currentGoal.value.valor_meta) || 0) - totalDistributed.value
})

const distributionProgress = computed(() => {
  const total = parseFloat(currentGoal.value.valor_meta) || 0
  return total > 0 ? (totalDistributed.value / total) * 100 : 0
})

// Watch for changes in allUsers to update teamLeaders
watch(allUsers, (newUsers) => {
  if (Array.isArray(newUsers)) {
    teamLeaders.value = newUsers.filter(u => 
      (u.role === "supervisor" || u.role === "parceiro_comercial" || u.role === "gerente_comercial") &&
      u.is_active
    )
  }
}, { immediate: true })

// Enhanced data fetching functions with proper error handling
const fetchAllData = async () => {
  console.log('🔄 Starting fetchAllData with hierarchy support...')
  loading.value = true
  error.value = null
  
  try {
    await Promise.all([
      fetchGoals(),
      fetchUsers(),
      fetchTeamLeaders(),
    ])
    console.log('✅ All data fetched successfully with hierarchy support')
  } catch (err) {
    console.error('❌ Error in fetchAllData:', err)
    error.value = err.response?.data?.message || err.message || 'Erro ao carregar dados'
  } finally {
    loading.value = false
  }
}

const fetchGoals = async () => {
  console.log('🔄 Fetching goals with hierarchy support...')
  try {
    const { data } = await goalsService.getGoals()
    console.log('✅ Goals fetched with hierarchy:', data)
    
    // Ensure the response has the expected structure
    goals.value = {
      generalGoals: Array.isArray(data.generalGoals) ? data.generalGoals : [],
      individualGoals: Array.isArray(data.individualGoals) ? data.individualGoals : []
    }
  } catch (err) {
    console.error('❌ Error fetching goals:', err)
    goals.value = { generalGoals: [], individualGoals: [] }
    throw err
  }
}

const fetchUsers = async () => {
  console.log('🔄 Fetching users with hierarchy support...')
  try {
    const { data } = await userService.getUsers()
    console.log('✅ Users fetched with hierarchy:', data)
    
    // Ensure data is an array
    if (Array.isArray(data)) {
      allUsers.value = data
    } else {
      console.warn('⚠️ Users data is not an array:', data)
      allUsers.value = []
    }
  } catch (err) {
    console.error('❌ Error fetching users:', err)
    allUsers.value = []
    throw err
  }
}

const fetchTeamLeaders = async () => {
  console.log('🔄 Fetching team leaders with hierarchy support...')
  try {
    const { data } = await teamLeaderService.getTeamLeaders()
    console.log('✅ Team leaders fetched with hierarchy:', data)
    
    // Ensure data is an array
    if (Array.isArray(data)) {
      teamLeaders.value = data
    } else {
      console.warn('⚠️ Team leaders data is not an array:', data)
      teamLeaders.value = []
    }
  } catch (err) {
    console.error('❌ Error fetching team leaders:', err)
    teamLeaders.value = []
    throw err
  }
}

const onLeaderChange = async () => {
  console.log('🔄 Leader changed with hierarchy support:', currentGoal.value.usuario_id)
  
  if (!currentGoal.value.usuario_id) {
    teamMembers.value = []
    return
  }
  
  loadingTeamMembers.value = true
  
  try {
    // Use the new API endpoint to get team members
    const { data } = await userService.getUserTeam(currentGoal.value.usuario_id)
    console.log('👥 Team members fetched from API:', data)
    
    // Filter allowed roles for distribution
    const filteredMembers = Array.isArray(data) ? data.filter(member =>
      member.role === 'vendedor' ||
      member.role === 'representante' ||
      member.role === 'representante_premium' ||
      member.role === 'preposto'
    ) : []
    
    teamMembers.value = filteredMembers.map(member => ({
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      goalAmount: 0,
      hasError: false,
      errorMessage: ''
    }))
    
    console.log('✅ Team members processed:', teamMembers.value.length)
    
  } catch (err) {
    console.error('❌ Error in onLeaderChange:', err)
    teamMembers.value = []
    error.value = 'Erro ao carregar membros da equipe: ' + (err.response?.data?.message || err.message)
  } finally {
    loadingTeamMembers.value = false
  }
}

const updateMemberGoal = (memberId, value) => {
  console.log('🔄 Updating member goal:', memberId, value)
  
  if (!Array.isArray(teamMembers.value)) {
    console.error('❌ teamMembers.value is not an array:', teamMembers.value)
    return
  }
  
  const member = teamMembers.value.find(m => m.id === memberId)
  if (member) {
    member.goalAmount = parseFloat(value) || 0
    member.hasError = false
    member.errorMessage = ''
    validateDistribution()
  }
}

const validateMemberGoal = (memberId) => {
  if (!Array.isArray(teamMembers.value)) {
    console.error('❌ teamMembers.value is not an array:', teamMembers.value)
    return
  }
  
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
  if (!Array.isArray(validationErrors.value)) {
    validationErrors.value = []
  }
  
  if (!Array.isArray(teamMembers.value)) {
    console.error('❌ teamMembers.value is not an array:', teamMembers.value)
    return
  }
  
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
  if (!Array.isArray(teamMembers.value)) {
    console.error('❌ teamMembers.value is not an array:', teamMembers.value)
    return
  }
  
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
  if (!Array.isArray(teamMembers.value)) {
    console.error('❌ teamMembers.value is not an array:', teamMembers.value)
    return
  }
  
  teamMembers.value.forEach(member => {
    member.goalAmount = 0
    member.hasError = false
    member.errorMessage = ''
  })
  validateDistribution()
}

const autoAdjustRemainder = () => {
  if (!Array.isArray(teamMembers.value)) {
    console.error('❌ teamMembers.value is not an array:', teamMembers.value)
    return
  }
  
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

const openGoalModal = (type, goal = null) => {
  console.log('🔄 Opening goal modal with hierarchy support:', type, goal)
  
  modal.type = type
  if (goal) {
    modal.title = `Editar Meta ${type === "individual" ? "Individual" : "de Equipe"}`
    currentGoal.value = { 
      ...goal,
      data_inicio: goal.data_inicio.split('T')[0],
      data_fim: goal.data_fim.split('T')[0]
    }
  } else {
    modal.title = `Nova Meta ${type === "individual" ? "Individual" : "de Equipe"}`
    currentGoal.value = { tipo_meta: "faturamento", usuario_id: "" }
  }
  
  // Reset team members when opening modal
  teamMembers.value = []
  validationErrors.value = []
  
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  teamMembers.value = []
  validationErrors.value = []
  currentGoal.value = {}
}

const viewGoalDetails = (goal) => {
  selectedGoal.value = goal
  showDetailsModal.value = true
}

const saveGoal = async () => {
  console.log('🔄 Saving goal with hierarchy support...')
  
  saving.value = true
  
  try {
    validateDistribution()
    
    if (!Array.isArray(validationErrors.value)) {
      validationErrors.value = []
    }
    
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
        manualDistribution: Array.isArray(teamMembers.value) ? teamMembers.value.map(member => ({
          usuario_id: member.id,
          valor_meta: parseFloat(member.goalAmount) || 0
        })) : []
      }
      
      await goalsService.saveGoal('general', goalDataWithDistribution)
    } else {
      await goalsService.saveGoal('individual', currentGoal.value)
    }
    
    closeModal()
    await fetchGoals()
    console.log('✅ Goal saved successfully with hierarchy support')
  } catch (err) {
    console.error("❌ Error saving goal:", err)
    const errorMessage = err.response?.data?.message || "Falha ao salvar a meta."
    alert(errorMessage)
  } finally {
    saving.value = false
  }
}

const deleteGoal = async (type, id) => {
  const confirmMessage = type === 'general' 
    ? "Tem certeza que deseja excluir esta meta de equipe? Todas as metas individuais distribuídas também serão excluídas."
    : "Tem certeza que deseja excluir esta meta individual?"
  
  if (confirm(confirmMessage)) {
    try {
      await goalsService.deleteGoal(type, id)
      await fetchGoals()
      console.log('✅ Goal deleted successfully')
    } catch (err) {
      console.error("❌ Error deleting goal:", err)
      alert("Falha ao excluir a meta.")
    }
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

// Initialize data on component mount
onMounted(() => {
  console.log('🚀 Component mounted, fetching data with hierarchy support...')
  fetchAllData()
})
</script>
