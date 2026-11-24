<template>
  <!-- 月度异动趋势图。props 提供月份、序列、类别配置、部门筛选和重置标记。 -->
  <section class="chart-section card">
    <div class="card-heading">
      <div><h2>{{ selectedCategory ? `${selectedCategory}部门月度趋势` : '月度异动趋势' }}</h2></div>
    </div>
    <div v-if="selectedCategory === null" class="series-toggles" role="group" aria-label="控制趋势图折线显隐">
      <button
        v-for="{ name, color } in categoryControls"
        :key="name"
        class="series-toggle"
        :class="{ active: !hiddenCategories.has(name) }"
        :style="{ '--series-color': color }"
        type="button"
        :aria-pressed="!hiddenCategories.has(name)"
        @click="toggleSeries(name)"
      >
        <span class="series-dot" aria-hidden="true"></span>
        <span>{{ name }}</span>
        <svg v-if="!hiddenCategories.has(name)" class="series-state" viewBox="0 0 16 16" aria-hidden="true">
          <path d="m3 8 3.2 3.2L13 4.5" />
        </svg>
        <svg v-else class="series-state" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M2 8s2.2-4 6-4 6 4 6 4-2.2 4-6 4-6-4-6-4Z" />
          <circle cx="8" cy="8" r="1.7" />
          <path d="m3 13 10-10" />
        </svg>
      </button>
    </div>
    <div v-else class="department-filter-row" aria-label="部门折线筛选">
      <span class="department-filter-label">部门</span>
      <span
        v-for="({ name }, index) in visibleSeries"
        :key="name"
        class="department-chip"
        :style="{ '--series-color': departmentColor(index) }"
      >
        <span class="series-dot" aria-hidden="true"></span>
        <span>{{ name }}</span>
        <button type="button" :aria-label="`移除${name}`" @click="removeDepartment(name)">×</button>
      </span>
      <div class="department-picker-wrap">
        <button
          class="department-picker-button"
          type="button"
          :aria-expanded="showDepartmentPicker"
          @click="toggleDepartmentPicker"
        >筛选部门 <span aria-hidden="true">⌄</span></button>
        <div v-if="showDepartmentPicker" class="department-picker card">
          <div class="department-picker-options">
            <label v-for="name in departments" :key="name" class="department-option">
              <input v-model="draftDepartments" type="checkbox" :value="name">
              <span>{{ name }}</span>
            </label>
          </div>
          <div class="department-picker-actions">
            <button type="button" @click="toggleDepartmentPicker">取消</button>
            <button class="department-picker-apply" type="button" @click="applyDepartmentPicker">
              应用筛选 <span>{{ draftDepartments.length }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    <div
      ref="chartElement"
      class="trend-chart"
      role="img"
      :aria-label="selectedCategory ? `${selectedCategory}按部门月度趋势折线图` : '月度人员异动趋势折线图'"
    ></div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { init, use } from 'echarts/core'
import type { ComposeOption, EChartsType } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import type { LineSeriesOption } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import type { GridComponentOption, TooltipComponentOption } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { allDepartmentsLabel, formatMonth } from '../movement-statistics'
import type { TrendSeries } from '../movement-statistics'

use([LineChart, GridComponent, TooltipComponent, CanvasRenderer])

type TrendOption = ComposeOption<LineSeriesOption | GridComponentOption | TooltipComponentOption>

const props = defineProps<{
  months: readonly string[]
  series: readonly TrendSeries[]
  categoryControls: readonly { name: string; color: string }[]
  departments: readonly string[]
  department: string
  selectedCategory: string | null
  resetKey: number
}>()

const defaultDepartments = computed(
  /**
   * 选择趋势图默认展示的前五个有效部门。
   * @returns {string[]} 默认部门名称。
   */
  () => props.departments.filter(
    /**
     * 排除缺失部门的占位值。
     * @param {string} name 部门名称。
     * @returns {boolean} 是否为有效部门。
     */
    (name) => name !== '/',
  ).slice(0, 5),
)
const selectedDepartments = ref([...defaultDepartments.value])
const draftDepartments = ref([...selectedDepartments.value])
const showDepartmentPicker = ref(false)
const hiddenCategories = ref(new Set<string>())
const chartElement = ref<HTMLDivElement | null>(null)
let chart: EChartsType | null = null
let resizeObserver: ResizeObserver | null = null

const visibleSeries = computed(
  /**
   * 根据选中类别和部门筛选可见的趋势序列。
   * @returns {TrendSeries[]} 当前可见的序列。
   */
  () => props.series.filter(
    /**
     * 判断类别或部门对应的折线是否应展示。
     * @param {TrendSeries} series 候选趋势序列。
     * @returns {boolean} 是否展示该序列。
     */
    ({ name }) =>
      props.selectedCategory === null
        ? !hiddenCategories.value.has(name)
        : selectedDepartments.value.includes(name),
  ),
)

/**
 * 切换一个异动类别折线的显隐状态。
 * @param {string} name 类别名称。
 */
function toggleSeries(name: string) {
  if (hiddenCategories.value.has(name)) hiddenCategories.value.delete(name)
  else hiddenCategories.value.add(name)
}

/**
 * 从当前趋势图和筛选草稿中移除部门。
 * @param {string} name 部门名称。
 */
function removeDepartment(name: string) {
  selectedDepartments.value = selectedDepartments.value.filter(
    /**
     * 保留未被移除的已选部门。
     * @param {string} department 已选部门。
     * @returns {boolean} 是否保留该部门。
     */
    (department) => department !== name,
  )
  draftDepartments.value = draftDepartments.value.filter(
    /**
     * 保留未被移除的草稿部门。
     * @param {string} department 草稿部门。
     * @returns {boolean} 是否保留该部门。
     */
    (department) => department !== name,
  )
}

/** 打开或关闭部门筛选面板，并同步当前选择到草稿。 */
function toggleDepartmentPicker() {
  draftDepartments.value = [...selectedDepartments.value]
  showDepartmentPicker.value = !showDepartmentPicker.value
}

/** 将部门筛选草稿应用到趋势图。 */
function applyDepartmentPicker() {
  selectedDepartments.value = [...draftDepartments.value]
  showDepartmentPicker.value = false
}

/**
 * 根据部门顺序生成可区分的折线颜色。
 * @param {number} index 部门在可见序列中的位置。
 * @returns {string} HSL 颜色值。
 */
function departmentColor(index: number) {
  return `hsl(${Math.round((index * 137.508) % 360)} 62% 47%)`
}

const trendOption = computed<TrendOption>(
  /**
   * 生成与当前月份、类别和部门筛选一致的 ECharts 配置。
   * @returns {TrendOption} 趋势图配置。
   */
  () => ({
    animationDuration: 500,
    color: props.selectedCategory === null
      ? ['#356df3', '#ef766a', '#17a98c', '#f1a440']
      : visibleSeries.value.map(
        /**
         * 为部门序列分配折线颜色。
         * @param {TrendSeries} series 当前部门序列。
         * @param {number} index 部门在可见序列中的位置。
         * @returns {string} 折线颜色。
         */
        (_, index) => departmentColor(index),
      ),
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#fff',
      borderColor: '#e6eaf1',
      textStyle: { color: '#27344a' },
      valueFormatter:
        /**
         * 在提示框中显示事件计数单位。
         * @param {number | string} value 轴上对应的数据值。
         * @returns {string} 带单位的计数文本。
         */
        (value) => `${value} 次`,
    },
    grid: { left: 36, right: 18, top: 18, bottom: 28 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: props.months.map(
        /**
         * 将月份转换为横轴标签。
         * @param {string} month 原始月份。
         * @returns {string} 展示月份。
         */
        (month) => formatMonth(month),
      ),
      axisLine: { lineStyle: { color: '#e9edf4' } },
      axisTick: { show: false },
      axisLabel: { color: '#8993a4', fontSize: 10, hideOverlap: true },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: '#edf0f5', type: 'dashed' } },
      axisLabel: { color: '#98a1af', fontSize: 10 },
    },
    series: visibleSeries.value.map(
      /**
       * 将一条业务趋势序列转换为折线配置。
       * @param {TrendSeries} series 可见趋势序列。
       * @returns {LineSeriesOption} ECharts 折线配置。
       */
      ({ name, values }) => ({
        name,
        type: 'line',
        smooth: 0.25,
        showSymbol: false,
        symbolSize: 6,
        emphasis: { disabled: true },
        lineStyle: { width: 2 },
        data: values,
      }),
    ),
  }),
)

