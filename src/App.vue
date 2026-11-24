<template>
  <!-- 月度人员异动页面，组合筛选、概览、趋势和数据质量组件。 -->
  <div class="app-shell">
    <WorkspaceSidebar />

    <main class="main-content">
      <header class="topbar">
        <div class="breadcrumbs"><span>数据分析</span><b>/</b><strong>月度人员异动</strong></div>
        <div class="topbar-right">
          <span class="source-pill"><i></i>Excel 数据源</span>
          <button class="icon-button" aria-label="数据说明" @click="toggleQuality">ⓘ</button>
          <div class="top-avatar">PC</div>
        </div>
      </header>

      <div class="page-content">
        <section class="page-heading">
          <div>
            <div class="eyebrow">PEOPLE MOVEMENT</div>
            <h1>月度人员异动</h1>
          </div>
          <div class="updated-at"><span class="live-dot"></span> 数据更新至 <strong>2026年10月</strong></div>
        </section>

        <MovementFilters
          v-model:start="periodStart"
          v-model:end="periodEnd"
          v-model:location="selectedLocation"
          v-model:department="selectedDepartment"
          :months="months"
          :locations="locationOptions"
          :departments="departmentOptions"
          @reset="resetFilters"
        />

        <MovementOverview
          :range-label="rangeLabel"
          :total="selectedActivities.length"
          :metrics="metrics"
          :selected-category="selectedCategory"
          @select-category="toggleCategory"
          @toggle-quality="toggleQuality"
        />

        <MovementTrend
          :months="visibleMonths"
          :series="trendSeries"
          :category-controls="categoryControls"
          :departments="departments"
          :department="selectedDepartment"
          :selected-category="selectedCategory"
          :reset-key="filterResetKey"
        />

        <MovementDataQuality
          v-if="showQuality"
          :activity-count="activity.length"
          :months="months"
          :transfers="transferStats"
          @close="showQuality = false"
        />
        <footer class="page-footer">PeopleCompass 人力数据分析 <span>·</span> 数据仅用于内部分析</footer>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import MovementDataQuality from './components/MovementDataQuality.vue'
import MovementFilters from './components/MovementFilters.vue'
import MovementOverview from './components/MovementOverview.vue'
import MovementTrend from './components/MovementTrend.vue'
import WorkspaceSidebar from './components/WorkspaceSidebar.vue'
import { movementData } from './data/movement-data'
import type { Activity } from './data/movement-data'
import {
  allDepartmentsLabel,
  allLocationsLabel,
  countByCategory,
  filterActivities,
  formatMonth,
  getVisibleCategories,
  summarizeTrend,
} from './movement-statistics'
import type { TrendSeries } from './movement-statistics'

const { activity, categories, months, transferStats } = movementData
const visibleCategories = getVisibleCategories(categories)
const departments = [...new Set(activity.map(
  /**
   * 读取异动事件所属部门，用于生成部门筛选项。
   * @param {Activity} row 异动事件。
   * @returns {string} 部门名称。
   */
  (row) => row.department,
).filter(Boolean))]
  .sort(
    /**
     * 按中文名称排列部门筛选项。
     * @param {string} a 前一个部门名称。
     * @param {string} b 后一个部门名称。
     * @returns {number} 排序比较结果。
     */
    (a, b) => a.localeCompare(b, 'zh-CN'),
  )
const departmentOptions = [allDepartmentsLabel, ...departments]
const locationOptions = [allLocationsLabel, ...new Set(activity.map(
  /**
   * 读取异动事件的办公地点，用于生成地点筛选项。
   * @param {Activity} row 异动事件。
   * @returns {string} 办公地点。
   */
  (row) => row.location,
).filter(Boolean).sort())]
const defaultStart = months[Math.max(0, months.length - 12)]
const defaultEnd = months.at(-1) ?? ''

const periodStart = ref(defaultStart)
const periodEnd = ref(defaultEnd)
const selectedLocation = ref(allLocationsLabel)
const selectedDepartment = ref(allDepartmentsLabel)
const selectedCategory = ref<string | null>(null)
const showQuality = ref(false)
const filterResetKey = ref(0)

const categoryColors = ['#356df3', '#f27668', '#17a98c', '#f1a440']
const categoryIcons = ['↗', '↘', '✓', '◈']
const categoryControls = visibleCategories.map(
  /**
   * 为可见类别匹配指标卡颜色。
   * @param {string} name 异动类别。
   * @param {number} index 类别在展示列表中的位置。
   * @returns {{name: string, color: string}} 类别与颜色配置。
   */
  (name, index) => ({
    name,
    color: categoryColors[index],
  }),
)

