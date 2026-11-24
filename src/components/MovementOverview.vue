<template>
  <!-- 异动概览和分类指标卡。props 提供区间、总数、指标及选中类别；selectCategory 和 toggleQuality 事件传递用户操作。 -->
  <section class="movement-overview">
    <div class="section-heading">
      <div>
        <h2>异动概览</h2>
        <span class="section-subtitle">{{ rangeLabel }} · 共 <b>{{ total.toLocaleString() }}</b> 条异动事件</span>
      </div>
      <button class="text-button" @click="emit('toggleQuality')">查看数据质量 <span>›</span></button>
    </div>
    <div class="metric-grid">
      <button
        v-for="metric in metrics"
        :key="metric.name"
        class="metric-card card"
        :class="{ selected: selectedCategory === metric.name }"
        :style="{ '--metric-color': metric.color }"
        type="button"
        :aria-pressed="selectedCategory === metric.name"
        @click="emit('selectCategory', metric.name)"
      >
        <div class="metric-top">
          <span class="metric-label">{{ metric.name }}</span>
          <span class="metric-icon">{{ metric.icon }}</span>
        </div>
        <div class="metric-value">{{ metric.value.toLocaleString() }}<small>次</small></div>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  rangeLabel: string
  total: number
  metrics: readonly { name: string; value: number; color: string; icon: string }[]
  selectedCategory: string | null
}>()

const emit = defineEmits<{
  selectCategory: [category: string]
  toggleQuality: []
}>()
</script>

<style scoped>
.movement-overview {
  margin-bottom: 28px;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 15px;
}

.section-heading h2 {
  margin: 0;
  color: #29384e;
  font-size: 17px;
  letter-spacing: -.2px;
}

.section-subtitle {
  display: block;
  color: #939eae;
  font-size: 12px;
  margin-top: 6px;
}

.section-subtitle b {
  color: #586781;
  font-weight: 600;
}

.text-button {
  border: 0;
  background: none;
  color: #6785c6;
  font-size: 12px;
}

.text-button span {
  font-size: 16px;
  vertical-align: -1px;
  margin-left: 2px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.metric-card {
  position: relative;
  overflow: hidden;
  padding: 17px 20px 14px;
  border-radius: 12px;
  width: 100%;
  text-align: left;
  color: inherit;
  transition: border-color .16s, box-shadow .16s, background-color .16s;
  min-height: 92px;
}

.metric-card::before {
  content: "";
  position: absolute;
  border-radius: 50%;
  background: color-mix(in srgb, var(--metric-color) 7%, transparent);
  width: 78px;
  height: 78px;
  right: -26px;
  top: -26px;
}

.metric-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.metric-label {
  color: #728097;
  font-size: 13px;
}

.metric-icon {
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--metric-color) 10%, white);
  color: var(--metric-color);
  font-weight: 600;
  width: 30px;
  height: 30px;
  border-radius: 9px;
  font-size: 15px;
}

.metric-value {
  letter-spacing: -.8px;
  font-weight: 600;
  color: #2c3a50;
  font-size: 29px;
  margin-top: 4px;
}

.metric-value small {
  color: #98a2b1;
  font-weight: 400;
  margin-left: 4px;
  letter-spacing: 0;
  font-size: 12px;
}

.text-button:focus-visible {
  outline: 2px solid #8badff;
  outline-offset: 2px;
}

.metric-card:hover {
  border-color: color-mix(in srgb, var(--metric-color) 38%, white);
  box-shadow: 0 4px 14px rgba(30, 55, 95, .08);
}

.metric-card.selected {
  border-color: var(--metric-color);
  box-shadow: 0 0 0 1px var(--metric-color), 0 3px 12px color-mix(in srgb, var(--metric-color) 10%, transparent);
  background: color-mix(in srgb, var(--metric-color) 3%, white);
}

.metric-card:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--metric-color) 55%, white);
  outline-offset: 2px;
}

@media (max-width: 1050px) {
  .metric-grid {
    gap: 10px;
  }

  .metric-card {
    padding: 14px;
  }

  .metric-value {
    font-size: 25px;
  }
}

@media (max-width: 760px) {
  .section-heading {
    align-items: flex-start;
  }

  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 9px;
  }

  .metric-card {
    padding: 12px;
  }

  .metric-label {
    font-size: 11px;
  }

  .metric-value {
    font-size: 23px;
  }
}
</style>