/** 用最新配置刷新趋势图。 */
function updateChart() {
  chart?.setOption(trendOption.value, { notMerge: true })
}

watch(
  /**
   * 读取页面当前选择的部门。
   * @returns {string} 页面部门筛选值。
   */
  () => props.department,
  /**
   * 在页面部门筛选变化后同步趋势图的部门选择。
   * @param {string} department 新的部门筛选值。
   */
  (department) => {
    selectedDepartments.value = department === allDepartmentsLabel ? [...defaultDepartments.value] : [department]
    draftDepartments.value = [...selectedDepartments.value]
  },
)

watch(
  /**
   * 读取页面筛选重置标记。
   * @returns {number} 当前重置标记。
   */
  () => props.resetKey,
  /** 在页面重置筛选时恢复趋势图的默认部门。 */
  () => {
    selectedDepartments.value = [...defaultDepartments.value]
    draftDepartments.value = [...selectedDepartments.value]
    showDepartmentPicker.value = false
  },
)

watch(trendOption, updateChart, { flush: 'post' })

onMounted(
  /** 在组件挂载后创建趋势图并监听容器尺寸。 */
  () => {
    const element = chartElement.value
    if (!element) return

    chart = init(element)
    updateChart()
    resizeObserver = new ResizeObserver(
      /** 在容器尺寸变化后重新调整趋势图尺寸。 */
      () => chart?.resize(),
    )
    resizeObserver.observe(element)
  },
)

