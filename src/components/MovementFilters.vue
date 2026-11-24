<template>
  <!-- 异动筛选区。props 提供月份、地点和部门选项；v-model 同步筛选值，reset 事件请求重置；使用 PanelCard 的 logo 和 title slots。 -->
  <PanelCard class="filter-panel">
    <template #logo><span class="filter-symbol">☷</span></template>
    <template #title><strong>筛选条件</strong></template>

    <div class="filter-controls">
      <label class="filter-field">
        <span>开始月份</span>
        <select v-model="start">
          <option v-for="month in months" :key="month" :value="month">{{ formatMonth(month) }}</option>
        </select>
      </label>
      <span class="filter-dash">—</span>
      <label class="filter-field">
        <span>结束月份</span>
        <select v-model="end">
          <option v-for="month in months" :key="month" :value="month">{{ formatMonth(month) }}</option>
        </select>
      </label>
      <label class="filter-field">
        <span>办公地点</span>
        <select v-model="location">
          <option v-for="option in locations" :key="option">{{ option }}</option>
        </select>
      </label>
      <label class="filter-field department-select">
        <span>所属部门</span>
        <select v-model="department">
          <option v-for="option in departments" :key="option">{{ option }}</option>
        </select>
      </label>
      <button class="reset-button" @click="emit('reset')">↻ <span>重置</span></button>
    </div>
  </PanelCard>
</template>

<script setup lang="ts">
import PanelCard from './PanelCard.vue'
import { formatMonth } from '../movement-statistics'

defineProps<{
  months: readonly string[]
  locations: readonly string[]
  departments: readonly string[]
}>()

const start = defineModel<string>('start', { required: true })
const end = defineModel<string>('end', { required: true })
const location = defineModel<string>('location', { required: true })
const department = defineModel<string>('department', { required: true })
const emit = defineEmits<{ reset: [] }>()
</script>

<style scoped>
.filter-panel {
  padding: 20px 24px 21px;
  margin-bottom: 28px;
  border-radius: 12px;
}

.filter-symbol {
  color: #5e7cb5;
  font-size: 18px;
}

.filter-controls {
  display: flex;
  align-items: flex-end;
  gap: 13px;
}

.filter-field {
  display: grid;
  min-width: 150px;
  gap: 7px;
}

.filter-field > span {
  color: #8793a5;
  font-size: 12px;
}

.filter-field select {
  border: 1px solid #e7ebf1;
  background: #fff;
  color: #46546b;
  outline: none;
  height: 40px;
  min-width: 150px;
  padding: 0 30px 0 12px;
  font-size: 12px;
  border-radius: 7px;
}

.filter-field select:focus {
  border-color: #92b0fb;
  box-shadow: 0 0 0 3px #eef3ff;
}

.department-select {
  flex: 1;
  min-width: 190px;
}

.department-select select {
  width: 100%;
}

.filter-dash {
  color: #acb5c2;
  font-size: 14px;
  padding-bottom: 12px;
  margin: 0 -7px;
}

.reset-button {
  border: 0;
  background: none;
  color: #78859a;
  height: 40px;
  font-size: 12px;
  padding: 0 9px;
}

.reset-button:hover {
  color: var(--blue);
}

.reset-button:focus-visible {
  outline: 2px solid #8badff;
  outline-offset: 2px;
}

@media (max-width: 1050px) {
  .filter-controls {
    flex-wrap: wrap;
  }
}

@media (max-width: 760px) {
  .filter-panel {
    padding: 14px;
  }

  .filter-controls {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .filter-field {
    min-width: 0;
  }

  .filter-field select {
    width: 100%;
    min-width: 0;
    height: 38px;
  }

  .department-select {
    grid-column: span 2;
  }

  .filter-dash {
    display: none;
  }

  .reset-button {
    justify-self: start;
  }
}
</style>
