<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsType } from 'echarts/core'
import data from './data/processed.json'

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer])

type Activity = { month: string; category: string; location: string; department: string }
const categories = data.categories as string[]
const hiddenCategories = new Set(['满3个月', '签订合同', '签劳动合同', '满3个月/签订合同'])
const visibleCategories = categories.filter((category) => !hiddenCategories.has(category))
const allActivities = data.activity as Activity[]
const months = data.months as string[]
const transferStats = data.transferStats
const periodStart = ref(months.length > 12 ? months[months.length - 12] : months[0])
const periodEnd = ref(months.at(-1) ?? '')
const selectedLocation = ref('全部地点')
const selectedDepartment = ref('全部部门')
const selectedSeries = ref([...visibleCategories])
const chartElement = ref<HTMLDivElement | null>(null)
const showQuality = ref(false)
let chart: EChartsType | null = null
let resizeObserver: ResizeObserver | null = null

const locations = computed(() => ['全部地点', ...new Set(allActivities.map((row) => row.location).filter(Boolean).sort())])
const departments = computed(() => ['全部部门', ...new Set(allActivities.map((row) => row.department).filter(Boolean).sort((a, b) => a.localeCompare(b, 'zh-CN')))])
const selectedActivities = computed(() => allActivities.filter((row) =>
  row.month >= periodStart.value && row.month <= periodEnd.value &&
  visibleCategories.includes(row.category) &&
  (selectedLocation.value === '全部地点' || row.location === selectedLocation.value) &&
  (selectedDepartment.value === '全部部门' || row.department === selectedDepartment.value),
))
const metricCards = computed(() => visibleCategories.map((category, index) => ({
  category,
  value: selectedActivities.value.filter((row) => row.category === category).length,
  color: ['#356df3', '#f27668', '#17a98c', '#f1a440'][index],
  icon: ['↗', '↘', '✓', '◈'][index],
})))
const totalEvents = computed(() => selectedActivities.value.length)
const visibleMonths = computed(() => months.filter((month) => month >= periodStart.value && month <= periodEnd.value))
const isSeriesSelected = (category: string) => selectedSeries.value.includes(category)
function toggleSeries(category: string) {
  selectedSeries.value = isSeriesSelected(category)
    ? selectedSeries.value.filter((item) => item !== category)
    : visibleCategories.filter((item) => selectedSeries.value.includes(item) || item === category)
}
const trendOption = computed(() => ({
  animationDuration: 500,
  color: ['#356df3', '#ef766a', '#17a98c', '#f1a440'],
  tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#e6eaf1', textStyle: { color: '#27344a' }, valueFormatter: (value: number) => `${value} 次` },
  legend: { show: false },
  grid: { left: 36, right: 18, top: 18, bottom: 28 },
  xAxis: { type: 'category', boundaryGap: false, data: visibleMonths.value.map((month) => `${month.slice(0, 4)}-${month.slice(4)}`), axisLine: { lineStyle: { color: '#e9edf4' } }, axisTick: { show: false }, axisLabel: { color: '#8993a4', fontSize: 10, hideOverlap: true } },
  yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: '#edf0f5', type: 'dashed' } }, axisLabel: { color: '#98a1af', fontSize: 10 } },
  series: visibleCategories.filter(isSeriesSelected).map((category) => ({
    name: category,
    type: 'line',
    smooth: 0.25,
    showSymbol: false,
    symbolSize: 6,
    emphasis: { focus: 'series', showSymbol: true },
    lineStyle: { width: 2 },
    data: visibleMonths.value.map((month) => selectedActivities.value.filter((row) => row.month === month && row.category === category).length),
  })),
}))

const rangeLabel = computed(() => `${periodStart.value.slice(0, 4)}.${periodStart.value.slice(4)} — ${periodEnd.value.slice(0, 4)}.${periodEnd.value.slice(4)}`)

