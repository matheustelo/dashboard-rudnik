<template>
  <div class="min-h-screen bg-gray-100">
    <!-- Header -->
    <header class="bg-white shadow-sm">
      <div class="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <h1 class="text-2xl font-bold text-gray-900">Gerenciamento de Metas</h1>
        <router-link :to="dashboardPath"   class="text-sm text-blue-600 hover:underline">
          &larr; Voltar ao Dashboard
        </router-link>
      </div>
    </header>

    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div class="bg-white shadow rounded-lg p-4 mb-6 flex items-center space-x-4">
        <label class="text-sm font-medium text-gray-700">Mês:</label>
        <select v-model="selectedPeriod" @change="handlePeriodChange"
          class="border border-gray-300 rounded-md px-3 py-2 text-sm">
          <option v-for="p in periods" :key="p" :value="p">{{ formatPeriodLabel(p) }}</option>
          <option value="">Período Personalizado</option>
        </select>
        <input type="date" v-model="customStart" @change="handleCustomDateChange"
          class="border border-gray-300 rounded-md px-2 py-1" />
        <span class="text-gray-500">até</span>
        <input type="date" v-model="customEnd" @change="handleCustomDateChange"
          class="border border-gray-300 rounded-md px-2 py-1" />
      </div>

      <!-- Tabs -->
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex space-x-8" aria-label="Tabs">
          <button @click="activeTab = 'team'" :class="[
            activeTab === 'team'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm',
          ]">
            Metas por Equipe (Supervisores/Parceiros/Rep. Premium)
          </button>
          <button @click="activeTab = 'individual'" :class="[
            activeTab === 'individual'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm',
          ]">
            Metas Individuais (Vendedores/Representantes/Prepostos)
          </button>
        </nav>
      </div>

      <!-- Content -->
      <div class="mt-6">
       <div v-if="loading" class="space-y-6">
          <div class="flex justify-between items-center mb-4 animate-pulse">
            <div class="h-6 bg-gray-200 rounded w-1/3"></div>
            <div class="h-8 bg-gray-200 rounded w-32"></div>
          </div>
          <GoalListSkeleton />
        </div>

        <div v-else-if="error" class="text-center py-10">
          <div class="bg-red-50 border border-red-200 rounded-md p-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
                  fill="currentColor">
                  <path fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-red-800">Erro ao carregar dados</h3>
                <div class="mt-2 text-sm text-red-700">
                  <p>{{ error }}</p>
                </div>
                <div class="mt-4">
                  <button @click="fetchAllData"
                    class="bg-red-100 px-2 py-1 text-xs font-medium text-red-800 rounded hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500">
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
              <button @click="openGoalModal('team')"
                class="bg-blue-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                + Nova Meta de Equipe
              </button>
            </div>

            <div class="bg-white shadow overflow-hidden sm:rounded-lg">
              <ul role="list" class="divide-y divide-gray-200">
                <li v-for="goal in goals.generalGoals" :key="goal.id" class="px-4 py-4 sm:px-6">
                  <div class="flex items-center justify-between">
                    <div class="flex-1">
                      <p class="text-sm font-medium text-indigo-600 truncate">
                        {{ goal.supervisor_name }}
                        <span :class="getSupervisorRoleBadgeClass(goal.supervisor_role)"
                          class="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium">
                          {{ getSupervisorRoleLabel(goal.supervisor_role) }}
                        </span>
                        - Meta de {{ goal.tipo_meta }}
                      </p>
                      <div class="mt-1 text-xs text-gray-500 space-x-2">
                        <span v-if="goal.team_members_count > 0"
                          class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          {{ goal.team_members_count }} membro(s) na equipe
                        </span>
                        <span v-else
                          class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          Sem membros na equipe
                        </span>
                        <!-- Show hierarchy info for representante_premium -->
                        <span v-if="goal.supervisor_role === 'representante_premium' && hasPrepostos(goal)"
                          class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          Inclui {{ getPrepostosCount(goal) }} preposto(s)
                        </span>
                        <!-- Show distributed goals summary -->
                        <span v-if="goal.child_goals && goal.child_goals.length > 0"
                          class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {{ goal.child_goals.length }} metas distribuídas
                        </span>
                      </div>
                    </div>
                    <div class="ml-2 flex-shrink-0 flex space-x-4">
                      <button @click="viewGoalDetails(goal)"
                        class="text-sm font-medium text-blue-500 hover:text-blue-700">Ver Detalhes</button>
                      <button @click="deleteGoal('general', goal.id)"
                        class="text-sm font-medium text-red-500 hover:text-red-700">Excluir</button>
                    </div>
                  </div>
                  <div class="mt-2 sm:flex sm:justify-between">
                    <div class="sm:flex">
                      <p class="flex items-center text-sm text-gray-500">
                        {{ goal.tipo_meta === 'faturamento'
                          ? 'Valor Total'
                          : goal.tipo_meta === 'taxa_conversao'
                            ? 'Percentual Total'
                            : 'Quantidade Total' }}:
                        {{ formatGoalValue(goal.valor_meta, goal.tipo_meta) }}
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
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
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
              <button @click="openGoalModal('individual')"
                class="bg-blue-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                + Nova Meta Individual
              </button>
            </div>

            <div class="bg-white shadow overflow-hidden sm:rounded-lg">
              <ul role="list" class="divide-y divide-gray-200">
                <template v-for="(items, sup) in individualGoalsBySupervisor" :key="sup">
                  <li class="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">{{ sup }}</li>
                  <li v-for="goal in items" :key="goal.id" class="px-4 py-4 sm:px-6">
                    <div class="flex items-center justify-between">
                      <div class="flex-1">
                        <p class="text-sm font-medium text-indigo-600 truncate">
                          {{ goal.user_name }}
                          <span :class="getUserRoleBadgeClass(goal.user_role)"
                            class="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium">
                            {{ getUserRoleLabel(goal.user_role) }}
                          </span>
                          - Meta de {{ goal.tipo_meta }}
                        </p>
                        <div class="mt-1 text-xs text-gray-500" v-if="goal.supervisors && goal.supervisors.length > 0">
                          <span
                            class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            Supervisores: {{ goal.supervisors.length }}
                          </span>
                        </div>
                      </div>
                      <div class="ml-2 flex-shrink-0 flex space-x-4">
                        <div class="text-right">
                          <div class="text-sm font-medium text-gray-900">{{ formatGoalValue(goal.valor_meta, goal.tipo_meta) }}</div>
                          <div class="text-xs text-gray-500">{{ goal.tipo_meta }}</div>
                        </div>
                        <button @click="openGoalModal('individual', goal)"
                          class="text-sm font-medium text-gray-500 hover:text-gray-700">Editar</button>
                        <button @click="deleteGoal('individual', goal.id)"
                          class="text-sm font-medium text-red-500 hover:text-red-700">Excluir</button>
                      </div>
                    </div>
                    <div class="mt-2 sm:flex sm:justify-between">
                      <div class="sm:flex">
                        <p class="flex items-center text-sm text-gray-500">
                          Período: {{ formatDate(goal.data_inicio) }} a {{ formatDate(goal.data_fim) }}
                        </p>
                      </div>
                    </div>
                  </li>
                </template>
                <li v-if="!goals.individualGoals.length" class="px-4 py-4 sm:px-6 text-center text-gray-500">
                  <div class="text-center">
                    <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
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

      <!-- Summary by Month -->
      <div class="mt-10">
        <h2 class="text-xl font-semibold mb-4">Resumo de Metas por Mês</h2>
        <div v-if="Object.keys(groupedGeneralGoals).length === 0" class="text-center text-gray-500">
          Nenhuma meta encontrada para o período selecionado
        </div>
        <div v-for="(items, month) in groupedGeneralGoals" :key="month" class="mb-6">
          <h3 class="text-md font-medium text-gray-800 mb-2">{{ formatPeriodLabel(month) }}</h3>
          <ul class="bg-white shadow overflow-hidden sm:rounded-lg divide-y divide-gray-200">
            <li v-for="goal in items" :key="goal.id" class="px-4 py-4 sm:px-6 flex justify-between items-center">
              <div>
                <p class="text-sm font-medium text-indigo-600">{{ goal.supervisor_name }} - {{ goal.tipo_meta }}</p>
                <p class="text-xs text-gray-500">{{ goal.tipo_meta === 'faturamento'
                  ? 'Valor'
                  : goal.tipo_meta === 'taxa_conversao'
                    ? 'Percentual'
                    : 'Quantidade' }}: {{ formatGoalValue(goal.valor_meta, goal.tipo_meta) }}</p>
              </div>
              <div class="space-x-4">
                <button @click="deleteGoal('general', goal.id)"
                  class="text-sm font-medium text-red-500 hover:text-red-700">Excluir</button>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <!-- Goal Modal -->
      <div v-if="showModal" class="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog"
        aria-modal="true">
        <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"
            @click="closeModal">
          </div>
          <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
          <div
            class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
            <form @submit.prevent="saveGoal">
              <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">{{ modal.title }}</h3>
                <div class="mt-4 space-y-4">
                  <div v-if="modal.type === 'team'">
                    <label for="leader" class="block text-sm font-medium text-gray-700">Líder de Equipe</label>
                    <select id="leader" v-model="currentGoal.usuario_id" @change="onLeaderChange" required
                      class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                      <option disabled value="">Selecione um líder</option>
                      <option v-for="leader in teamLeaders" :key="leader.id" :value="leader.id">
                        {{ leader.name }}
                        <span :class="getSupervisorRoleBadgeClass(leader.role)" class="ml-1">
                          ({{ getSupervisorRoleLabel(leader.role) }})
                        </span>
                        <span v-if="leader.has_team">- {{ leader.team_members_count }} membro(s)</span>
                      </option>
                    </select>

                    <!-- Manual Goal Distribution Interface -->
                    <div v-if="currentGoal.usuario_id && teamMembers.length > 0"
                      class="mt-4 p-4 bg-gray-50 rounded-lg border">
                      <h4 class="text-sm font-medium text-gray-900 mb-3">Distribuição Manual de Metas</h4>

                      <!-- Summary Section (hidden for conversion rate goals) -->
                      <div v-if="currentGoal.tipo_meta !== 'taxa_conversao'" class="mb-4 p-3 bg-white rounded border">
                        <div class="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span class="text-gray-600">Meta Total:</span>
                            <div class="font-semibold text-lg">{{ formatCurrency(currentGoal.valor_meta || 0) }}</div>
                          </div>
                          <div>
                            <span class="text-gray-600">Total Distribuído:</span>
                            <div class="font-semibold text-lg"
                              :class="totalDistributed > (currentGoal.valor_meta || 0) ? 'text-red-600' : 'text-green-600'">
                              {{ formatCurrency(totalDistributed) }}
                            </div>
                          </div>
                          <div>
                            <span class="text-gray-600">Restante:</span>
                            <div class="font-semibold text-lg"
                              :class="remainingAmount < 0 ? 'text-red-600' : 'text-blue-600'">
                              {{ formatCurrency(remainingAmount) }}
                            </div>
                          </div>
                        </div>

                        <!-- Progress Bar -->
                        <div class="mt-2">
                          <div class="w-full bg-gray-200 rounded-full h-2">
                            <div class="h-2 rounded-full transition-all duration-300"
                              :class="distributionProgress > 100 ? 'bg-red-500' : distributionProgress === 100 ? 'bg-green-500' : 'bg-blue-500'"
                              :style="{ width: Math.min(distributionProgress, 100) + '%' }"></div>
                          </div>
                          <div class="text-xs text-gray-500 mt-1">{{ distributionProgress.toFixed(1) }}% distribuído
                          </div>
                        </div>
                      </div>

                      <!-- Team Members Goal Assignment (Enhanced for representante_premium hierarchy) -->
                      <div class="space-y-2 max-h-80 overflow-y-auto">
                        <div v-for="member in sortedTeamMembers" :key="member.id"
                          class="flex items-center justify-between p-3 bg-white rounded border"
                          :class="getHierarchyClasses(member)">
                          <div class="flex-1 min-w-0">
                            <div class="font-medium text-sm text-gray-900 flex items-center">
                              <!-- Hierarchy indicator -->
                              <span v-if="member.isSubordinate" class="text-gray-400 mr-2 flex-shrink-0">└─</span>
                              <span class="truncate">{{ member.name }}</span>
                              <span :class="getUserRoleBadgeClass(member.role)"
                                class="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0">
                                {{ getUserRoleLabel(member.role) }}
                              </span>
                              <!-- Show parent info for prepostos -->
                              <span v-if="member.role === 'preposto' && member.parentName"
                                class="ml-2 text-xs text-gray-500 flex-shrink-0">
                                (sob {{ member.parentName }})
                              </span>
                            </div>
                            <div class="text-xs text-gray-500 truncate">{{ member.email }}</div>
                          </div>
                          <div class="flex items-center space-x-3 flex-shrink-0">
                            <!-- Current Goal Display -->
                            <div v-if="member.currentGoalValue" class="text-right">
                              <div class="text-xs text-gray-500">Meta Atual:</div>
                              <div class="text-sm font-medium text-blue-600">{{ formatCurrency(member.currentGoalValue)
                                }}
                              </div>
                            </div>
                            <!-- Goal Input -->
                            <div class="flex items-center space-x-2">
                              <span class="text-sm text-gray-600 flex-shrink-0">
                                {{ currentGoal.tipo_meta === 'taxa_conversao' ? 'Taxa de Conversão (%)' : 'Nova Meta:' }}
                              </span>
                              <div class="relative">
                                <input
                                  type="number"
                                  step="0.01"
                                  :min="currentGoal.tipo_meta === 'taxa_conversao' ? 0 : 0"
                                  :max="currentGoal.tipo_meta === 'taxa_conversao' ? 100 : null"
                                  :placeholder="currentGoal.tipo_meta === 'taxa_conversao' ? '0-100 (%)' : ''"
                                  :value="member.goalAmount || 0"
                                  @input="updateMemberGoal(member.id, $event.target.value)"
                                  @blur="validateMemberGoal(member.id)"
                                  class="w-28 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                  :class="member.hasError ? 'border-red-500 bg-red-50' : ''" />
                                <div v-if="member.hasError"
                                  class="absolute -bottom-5 left-0 text-xs text-red-600 whitespace-nowrap">
                                  {{ member.errorMessage }}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <!-- Quick Actions -->
                      <div class="mt-4 flex flex-wrap gap-2">
                        <button type="button" @click="distributeEqually"
                          class="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
                          Distribuir Igualmente
                        </button>
                        <button v-if="currentGoal.tipo_meta !== 'taxa_conversao'" type="button" @click="distributeByPerformance"
                          class="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500">
                          Por Performance
                        </button>
                        <button v-if="currentGoal.tipo_meta !== 'taxa_conversao'" type="button" @click="clearAllGoals"
                          class="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500">
                          Limpar Tudo
                        </button>
                        <button v-if="currentGoal.tipo_meta !== 'taxa_conversao' && remainingAmount !== 0" type="button" @click="autoAdjustRemainder"
                          class="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-500">
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

                    <div v-else-if="currentGoal.usuario_id && teamMembers.length === 0"
                      class="mt-2 text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
                      <div class="flex">
                        <div class="flex-shrink-0">
                          <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
                            fill="currentColor">
                            <path fill-rule="evenodd"
                              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                              clip-rule="evenodd" />
                          </svg>
                        </div>
                        <div class="ml-3">
                          <h3 class="text-sm font-medium text-red-800">Atenção</h3>
                          <div class="mt-2 text-sm text-red-700">
                            <p>Este líder não possui vendedores, representantes ou prepostos na equipe. A meta não pode
                              ser
                              distribuída manualmente.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div v-else-if="currentGoal.usuario_id && loadingTeamMembers"
                      class="mt-2 text-sm text-blue-600 bg-blue-50 p-3 rounded-md border border-blue-200">
                      <div class="flex items-center">
                        <svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg"
                          fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4">
                          </circle>
                          <path class="opacity-75" fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                          </path>
                        </svg>
                        Carregando membros da equipe...
                      </div>
                    </div>
                  </div>

                  <div v-if="modal.type === 'individual'">
                    <label for="user"
                      class="block text-sm font-medium text-gray-700">Vendedor/Representante/Preposto</label>
                    <select id="user" v-model="currentGoal.usuario_id" required
                      class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                      <option disabled value="">Selecione um usuário</option>
                      <option v-for="user in individualUsers" :key="user.id" :value="user.id">
                        {{ user.name }}
                        <span :class="getUserRoleBadgeClass(user.role)" class="ml-1">
                          ({{ getUserRoleLabel(user.role) }})
                        </span>
                        <span v-if="user.direct_supervisor_name"> - Supervisor: {{ user.direct_supervisor_name }}</span>
                      </option>
                    </select>
                    <div class="mt-4">
                      <label for="supervisor-select" class="block text-sm font-medium text-gray-700">Supervisor</label>
                      <select
                        id="supervisor-select"
                        v-model="currentGoal.supervisor_id"
                        required
                        class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                      >
                        <option disabled value="">Selecione um supervisor</option>
                        <option v-for="leader in teamLeaders" :key="leader.id" :value="leader.id">
                          {{ leader.name }}
                          <span :class="getSupervisorRoleBadgeClass(leader.role)" class="ml-1">
                            ({{ getSupervisorRoleLabel(leader.role) }})
                          </span>
                        </option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label for="goal-type" class="block text-sm font-medium text-gray-700">Tipo de Meta</label>
                    <select id="goal-type" v-model="currentGoal.tipo_meta" required
                      class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                      <option value="faturamento">Faturamento (R$)</option>
                      <option value="propostas">Propostas (Quantidade)</option>
                      <option value="vendas">Vendas (Quantidade)</option>
                      <option value="taxa_conversao">Taxa de Conversão (%)</option>
                    </select>
                  </div>

                  <div>
                    <label for="value" class="block text-sm font-medium text-gray-700">
                      {{ currentGoal.tipo_meta === 'taxa_conversao' ? 'Taxa de Conversão (%)' : 'Valor da Meta' }}
                    </label>
                    <input
                      type="number"
                      id="value"
                      v-model="currentGoal.valor_meta"
                      :step="currentGoal.tipo_meta === 'taxa_conversao' ? 0.01 : 0.01"
                      :min="currentGoal.tipo_meta === 'taxa_conversao' ? 0 : null"
                      :max="currentGoal.tipo_meta === 'taxa_conversao' ? 100 : null"
                       :placeholder="currentGoal.tipo_meta === 'taxa_conversao' ? '0-100 (%)' : ''"
                      required
                      class="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      @input="validateDistribution"
                      @blur="validateGoalValue"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700" for="period-type">Tipo de Período</label>
                    <select id="period-type" v-model="currentGoal.periodType"
                      class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
                      <option value="month">Mensal</option>
                      <option value="custom">Personalizado</option>
                    </select>
                  </div>

                  <div v-if="currentGoal.periodType === 'month'">
                    <label for="month" class="block text-sm font-medium text-gray-700">Mês da Meta</label>
                    <input type="month" id="month" v-model="currentGoal.target_month"
                      class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
                  </div>

                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label for="start-date" class="block text-sm font-medium text-gray-700">Data de Início</label>
                      <input type="date" id="start-date" v-model="currentGoal.data_inicio"
                        :disabled="currentGoal.periodType === 'month'" required
                        class="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md">
                    </div>
                    <div>
                      <label for="end-date" class="block text-sm font-medium text-gray-700">Data de Fim</label>
                      <input type="date" id="end-date" v-model="currentGoal.data_fim" required
                        class="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md">
                    </div>
                  </div>
                  <p v-if="currentGoal.data_inicio && currentGoal.data_fim" class="text-xs text-gray-500">
                    Período selecionado: {{ formatDate(currentGoal.data_inicio) }} a {{ formatDate(currentGoal.data_fim)
                    }}
                  </p>
                </div>
              </div>
              <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button type="submit" :disabled="saving"
                  class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                  <svg v-if="saving" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                    </path>
                  </svg>
                  {{ saving ? 'Salvando...' : 'Salvar' }}
                </button>
                <button @click="closeModal" type="button"
                  class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Goal Details Modal -->
      <div v-if="showDetailsModal" class="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="details-modal-title"
        role="dialog" aria-modal="true">
        <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"
            @click="showDetailsModal = false"></div>
          <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
          <div
            class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
            <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <h3 class="text-lg leading-6 font-medium text-gray-900" id="details-modal-title">Detalhes da Meta</h3>
              <div v-if="selectedGoal" class="mt-4">
                <dl class="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                  <div>
                    <dt class="text-sm font-medium text-gray-500">Líder</dt>
                    <dd class="mt-1 text-sm text-gray-900 flex items-center">
                      {{ selectedGoal.supervisor_name }}
                      <span :class="getSupervisorRoleBadgeClass(selectedGoal.supervisor_role)"
                        class="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium">
                        {{ getSupervisorRoleLabel(selectedGoal.supervisor_role) }}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500">Tipo</dt>
                    <dd class="mt-1 text-sm text-gray-900">{{ selectedGoal.tipo_meta }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500">
                      {{ selectedGoal.tipo_meta === 'faturamento'
                        ? 'Valor Total'
                        : selectedGoal.tipo_meta === 'taxa_conversao'
                          ? 'Percentual Total'
                          : 'Quantidade Total' }}
                    </dt>
                    <dd class="mt-1 text-sm text-gray-900">
                      {{ formatGoalValue(selectedGoal.valor_meta, selectedGoal.tipo_meta) }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500">Membros da Equipe</dt>
                    <dd class="mt-1 text-sm text-gray-900">{{ selectedGoal.team_members_count || 0 }}</dd>
                  </div>
                  <div class="sm:col-span-2">
                    <dt class="text-sm font-medium text-gray-500">Período</dt>
                    <dd class="mt-1 text-sm text-gray-900">{{ formatDate(selectedGoal.data_inicio) }} a {{
                      formatDate(selectedGoal.data_fim) }}</dd>
                  </div>
                </dl>

                <div v-if="selectedGoal.team_members && selectedGoal.team_members.length > 0" class="mt-6">
                  <h4 class="text-sm font-medium text-gray-900 mb-3">Estrutura Hierárquica de Metas da Equipe</h4>
                  <div class="bg-gray-50 rounded-lg p-4 border">
                    <!-- Team Leader Goal -->
                    <div class="mb-4 p-3 bg-white rounded-lg border-2 border-indigo-200">
                      <div class="flex justify-between items-center">
                        <div class="flex items-center">
                          <div class="w-2 h-2 bg-indigo-500 rounded-full mr-3"></div>
                          <div>
                            <div class="font-semibold text-indigo-900">{{ selectedGoal.supervisor_name }}</div>
                            <div class="flex items-center mt-1">
                              <span :class="getSupervisorRoleBadgeClass(selectedGoal.supervisor_role)"
                                class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium">
                                {{ getSupervisorRoleLabel(selectedGoal.supervisor_role) }}
                              </span>
                              <span class="ml-2 text-xs text-gray-500">Líder da Equipe</span>
                            </div>
                          </div>
                        </div>
                        <div class="text-right">
                          <div class="text-lg font-bold text-indigo-600">
                            {{ formatGoalValue(selectedGoal.valor_meta, selectedGoal.tipo_meta) }}
                          </div>
                          <div class="text-xs text-gray-500">Meta Total</div>
                        </div>
                      </div>
                    </div>

                    <!-- Team Members Hierarchical Structure -->
                    <div class="space-y-2">
                      <div v-for="member in getEnhancedHierarchicalTeamMembers(selectedGoal)" :key="member.id"
                        class="p-3 rounded-lg border" :class="getEnhancedDetailHierarchyClasses(member)">
                        <div class="flex justify-between items-center">
                          <div class="flex items-center flex-1 min-w-0">
                            <!-- Hierarchy connector -->
                            <div class="flex items-center mr-3">
                              <div v-if="member.isSubordinate" class="flex flex-col items-center">
                                <div class="w-px h-4 bg-gray-300"></div>
                                <div class="w-4 h-px bg-gray-300"></div>
                              </div>
                              <div v-else class="w-2 h-2 rounded-full" :class="getRoleIndicatorClass(member.role)">
                              </div>
                            </div>

                            <div class="flex-1 min-w-0">
                              <div class="flex items-center">
                                <span class="font-medium text-sm truncate">{{ member.name }}</span>
                                <span :class="getUserRoleBadgeClass(member.role)"
                                  class="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0">
                                  {{ getUserRoleLabel(member.role) }}
                                </span>
                              </div>
                              <div class="text-xs text-gray-500 truncate mt-1">
                                {{ member.email }}
                                <span v-if="member.role === 'preposto' && member.parentName" class="ml-2">
                                  • Subordinado a {{ member.parentName }}
                                </span>
                              </div>
                            </div>
                          </div>

                          <!-- Goal Value Display -->
                          <div class="flex items-center space-x-4 flex-shrink-0">
                            <div class="text-right">
                              <div class="text-sm font-bold" :class="getGoalValueColorClass(member.role)">
                                {{ formatGoalValue(getMemberGoalValue(member, selectedGoal), selectedGoal.tipo_meta) }}
                              </div>
                              <div class="text-xs text-gray-500">{{ selectedGoal.tipo_meta }}</div>
                            </div>
                            <!-- Performance indicator if available -->
                            <div v-if="member.performance" class="text-right">
                              <div class="text-xs text-gray-600">Atual:</div>
                              <div class="text-xs font-medium" :class="getPerformanceClass(member, selectedGoal)">
                                {{ formatGoalValue(getMemberCurrentValue(member, selectedGoal.tipo_meta),
                                selectedGoal.tipo_meta) }}
                              </div>
                            </div>
                          </div>
                        </div>

                        <!-- Goal Progress Bar -->
                        <div v-if="getMemberGoalValue(member, selectedGoal) > 0" class="mt-2">
                          <div class="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Progresso da Meta</span>
                            <span>{{ getMemberGoalProgress(member, selectedGoal) }}%</span>
                          </div>
                          <div class="w-full bg-gray-200 rounded-full h-1.5">
                            <div class="h-1.5 rounded-full transition-all duration-300"
                              :class="getProgressBarClass(member, selectedGoal)"
                              :style="{ width: Math.min(getMemberGoalProgress(member, selectedGoal), 100) + '%' }">
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Enhanced Summary Section -->
                    <div class="mt-4 pt-4 border-t border-gray-200">
                      <div class="grid grid-cols-2 gap-4 text-sm">
                        <div v-if="selectedGoal.supervisor_role === 'representante_premium'"
                          class="text-center p-2 bg-purple-50 rounded border">
                          <div class="font-semibold text-lg text-purple-600">
                            {{ formatGoalValue(getRepresentantePremiumGoalTotal(selectedGoal.child_goals,
                              selectedGoal.tipo_meta), selectedGoal.tipo_meta) }}
                          </div>
                          <div class="text-xs text-gray-500">Rep. Premium</div>
                        </div>
                        <div v-if="selectedGoal.supervisor_role === 'representante_premium'"
                          class="text-center p-2 bg-yellow-50 rounded border">
                          <div class="font-semibold text-lg text-yellow-600">
                            {{ formatGoalValue(getPrepostosGoalTotal(selectedGoal.child_goals, selectedGoal.tipo_meta),
                            selectedGoal.tipo_meta) }}
                          </div>
                          <div class="text-xs text-gray-500">Prepostos</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button @click="showDetailsModal = false" type="button"
                class="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 sm:w-auto sm:text-sm">
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
import { goalsService, userService, teamLeaderService, performanceService } from "../services/api"
import { useAuthStore } from "../stores/auth"
import GoalListSkeleton from "../components/GoalListSkeleton.vue"

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
const periods = ref([])
const selectedPeriod = ref("")
const authStore = useAuthStore()
const customStart = ref("")
const customEnd = ref("")

const dashboardPath = computed(() => {
  const role = authStore.user?.role
  return `/dashboard/${role}` 
})

const handlePeriodChange = async () => {
  customStart.value = ''
  customEnd.value = ''
  loading.value = true
  try {
    await fetchGoals()
  } finally {
    loading.value = false
  }
}


const handleCustomDateChange = async () => {
  selectedPeriod.value = ''
  if (customStart.value && customEnd.value) {
    loading.value = true
    try {
      await fetchGoals()
    } finally {
      loading.value = false
    }
  }
}

watch(
  () => [currentGoal.value.target_month, currentGoal.value.periodType],
  ([newMonth, type]) => {
    if (type === 'month' && newMonth) {
      const [y, m] = newMonth.split('-')
      currentGoal.value.data_inicio = `${newMonth}-01`
      const end = new Date(y, Number(m), 0)
      currentGoal.value.data_fim = end.toISOString().split('T')[0]
    } else if (type === 'month' && !newMonth) {
      currentGoal.value.data_inicio = ''
      currentGoal.value.data_fim = ''
    }
  }
)

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
  if (currentGoal.value.tipo_meta === 'taxa_conversao') return 0
  return (parseFloat(currentGoal.value.valor_meta) || 0) - totalDistributed.value
})

