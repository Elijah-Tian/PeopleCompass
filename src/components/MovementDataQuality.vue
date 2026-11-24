<template>
  <!-- 数据质量说明面板。props 为异动记录数、月份和调动统计；close 事件通知父组件关闭面板。 -->
  <section class="quality-panel card">
    <div class="card-heading">
      <div>
        <h2>数据质量与口径</h2>
        <p>来源：每月人员异动表202610.xlsx · 入转离 / 调动</p>
      </div>
      <button class="close-button" aria-label="关闭" @click="emit('close')">×</button>
    </div>
    <div class="quality-grid">
      <div><span>入转离记录</span><strong>{{ activityCount }} 条</strong></div>
      <div><span>调动记录</span><strong>{{ transfers.total }} 条</strong></div>
      <div>
        <span>历史范围</span>
        <strong>{{ formatMonth(months[0]) }} 至 {{ formatMonth(months.at(-1) ?? '') }} · {{ months.length }} 个月</strong>
      </div>
      <div><span>部门间流动</span><strong>{{ transfers.departmentFlows }} 条</strong></div>
      <div><span>换签（单独统计）</span><strong>{{ transfers.swaps }} 条</strong></div>
      <div><span>名称和具体日期</span><strong>页面数据未保留</strong></div>
    </div>
    <p class="quality-rule">类别已去除首尾空格；仅月份、类别向下填充。部门流动排除换签、已离职及原部门与现部门相同的记录。异动数量按事件记录统计，不代表去重员工人数。地点筛选无法作用于未包含地点字段的调动工作表。</p>
  </section>
</template>

<script setup lang="ts">
import type { TransferStats } from '../data/movement-data'
import { formatMonth } from '../movement-statistics'

defineProps<{
  activityCount: number
  months: readonly string[]
  transfers: TransferStats
}>()

const emit = defineEmits<{ close: [] }>()
</script>

<style scoped>
.card-heading h2 {
  margin: 0;
  color: #29384e;
  font-size: 17px;
  letter-spacing: -.2px;
}

.card-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.card-heading p {
  color: #97a1b0;
  margin: 6px 0 0;
  font-size: 12px;
}

.quality-panel {
  padding: 20px 23px;
  margin-bottom: 26px;
}

.close-button {
  border: 0;
  background: none;
  color: #8792a3;
  font-size: 22px;
}

.quality-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 11px;
  margin-top: 18px;
}

.quality-grid > div {
  border: 1px solid #eff1f5;
  border-radius: 6px;
  padding: 12px;
}

.quality-grid span {
  display: block;
  color: #929dad;
  font-size: 11px;
}

.quality-grid strong {
  display: block;
  color: #465671;
  font-weight: 600;
  font-size: 13px;
  margin-top: 6px;
}

.quality-rule {
  line-height: 1.8;
  color: #8793a3;
  margin: 15px 0 0;
  font-size: 11px;
}

@media (max-width: 760px) {
  .quality-panel {
    padding-inline: 13px;
  }

  .quality-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