function formatMonth(month: string) {
  return `${month.slice(0, 4)}-${month.slice(4)}`
}
function updateChart() {
  if (chart && !chart.isDisposed()) chart.setOption(trendOption.value, true)
}
function resetFilters() {
  periodStart.value = months.length > 12 ? months[months.length - 12] : months[0]
  periodEnd.value = months.at(-1) ?? ''
  selectedLocation.value = '全部地点'
  selectedDepartment.value = '全部部门'
}
watch([trendOption], async () => {
  await nextTick()
  updateChart()
})
onMounted(async () => {
  await nextTick()
  if (chartElement.value) {
    chart = echarts.init(chartElement.value)
    updateChart()
    resizeObserver = new ResizeObserver(() => chart?.resize())
    resizeObserver.observe(chartElement.value)
  }
})
onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  chart?.dispose()
})
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand"><div class="brand-mark"><span></span><span></span><span></span></div><div><strong>PeopleCompass</strong><small>人力数据分析平台</small></div></div>
      <div class="nav-caption">工作台</div>
      <nav class="main-nav" aria-label="主导航">
        <a class="nav-item" href="#" @click.prevent><span class="nav-icon">⌂</span>数据总览</a>
        <a class="nav-item" href="#" @click.prevent><span class="nav-icon">♙</span>人员分析</a>
        <a class="nav-item active" href="#" aria-current="page" @click.prevent><span class="nav-icon">⇄</span>月度人员异动</a>
        <a class="nav-item disabled" href="#" @click.prevent><span class="nav-icon">▦</span>组织分析 <em>规划中</em></a>
        <a class="nav-item disabled" href="#" @click.prevent><span class="nav-icon">⌕</span>招聘分析 <em>规划中</em></a>
        <a class="nav-item disabled" href="#" @click.prevent><span class="nav-icon">↘</span>离职分析 <em>规划中</em></a>
      </nav>
      <div class="sidebar-footer"><div class="footer-avatar">HR</div><div class="footer-profile"><strong>人力资源部</strong><small>数据分析工作区</small></div><span class="footer-dots">•••</span></div>
    </aside>

    <main class="main-content">
      <header class="topbar">
        <div class="breadcrumbs"><span>数据分析</span><b>/</b><strong>月度人员异动</strong></div>
        <div class="topbar-right"><span class="source-pill"><i></i>Excel 数据源</span><button class="icon-button" aria-label="数据说明" @click="showQuality = !showQuality">ⓘ</button><div class="top-avatar">PC</div></div>
      </header>

      <div class="page-content">
        <section class="page-heading">
          <div><div class="eyebrow">PEOPLE MOVEMENT</div><h1>月度人员异动</h1><p>追踪人员异动趋势，洞察组织变化。</p></div>
          <div class="updated-at"><span class="live-dot"></span> 数据更新至 <strong>2026年10月</strong></div>
        </section>

        <section class="filter-panel card">
          <div class="filter-title"><span class="filter-symbol">☷</span><strong>筛选条件</strong></div>
          <div class="filter-controls">
            <label class="filter-field"><span>开始月份</span><select v-model="periodStart"><option v-for="month in months" :key="month" :value="month">{{ formatMonth(month) }}</option></select></label>
            <span class="filter-dash">—</span>
            <label class="filter-field"><span>结束月份</span><select v-model="periodEnd"><option v-for="month in months" :key="month" :value="month">{{ formatMonth(month) }}</option></select></label>
            <label class="filter-field"><span>办公地点</span><select v-model="selectedLocation"><option v-for="location in locations" :key="location">{{ location }}</option></select></label>
            <label class="filter-field department-select"><span>所属部门</span><select v-model="selectedDepartment"><option v-for="department in departments" :key="department">{{ department }}</option></select></label>
            <button class="reset-button" @click="resetFilters">↻ <span>重置</span></button>
          </div>
        </section>

        <section class="section-block">
          <div class="section-heading"><div><h2>异动概览</h2><span class="section-subtitle">{{ rangeLabel }} · 共 <b>{{ totalEvents.toLocaleString() }}</b> 条异动事件</span></div><button class="text-button" @click="showQuality = !showQuality">查看数据质量 <span>›</span></button></div>
          <div class="metric-grid">
            <article v-for="(metric, index) in metricCards" :key="metric.category" class="metric-card card" :style="{ '--metric-color': metric.color }">
              <div class="metric-top"><span class="metric-label">{{ metric.category }}</span><span class="metric-icon">{{ metric.icon }}</span></div>
              <div class="metric-value">{{ metric.value.toLocaleString() }}<small>次</small></div>
              <div class="metric-foot"><span class="metric-index">{{ String(index + 1).padStart(2, '0') }}</span><span>异动事件</span></div>
            </article>
          </div>
        </section>

        <section class="section-block chart-section card">
          <div class="card-heading"><div><h2>月度异动趋势</h2><p>按异动类别查看每月事件变化</p></div></div>
          <div class="series-toggles" role="group" aria-label="控制趋势图折线显隐">
            <button
              v-for="category in visibleCategories"
              :key="category"
              class="series-toggle"
              :class="{ active: isSeriesSelected(category) }"
              :style="{ '--series-color': ['#356df3', '#f27668', '#17a98c', '#f1a440'][visibleCategories.indexOf(category)] }"
              type="button"
              :aria-pressed="isSeriesSelected(category)"
              @click="toggleSeries(category)"
            >
              <span class="series-dot" aria-hidden="true"></span>
              <span>{{ category }}</span>
              <svg v-if="isSeriesSelected(category)" class="series-state" viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8 3.2 3.2L13 4.5" /></svg>
              <svg v-else class="series-state" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8s2.2-4 6-4 6 4 6 4-2.2 4-6 4-6-4-6-4Z" /><circle cx="8" cy="8" r="1.7" /><path d="m3 13 10-10" /></svg>
            </button>
          </div>
          <div ref="chartElement" class="trend-chart" role="img" aria-label="月度人员异动趋势折线图"></div>
        </section>

        <section v-if="showQuality" class="quality-panel card">
          <div class="card-heading"><div><h2>数据质量与口径</h2><p>来源：每月人员异动表202610.xlsx · 入转离 / 调动</p></div><button class="close-button" aria-label="关闭" @click="showQuality = false">×</button></div>
          <div class="quality-grid"><div><span>入转离记录</span><strong>{{ allActivities.length }} 条</strong></div><div><span>调动记录</span><strong>{{ transferStats.total }} 条</strong></div><div><span>历史范围</span><strong>{{ formatMonth(months[0]) }} 至 {{ formatMonth(months.at(-1) ?? '') }} · {{ months.length }} 个月</strong></div><div><span>部门间流动</span><strong>{{ transferStats.departmentFlows }} 条</strong></div><div><span>换签（单独统计）</span><strong>{{ transferStats.swaps }} 条</strong></div><div><span>名称和具体日期</span><strong>页面数据未保留</strong></div></div>
          <p class="quality-rule">类别已去除首尾空格；仅月份、类别向下填充。部门流动排除换签、已离职及原部门与现部门相同的记录。异动数量按事件记录统计，不代表去重员工人数。地点筛选无法作用于未包含地点字段的调动工作表。</p>
        </section>
        <footer class="page-footer">PeopleCompass 人力数据分析 <span>·</span> 数据仅用于内部分析</footer>
      </div>
    </main>
  </div>
</template>