const distributionProgress = computed(() => {
  if (currentGoal.value.tipo_meta === 'taxa_conversao') return 0
  const total = parseFloat(currentGoal.value.valor_meta) || 0
  return total > 0 ? (totalDistributed.value / total) * 100 : 0
})


const groupedGeneralGoals = computed(() => {
  if (!Array.isArray(goals.value.generalGoals)) return {}
  return goals.value.generalGoals.reduce((acc, g) => {
    const month = g.data_inicio?.slice(0, 7) || 'unknown'
    if (!acc[month]) acc[month] = []
    acc[month].push(g)
    return acc
  }, {})
})

// Map of all users for quick lookup by ID
const allUsersMap = computed(() => {
  const map = new Map()
  if (Array.isArray(allUsers.value)) {
    allUsers.value.forEach(u => map.set(u.id, u))
  }
  return map
})

// Enhanced computed property for hierarchical sorting
const sortedTeamMembers = computed(() => {
  if (!Array.isArray(teamMembers.value)) {
    return []
  }

  const byName = (x, y) => x.name.localeCompare(y.name)

  const individualGoalsBySupervisor = computed(() => {
  if (!Array.isArray(goals.value.individualGoals)) return {}
  return goals.value.individualGoals.reduce((acc, g) => {
    const key = g.supervisor_name || 'Sem Supervisor'
    if (!acc[key]) acc[key] = []
    acc[key].push(g)
    return acc
  }, {})
})

  const reps = teamMembers.value
    .filter((m) => m.role === 'representante_premium')
    .sort(byName)
  const direct = teamMembers.value
    .filter((m) => !m.isSubordinate && m.role !== 'representante_premium')
    .sort(byName)
  const prepostos = teamMembers.value
    .filter((m) => m.isSubordinate)
    .sort(byName)

  const sorted = []
  reps.forEach((rep) => {
    sorted.push(rep)
    sorted.push(...prepostos.filter((p) => p.parent_id === rep.id))
  })

  sorted.push(...direct)
  sorted.push(...prepostos.filter((p) => !reps.some((r) => r.id === p.parent_id)))
  return sorted
})