onBeforeUnmount(
  /** 在组件卸载前释放尺寸监听器和图表实例。 */
  () => {
    resizeObserver?.disconnect()
    chart?.dispose()
    chart = null
  },
)
</script>

<style scoped>
.chart-section {
  margin-bottom: 28px;
  padding: 20px 23px 12px;
  border-radius: 12px;
}

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

.trend-chart {
  width: 100%;
  height: 320px;
  margin-top: 8px;
}

.series-toggles {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
}

.series-toggle {
  height: 34px;
  min-width: 104px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 11px;
  border: 1px solid #e5eaf2;
  border-radius: 18px;
  background: #fff;
  color: #526078;
  font-size: 12px;
  transition: background-color .16s, border-color .16s, color .16s;
}

.series-toggle:hover {
  border-color: #b8c9f3;
  background: #f8faff;
}

.series-toggle.active {
  border-color: color-mix(in srgb, var(--series-color) 42%, white);
  background: color-mix(in srgb, var(--series-color) 5%, white);
  color: #394960;
}

.series-dot {
  width: 9px;
  height: 9px;
  flex: none;
  border-radius: 50%;
  background: var(--series-color);
}

.series-toggle:not(.active) .series-dot {
  opacity: .45;
}

.series-state {
  width: 15px;
  height: 15px;
  flex: none;
  margin-left: auto;
  fill: none;
  stroke: var(--series-color);
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.series-toggle:not(.active) .series-state {
  stroke: #8995a8;
}

.department-filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
}

.department-filter-label {
  margin-right: 2px;
  color: #526078;
  font-size: 11px;
  font-weight: 500;
}

.department-chip {
  height: 34px;
  max-width: 260px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 9px 0 11px;
  border: 1px solid #e5eaf2;
  border-radius: 18px;
  background: #fff;
  color: #526078;
  font-size: 11px;
}

.department-chip > span:nth-child(2) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.department-chip button {
  width: 17px;
  height: 17px;
  flex: none;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #98a3b3;
  font-size: 15px;
  line-height: 15px;
}

.department-chip button:hover {
  background: #f0f3f8;
  color: #4d5b71;
}

.department-picker-wrap {
  position: relative;
  margin-left: 5px;
}

.department-picker-button {
  height: 34px;
  padding: 0 13px;
  border: 1px solid #dfe6f0;
  border-radius: 8px;
  background: #fff;
  color: #526078;
  font-size: 11px;
}

.department-picker-button:hover {
  border-color: #b8c9f3;
  background: #f8faff;
}

.department-picker-button span {
  margin-left: 8px;
  color: #8793a5;
}

.department-picker {
  position: absolute;
  z-index: 5;
  top: calc(100% + 7px);
  right: 0;
  width: 260px;
  max-height: 320px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 6px;
  box-shadow: 0 8px 24px rgba(30, 55, 95, .12);
}

.department-picker-options {
  min-height: 0;
  overflow-y: auto;
}

.department-picker-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 9px 4px 2px;
  margin-top: 5px;
  border-top: 1px solid #edf0f5;
}

.department-picker-actions button {
  height: 29px;
  padding: 0 11px;
  border: 1px solid #e3e8f0;
  border-radius: 6px;
  background: #fff;
  color: #69768b;
  font-size: 11px;
}

.department-picker-actions button:hover {
  background: #f7f9fc;
}

.department-picker-actions .department-picker-apply {
  border-color: var(--blue);
  background: var(--blue);
  color: #fff;
}

.department-picker-actions .department-picker-apply:hover {
  background: #285dd8;
}

.department-picker-apply span {
  display: inline-grid;
  min-width: 17px;
  height: 17px;
  place-items: center;
  margin-left: 5px;
  padding: 0 4px;
  border-radius: 9px;
  background: rgba(255, 255, 255, .22);
  font-size: 10px;
}

.department-option {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 33px;
  padding: 5px 8px;
  border-radius: 5px;
  color: #526078;
  font-size: 11px;
  cursor: pointer;
}

.department-option:hover {
  background: #f6f8fc;
}

.department-option input {
  accent-color: var(--blue);
}

.series-toggle:focus-visible,
.department-picker-actions button:focus-visible,
.department-picker-button:focus-visible,
.department-chip button:focus-visible {
  outline: 2px solid #8badff;
  outline-offset: 2px;
}

@media (max-width: 760px) {
  .chart-section {
    padding-inline: 13px;
  }

  .trend-chart {
    height: 260px;
  }

  .department-picker {
    right: auto;
    left: 0;
    width: min(260px, calc(100vw - 105px));
  }
}
</style>