const selectedActivities = computed(
  /**
   * 根据当前筛选状态计算页面展示的异动事件。
   * @returns {Activity[]} 筛选后的异动事件。
   */
  () => filterActivities(activity, visibleCategories, {
    start: periodStart.value,
    end: periodEnd.value,
    location: selectedLocation.value,
    department: selectedDepartment.value,
  }),
)
const visibleMonths = computed(
  /**
   * 计算当前时间区间内需要展示的月份。
   * @returns {string[]} 展示月份。
   */
  () => months.filter(
    /**
     * 判断月份是否位于选定区间内。
     * @param {string} month 候选月份。
     * @returns {boolean} 是否展示该月份。
     */
    (month) => month >= periodStart.value && month <= periodEnd.value,
  ),
)
const rangeLabel = computed(
  /**
   * 生成人员异动概览中的月份区间文本。
   * @returns {string} 格式化的区间标签。
   */
  () => `${formatMonth(periodStart.value, '.')} — ${formatMonth(periodEnd.value, '.')}`,
)
const metrics = computed(
  /**
   * 根据筛选后的事件计算分类指标卡数据。
   * @returns {Array<{name: string, color: string, icon: string, value: number}>} 指标卡内容。
   */
  () => {
    const counts = countByCategory(selectedActivities.value)
    return categoryControls.map(
      /**
       * 将一个类别的计数和展示配置合并为指标卡。
       * @param {{name: string, color: string}} control 类别展示配置。
       * @param {number} index 类别在指标卡中的位置。
       * @returns {{name: string, color: string, icon: string, value: number}} 指标卡数据。
       */
      ({ name, color }, index) => ({
        name,
        color,
        icon: categoryIcons[index],
        value: counts.get(name) ?? 0,
      }),
    )
  },
)
const trendSeries = computed(
  /**
   * 根据当前类别和月份生成趋势图序列。
   * @returns {TrendSeries[]} 趋势图数据。
   */
  () => summarizeTrend(
    selectedActivities.value,
    visibleMonths.value,
    selectedCategory.value === null ? visibleCategories : departments,
    selectedCategory.value,
  ),
)

/**
 * 切换类别指标卡的选中状态。
 * @param {string} category 用户选择的异动类别。
 */
function toggleCategory(category: string) {
  selectedCategory.value = selectedCategory.value === category ? null : category
}

/** 切换数据质量说明面板的显示状态。 */
function toggleQuality() {
  showQuality.value = !showQuality.value
}

/** 将筛选条件恢复为默认区间和全部地点、部门。 */
function resetFilters() {
  periodStart.value = defaultStart
  periodEnd.value = defaultEnd
  selectedLocation.value = allLocationsLabel
  selectedDepartment.value = allDepartmentsLabel
  filterResetKey.value += 1
}
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  --sidebar-width: 298px;
}

.top-avatar {
  display: grid;
  place-items: center;
  border-radius: 50%;
  font-weight: 700;
  background: #f0eafd;
  color: #8264bf;
  width: 34px;
  height: 34px;
  font-size: 12px;
}

.main-content {
  min-height: 100vh;
  margin-left: var(--sidebar-width);
}

.topbar {
  border-bottom: 1px solid #eaedf3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 76px;
  padding: 0 42px;
  position: sticky;
  top: 0;
  z-index: 3;
  background: rgba(255, 255, 255, .94);
  backdrop-filter: blur(12px);
}

.breadcrumbs {
  display: flex;
  align-items: center;
  color: #9aa4b2;
  font-size: 13px;
  gap: 14px;
}

.breadcrumbs b {
  font-weight: 400;
  color: #c4cbd5;
}

.breadcrumbs strong {
  color: #42516a;
  font-weight: 600;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.source-pill {
  display: flex;
  align-items: center;
  gap: 7px;
  border: 1px solid #e8edf2;
  border-radius: 18px;
  color: #748198;
  background: #fff;
  font-size: 12px;
  padding: 8px 12px;
}

.source-pill i,
.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #1bb489;
  box-shadow: 0 0 0 3px #e7f7f1;
}

.icon-button {
  border: 0;
  background: none;
  color: #8b96a8;
  font-size: 15px;
}

.page-content {
  margin: 0 auto;
  padding: 38px 42px 28px;
}

.page-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 28px;
}

.eyebrow {
  font-weight: 700;
  letter-spacing: .16em;
  color: #95a4bd;
  font-size: 11px;
  margin-bottom: 8px;
}

.page-heading h1 {
  margin: 0;
  line-height: 1.35;
  color: #26354c;
  font-size: 30px;
  letter-spacing: -.65px;
}

.page-heading p {
  color: #8c97a8;
  margin: 8px 0 0;
  font-size: 14px;
}

.updated-at {
  display: flex;
  align-items: center;
  color: #8e99aa;
  padding-bottom: 3px;
  font-size: 12px;
  gap: 10px;
}

.updated-at strong {
  color: #66758c;
  font-weight: 600;
}

.page-footer {
  text-align: center;
  color: #afb7c3;
  font-size: 11px;
  padding: 13px 0 3px;
}

.page-footer span {
  margin: 0 4px;
}

@media (max-width: 1200px) {
  .app-shell {
    --sidebar-width: 250px;
  }

  .topbar {
    padding: 0 30px;
  }

  .page-content {
    padding: 30px;
  }
}

@media (max-width: 1050px) {
  .app-shell {
    --sidebar-width: 220px;
  }

  .topbar {
    height: 66px;
    padding: 0 24px;
  }

  .page-content {
    padding: 26px 24px;
  }

  .page-heading h1 {
    font-size: 27px;
  }
}

@media (max-width: 760px) {
  .app-shell {
    --sidebar-width: 62px;
  }

  .topbar {
    height: 54px;
    padding: 0 14px;
  }

  .source-pill {
    display: none;
  }

  .page-content {
    padding: 20px 14px;
  }

  .page-heading {
    align-items: flex-start;
    gap: 10px;
  }

  .page-heading h1 {
    font-size: 22px;
  }

  .page-heading p {
    font-size: 12px;
  }

  .updated-at {
    font-size: 9px;
    white-space: nowrap;
    gap: 5px;
  }
}
</style>