// Watch for changes in allUsers to update teamLeaders
watch(allUsers, (newUsers) => {
  if (Array.isArray(newUsers)) {
    teamLeaders.value = newUsers.filter(u =>
      (
        u.role === "supervisor" ||
        u.role === "parceiro_comercial"
      ) && u.is_active
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
      loadPeriods(),
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
    const periodParam = selectedPeriod.value || undefined
    const start = selectedPeriod.value ? undefined : customStart.value || undefined
    const end = selectedPeriod.value ? undefined : customEnd.value || undefined
    const { data } = await goalsService.getGoals(periodParam, start, end)
    console.log('✅ Goals fetched with hierarchy:', data)

    // Normalize goal IDs in case the backend returns `_id`
    const normalizeGoals = (goalArray) =>
      Array.isArray(goalArray)
        ? goalArray.map((g) => ({
          id: g.id ?? g._id,
          ...g,
        }))
        : []

    goals.value = {
      generalGoals: normalizeGoals(data.generalGoals),
      individualGoals: normalizeGoals(data.individualGoals),
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
      teamLeaders.value = data.filter(u =>
        u.role === "supervisor" || u.role === "parceiro_comercial"
      )
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

    // Enhanced processing to handle representante_premium hierarchy
    const processedMembers = []
    const representantePremiumMap = new Map()

    // First pass to map representante_premium members
    filteredMembers.forEach((member) => {
      if (member.role === 'representante_premium') {
        representantePremiumMap.set(member.id, member)
      }
    })

    // Build processed list including prepostos with parent info
    filteredMembers.forEach((member) => {
      const isSubordinate = member.role === 'preposto'
      let parentName = null

      if (isSubordinate) {
        parentName =
          member.parent_name ||
          representantePremiumMap.get(member.parent_id)?.name ||
          'Representante Premium'
      }
      processedMembers.push({
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
        goalAmount: 0,
        hasError: false,
        errorMessage: '',
        isSubordinate,
        parentName,
        parent_id: isSubordinate ? member.parent_id : undefined,
        currentGoalValue: getCurrentGoalValue(member.id),
      })
    })

    teamMembers.value = processedMembers
    console.log('✅ Team members processed with hierarchy:', teamMembers.value.length)

  } catch (err) {
    console.error('❌ Error in onLeaderChange:', err)
    teamMembers.value = []
    error.value = 'Erro ao carregar membros da equipe: ' + (err.response?.data?.message || err.message)
  } finally {
    loadingTeamMembers.value = false
  }
}

const getCurrentGoalValue = (userId) => {
  // Find current individual goal for this user
  const userIdNum = Number(userId)
  const existingGoal = goals.value.individualGoals.find(goal =>
    Number(goal.usuario_id) === userIdNum &&
    goal.tipo_meta === currentGoal.value.tipo_meta
  )
  return existingGoal ? parseFloat(existingGoal.valor_meta) : 0
}

const updateMemberGoal = (memberId, value) => {
  console.log('🔄 Updating member goal:', memberId, value)

  if (!Array.isArray(teamMembers.value)) {
    console.error('❌ teamMembers.value is not an array:', teamMembers.value)
    return
  }

  const member = teamMembers.value.find(m => m.id === memberId)
  if (member) {
    let num = parseFloat(value) || 0
    if (currentGoal.value.tipo_meta === 'taxa_conversao') {
      if (num > 100) num = 100
      if (num < 0) num = 0
    }
    member.goalAmount = num
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
    } else if (currentGoal.value.tipo_meta === 'taxa_conversao' && value > 100) {
      member.hasError = true
      member.errorMessage = 'Valor não pode exceder 100%'
    } else if (isNaN(value)) {
      member.hasError = true
      member.errorMessage = 'Valor inválido'
    } else {
      member.hasError = false
      member.errorMessage = ''
    }
  }
}

const validateGoalValue = () => {
  if (currentGoal.value.tipo_meta === 'taxa_conversao') {
    let val = parseFloat(currentGoal.value.valor_meta)
    if (isNaN(val)) val = 0
    if (val > 100) val = 100
    if (val < 0) val = 0
    currentGoal.value.valor_meta = val
  }
  validateDistribution()
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

  if (currentGoal.value.tipo_meta === 'taxa_conversao') {
    const outOfRange = teamMembers.value.filter(m => {
      const v = parseFloat(m.goalAmount) || 0
      return v < 0 || v > 100
    })
    if (outOfRange.length > 0) {
      validationErrors.value.push('Valores devem estar entre 0 e 100%')
    }
  } else {
    // Check total distribution
    const totalGoal = parseFloat(currentGoal.value.valor_meta) || 0
    if (totalDistributed.value > totalGoal) {
      validationErrors.value.push('Total distribuído excede a meta total')
    }
  }
}

const distributeEqually = () => {
  if (!Array.isArray(teamMembers.value)) {
    console.error('❌ teamMembers.value is not an array:', teamMembers.value)
    return
  }

  const totalGoal = parseFloat(currentGoal.value.valor_meta) || 0
  const memberCount = teamMembers.value.length

  if (memberCount > 0) {
    if (currentGoal.value.tipo_meta === 'taxa_conversao') {
      teamMembers.value.forEach(member => {
        member.goalAmount = totalGoal
        member.hasError = false
        member.errorMessage = ''
      })
    } else if (totalGoal > 0) {
      const equalAmount = Math.floor((totalGoal / memberCount) * 100) / 100
      const remainder = parseFloat((totalGoal - (equalAmount * memberCount)).toFixed(2))

      teamMembers.value.forEach((member, index) => {
        member.goalAmount = index === 0 ? equalAmount + remainder : equalAmount
        member.hasError = false
        member.errorMessage = ''
      })
    }

    validateDistribution()
  }
}

const distributeByPerformance = async () => {
  if (!Array.isArray(teamMembers.value) || !currentGoal.value.usuario_id) {
    return
  }
  try {
    const { data } = await performanceService.getTeamPerformance({ supervisorId: currentGoal.value.usuario_id })
    if (!data || !Array.isArray(data.teamMembers)) {
      distributeEqually()
      return
    }
    const totalGoal = parseFloat(currentGoal.value.valor_meta) || 0
    const performances = data.teamMembers.reduce((acc, m) => acc + (m.performance?.faturamentoTotal || 0), 0)
    if (performances === 0) {
      distributeEqually()
      return
    }
    teamMembers.value.forEach(member => {
      const perfMember = data.teamMembers.find(tm => tm.id === member.id)
      const weight = perfMember ? (perfMember.performance?.faturamentoTotal || 0) : 0
      member.goalAmount = parseFloat(((weight / performances) * totalGoal).toFixed(2))
      member.hasError = false
      member.errorMessage = ''
    })
    validateDistribution()
  } catch (err) {
    console.error('❌ Error distributing by performance:', err)
    alert('Falha ao obter dados de performance para distribuição.')
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
    const start = goal.data_inicio.split('T')[0]
    const end = goal.data_fim.split('T')[0]
    const startDate = new Date(start)
    const endDate = new Date(end)
    const lastOfMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0)
    const isMonthly =
      startDate.getDate() === 1 &&
      startDate.getMonth() === endDate.getMonth() &&
      startDate.getFullYear() === endDate.getFullYear() &&
      lastOfMonth.toISOString().split('T')[0] === end

    currentGoal.value = {
      ...goal,
      data_inicio: start,
      data_fim: end,
      target_month: isMonthly ? start.slice(0, 7) : '',
      periodType: isMonthly ? 'month' : 'custom',
      supervisor_id: goal.supervisor_id || ''
    }
  } else {
    modal.title = `Nova Meta ${type === "individual" ? "Individual" : "de Equipe"}`
    currentGoal.value = { tipo_meta: "faturamento", usuario_id: "", supervisor_id: "", target_month: selectedPeriod.value, periodType: 'month' }
    if (selectedPeriod.value) {
      const [y, m] = selectedPeriod.value.split('-')
      currentGoal.value.data_inicio = `${selectedPeriod.value}-01`
      const end = new Date(y, Number(m), 0)
      currentGoal.value.data_fim = end.toISOString().split('T')[0]
    } else {
      currentGoal.value.data_inicio = ''
      currentGoal.value.data_fim = ''
    }
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
    validateGoalValue()
    validateDistribution()

    if (!Array.isArray(validationErrors.value)) {
      validationErrors.value = []
    }

    if (validationErrors.value.length > 0) {
      alert('Por favor, corrija os erros de validação antes de salvar.')
      return
    }

        if (currentGoal.value.tipo_meta === 'taxa_conversao') {
      const value = parseFloat(currentGoal.value.valor_meta)
      if (isNaN(value) || value < 0 || value > 100) {
        alert('A taxa de conversão deve estar entre 0 e 100%.')
        return
      }
      if (modal.type === 'team') {
        const outOfRange = teamMembers.value.some(m => {
          const v = parseFloat(m.goalAmount) || 0
          return v < 0 || v > 100
        })
        if (outOfRange) {
          alert('As metas distribuídas devem estar entre 0 e 100%.')
          return
        }
      }
    }

    if (currentGoal.value.tipo_meta === 'taxa_conversao') {
      if (currentGoal.value.periodType === 'month') {
        const month = currentGoal.value.target_month
        if (month) {
          const [y, m] = month.split('-')
          currentGoal.value.data_inicio = `${month}-01`
          const end = new Date(y, Number(m), 0)
          currentGoal.value.data_fim = end.toISOString().split('T')[0]
        }
      } else {
        if (!currentGoal.value.data_inicio || !currentGoal.value.data_fim) {
          alert('Defina o período da meta.')
          return
        }
        if (new Date(currentGoal.value.data_inicio) > new Date(currentGoal.value.data_fim)) {
          alert('Data de fim deve ser posterior à data de início.')
          return
        }
      }

      await goalsService.saveGoal('general', currentGoal.value)
    } else if (modal.type === 'team') {
      // Check if total matches
      const totalGoal = parseFloat(currentGoal.value.valor_meta) || 0
      if (Math.abs(totalDistributed.value - totalGoal) > 0.01) {
        const confirmMessage = `A soma das metas individuais (${formatCurrency(totalDistributed.value)}) não corresponde à meta total (${formatCurrency(totalGoal)}). Deseja continuar mesmo assim?`
        if (!confirm(confirmMessage)) {
          return
        }
      }

      if (currentGoal.value.periodType === 'month') {
        const month = currentGoal.value.target_month
        if (month) {
          const [y, m] = month.split('-')
          currentGoal.value.data_inicio = `${month}-01`
          const end = new Date(y, Number(m), 0)
          currentGoal.value.data_fim = end.toISOString().split('T')[0]
        }
      } else {
        if (!currentGoal.value.data_inicio || !currentGoal.value.data_fim) {
          alert('Defina o período da meta.')
          return
        }
        if (new Date(currentGoal.value.data_inicio) > new Date(currentGoal.value.data_fim)) {
          alert('Data de fim deve ser posterior à data de início.')
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
      if (currentGoal.value.periodType === 'month') {
        const month = currentGoal.value.target_month
        if (month) {
          const [y, m] = month.split('-')
          currentGoal.value.data_inicio = `${month}-01`
          const end = new Date(y, Number(m), 0)
          currentGoal.value.data_fim = end.toISOString().split('T')[0]
        }
      } else {
        if (!currentGoal.value.data_inicio || !currentGoal.value.data_fim) {
          alert('Defina o período da meta.')
          return
        }
        if (new Date(currentGoal.value.data_inicio) > new Date(currentGoal.value.data_fim)) {
          alert('Data de fim deve ser posterior à data de início.')
          return
        }
      }
      await goalsService.saveGoal('individual', currentGoal.value)
    }

    closeModal()
    loading.value = true
    await fetchGoals()
    console.log('✅ Goal saved successfully with hierarchy support')
  } catch (err) {
    console.error("❌ Error saving goal:", err)
    const base = err.response?.data?.message || 'Falha ao salvar a meta.'
    const invalid = err.response?.data?.invalidUsers
    const msg = invalid && invalid.length
      ? `${base}\nUsuários inválidos: ${invalid.join(', ')}`
      : base
    alert(msg)
  } finally {
    loading.value = false
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
      loading.value = true
      await fetchGoals()
      console.log('✅ Goal deleted successfully')
    } catch (err) {
      console.error("❌ Error deleting goal:", err)
      alert("Falha ao excluir a meta.")
    } finally {
      loading.value = false
    }
  }
}

const loadPeriods = async () => {
  try {
    const response = await goalsService.getGoalPeriods(authStore.user.id)
    periods.value = response.data
    if (periods.value.length && !selectedPeriod.value) {
      selectedPeriod.value = periods.value[0]
    }
  } catch (error) {
    console.error('Erro ao carregar períodos de metas:', error)
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

const formatGoalValue = (value, type) => {
  if (type === 'faturamento') return formatCurrency(value)
  if (type === 'taxa_conversao') {
    const num = parseFloat(value) || 0
    return `${num.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
  }
  const num = parseFloat(value) || 0
  return num.toLocaleString('pt-BR')
}

const formatPeriodLabel = (p) => {
  const [y, m] = p.split('-')
  const date = new Date(y, Number(m) - 1, 1)
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

// Enhanced role handling functions for hierarchy support
const getSupervisorRoleBadgeClass = (role) => {
  const classes = {
    'supervisor': 'bg-blue-100 text-blue-800',
    'parceiro_comercial': 'bg-green-100 text-green-800',
    'gerente_comercial': 'bg-purple-100 text-purple-800',
    'representante_premium': 'bg-purple-100 text-purple-800'
  }
  return classes[role] || 'bg-gray-100 text-gray-800'
}

const getSupervisorRoleLabel = (role) => {
  const labels = {
    'supervisor': 'Supervisor',
    'parceiro_comercial': 'Parceiro Comercial',
    'gerente_comercial': 'Gerente Comercial',
    'representante_premium': 'Rep. Premium'
  }
  return labels[role] || role
}

const getUserRoleBadgeClass = (role) => {
  const classes = {
    'vendedor': 'bg-blue-100 text-blue-800',
    'representante': 'bg-green-100 text-green-800',
    'representante_premium': 'bg-purple-100 text-purple-800',
    'preposto': 'bg-yellow-100 text-yellow-800'
  }
  return classes[role] || 'bg-gray-100 text-gray-800'
}

const getUserRoleLabel = (role) => {
  const labels = {
    'vendedor': 'Vendedor',
    'representante': 'Representante',
    'representante_premium': 'Rep. Premium',
    'preposto': 'Preposto'
  }
  return labels[role] || role
}

// Enhanced hierarchy helper functions
const getHierarchyClasses = (member) => {
  if (member.role === 'representante_premium') {
    return 'border-purple-300 bg-purple-50'
  } else if (member.isSubordinate) {
    return 'border-yellow-300 bg-yellow-50 ml-4'
  }
  return ''
}

const hasPrepostos = (goal) => {
  if (!goal.team_members || !Array.isArray(goal.team_members)) return false
  return goal.team_members.some(member => member.role === 'preposto')
}

const getPrepostosCount = (goal) => {
  if (!goal.team_members || !Array.isArray(goal.team_members)) return 0
  return goal.team_members.filter(member => member.role === 'preposto').length
}

// Goal value display helper functions
const getTotalDistributedGoals = (childGoals, tipo) => {
  if (!Array.isArray(childGoals)) return 0
  return childGoals
    .filter(g => g.tipo_meta === tipo)
    .reduce((sum, goal) => sum + parseFloat(goal.valor_meta || 0), 0)
}

const getDistributionPercentage = (goal) => {
  const total = parseFloat(goal.valor_meta) || 0
  const distributed = getTotalDistributedGoals(goal.child_goals, goal.tipo_meta)
  return total > 0 ? ((distributed / total) * 100).toFixed(1) : '0.0'
}

const getDistributionStatusClass = (goal) => {
  const percentage = parseFloat(getDistributionPercentage(goal))
  if (percentage > 100) return 'text-red-600 font-medium'
  if (percentage === 100) return 'text-green-600 font-medium'
  if (percentage >= 80) return 'text-yellow-600 font-medium'
  return 'text-blue-600 font-medium'
}

const getMemberGoalValue = (member, selectedGoal) => {
  if (!selectedGoal.child_goals || !Array.isArray(selectedGoal.child_goals)) return 0
  const memberId = Number(member.id)

  const memberGoal = selectedGoal.child_goals.find(
    goal => Number(goal.usuario_id) === memberId && goal.tipo_meta === selectedGoal.tipo_meta,
  )
  return memberGoal ? parseFloat(memberGoal.valor_meta) : 0
}

const getMemberCurrentValue = (member, goalType) => {
  if (!member.performance) return 0
  if (goalType === 'propostas') return member.performance.totalPropostas || 0
  if (goalType === 'vendas') return member.performance.propostasConvertidas || 0
    if (goalType === 'taxa_conversao') {
    const total = member.performance.totalPropostas || 0
    const converted = member.performance.propostasConvertidas || 0
    return total > 0 ? (converted / total) * 100 : 0
  }
  return member.performance.faturamentoTotal || 0
}

const getDifferenceClass = (goal) => {
  const difference = goal.valor_meta - getTotalDistributedGoals(goal.child_goals, goal.tipo_meta)
  if (difference < 0) return 'text-red-600 font-medium'
  if (difference === 0) return 'text-green-600 font-medium'
  return 'text-blue-600 font-medium'
}

// Initialize data on component mount
onMounted(() => {
  console.log('🚀 Component mounted, fetching data with hierarchy support...')
  fetchAllData()
})

// Enhanced hierarchy helper functions for goal display
const getHierarchicalChildGoals = (childGoals) => {
  if (!Array.isArray(childGoals)) return []

  // Sort to show representante_premium first, then their prepostos
  const sorted = [...childGoals].sort((a, b) => {
    // representante_premium comes first
    if (a.user_role === 'representante_premium' && b.user_role !== 'representante_premium') return -1
    if (b.user_role === 'representante_premium' && a.user_role !== 'representante_premium') return 1

    // Then prepostos (marked as subordinates)
    if (a.user_role === 'preposto' && b.user_role !== 'preposto') return 1
    if (b.user_role === 'preposto' && a.user_role !== 'preposto') return -1

    // Within same category, sort by name
    return a.user_name.localeCompare(b.user_name)
  })

  // Mark prepostos as subordinates and find their parents
  return sorted.map(goal => {
    const isSubordinate = goal.user_role === 'preposto'
    let parentName = null

    if (isSubordinate) {
      // Find the representante_premium in the same goal set
      const parent = sorted.find(g => g.user_role === 'representante_premium')
      parentName = parent ? parent.user_name : 'Representante Premium'
    }

    return {
      ...goal,
      isSubordinate,
      parentName
    }
  })
}

const getGoalValueColorClass = (role) => {
  const classes = {
    'representante_premium': 'text-purple-600',
    'preposto': 'text-yellow-600',
    'representante': 'text-green-600',
    'vendedor': 'text-blue-600'
  }
  return classes[role] || 'text-gray-600'
}

const getRepresentantePremiumGoalTotal = (childGoals, tipo) => {
  if (!Array.isArray(childGoals)) return 0
  return childGoals
    .filter(goal => goal.user_role === 'representante_premium' && goal.tipo_meta === tipo)
    .reduce((sum, goal) => sum + parseFloat(goal.valor_meta || 0), 0)
}

const getPrepostosGoalTotal = (childGoals, tipo) => {
  if (!Array.isArray(childGoals)) return 0
  return childGoals
    .filter(goal => goal.user_role === 'preposto' && goal.tipo_meta === tipo)
    .reduce((sum, goal) => sum + parseFloat(goal.valor_meta || 0), 0)
}

const getEnhancedHierarchicalTeamMembers = (selectedGoal) => {
  if (!selectedGoal.team_members || !Array.isArray(selectedGoal.team_members)) return []

  // Combine team members with their goal values
  const membersWithGoals = selectedGoal.team_members.map(member => {
    const memberId = Number(member.id)
    const memberGoal = selectedGoal.child_goals?.find(
      goal => Number(goal.usuario_id) === memberId && goal.tipo_meta === selectedGoal.tipo_meta,
    )
    return {
      ...member,
      goalValue: memberGoal ? parseFloat(memberGoal.valor_meta) : 0,
      goalType: memberGoal ? memberGoal.tipo_meta : selectedGoal.tipo_meta
    }
  })

  // Sort to show hierarchy: representante_premium first, then their prepostos
  const sorted = membersWithGoals.sort((a, b) => {
    // representante_premium comes first
    if (a.role === 'representante_premium' && b.role !== 'representante_premium') return -1
    if (b.role === 'representante_premium' && a.role !== 'representante_premium') return 1

    // Then prepostos (marked as subordinates)
    if (a.role === 'preposto' && b.role !== 'preposto') return 1
    if (b.role === 'preposto' && a.role !== 'preposto') return -1

    // Within same category, sort by name
    return a.name.localeCompare(b.name)
  })

  // Mark prepostos as subordinates and find their parents
  return sorted.map(member => {
    const isSubordinate = member.role === 'preposto'
    let parentName = null

    if (isSubordinate) {
      // Find the representante_premium in the same team
      const parent = sorted.find(m => m.role === 'representante_premium')
      parentName = parent ? parent.name : 'Representante Premium'
    }

    return {
      ...member,
      isSubordinate,
      parentName
    }
  })
}

const getEnhancedDetailHierarchyClasses = (member) => {
  if (member.role === 'representante_premium') {
    return 'bg-purple-50 border-purple-200 border-2'
  } else if (member.isSubordinate) {
    return 'bg-yellow-50 border-yellow-200 border ml-6'
  }
  return 'bg-white border-gray-200 border'
}

const getRoleIndicatorClass = (role) => {
  const classes = {
    'representante_premium': 'bg-purple-500',
    'preposto': 'bg-yellow-500',
    'representante': 'bg-green-500',
    'vendedor': 'bg-blue-500'
  }
  return classes[role] || 'bg-gray-500'
}

const getMemberGoalProgress = (member, selectedGoal) => {
  const goalValue = getMemberGoalValue(member, selectedGoal)
  const currentValue = getMemberCurrentValue(member, selectedGoal.tipo_meta)
  return goalValue > 0 ? ((currentValue / goalValue) * 100).toFixed(1) : 0
}

const getProgressBarClass = (member, selectedGoal) => {
  const progress = parseFloat(getMemberGoalProgress(member, selectedGoal))
  if (progress >= 100) return 'bg-green-500'
  if (progress >= 80) return 'bg-yellow-500'
  if (progress >= 50) return 'bg-blue-500'
  return 'bg-red-500'
}

const getPerformanceClass = (member, selectedGoal) => {
  const goalValue = getMemberGoalValue(member, selectedGoal)
  const currentValue = getMemberCurrentValue(member, selectedGoal.tipo_meta)
  const progress = goalValue > 0 ? (currentValue / goalValue) * 100 : 0

  if (progress >= 100) return 'text-green-600'
  if (progress >= 80) return 'text-yellow-600'
  if (progress >= 50) return 'text-blue-600'
  return 'text-red-600'
}
</script>
