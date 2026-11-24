import type { Activity } from './data/movement-data'

export const allLocationsLabel = '全部地点'
export const allDepartmentsLabel = '全部部门'

const hiddenCategories = new Set(['满3个月', '签订合同', '签劳动合同', '满3个月/签订合同'])

type ActivityFilters = {
  start: string
  end: string
  location: string
  department: string
}

export type TrendSeries = { name: string; values: number[] }

/**
 * 选出页面展示的异动类别。
 * @param {readonly string[]} categories 源数据中的类别列表。
 * @returns {string[]} 页面可展示的类别。
 */
export function getVisibleCategories(categories: readonly string[]) {
  return categories.filter(
    /**
     * 判断类别是否应出现在页面上。
     * @param {string} category 待判断的类别。
     * @returns {boolean} 类别是否可见。
     */
    (category) => !hiddenCategories.has(category),
  )
}

/**
 * 按月份、类别、地点和部门筛选异动事件。
 * @param {readonly Activity[]} activities 全量异动事件。
 * @param {readonly string[]} categories 页面允许展示的类别。
 * @param {ActivityFilters} filters 当前筛选条件。
 * @returns {Activity[]} 符合条件的异动事件。
 */
export function filterActivities(
  activities: readonly Activity[],
  categories: readonly string[],
  filters: ActivityFilters,
) {
  const { start, end, location, department } = filters
  return activities.filter(
    /**
     * 判断异动事件是否匹配全部筛选条件。
     * @param {Activity} row 待筛选的异动事件。
     * @returns {boolean} 是否保留该事件。
     */
    (row) =>
      row.month >= start && row.month <= end &&
      categories.includes(row.category) &&
      (location === allLocationsLabel || row.location === location) &&
      (department === allDepartmentsLabel || row.department === department),
  )
}

/**
 * 按异动类别累计事件数。
 * @param {readonly Activity[]} activities 待统计的异动事件。
 * @returns {Map<string, number>} 类别与事件数的映射。
 */
export function countByCategory(activities: readonly Activity[]) {
  const counts = new Map<string, number>()
  for (const { category } of activities) {
    counts.set(category, (counts.get(category) ?? 0) + 1)
  }
  return counts
}

/**
 * 按月份生成类别或部门的趋势序列。
 * @param {readonly Activity[]} activities 筛选后的异动事件。
 * @param {readonly string[]} months 要展示的月份。
 * @param {readonly string[]} names 序列名称，按模式对应类别或部门。
 * @param {string | null} selectedCategory 选中的类别，空值表示类别趋势。
 * @returns {TrendSeries[]} 与展示月份对齐的趋势序列。
 */
export function summarizeTrend(
  activities: readonly Activity[],
  months: readonly string[],
  names: readonly string[],
  selectedCategory: string | null,
): TrendSeries[] {
  const countsByMonth = new Map<string, Map<string, number>>()

  for (const { month, category, department } of activities) {
    if (selectedCategory !== null && category !== selectedCategory) continue

    const name = selectedCategory === null ? category : department
    let counts = countsByMonth.get(month)
    if (!counts) {
      counts = new Map()
      countsByMonth.set(month, counts)
    }
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }

  return names.map(
    /**
     * 为一个类别或部门生成月度数据点。
     * @param {string} name 类别或部门名称。
     * @returns {TrendSeries} 该名称对应的趋势序列。
     */
    (name) => ({
      name,
      values: months.map(
        /**
         * 读取当前序列在指定月份的事件数。
         * @param {string} month 展示月份。
         * @returns {number} 当月事件数，没有记录时为零。
         */
        (month) => countsByMonth.get(month)?.get(name) ?? 0,
      ),
    }),
  )
}

/**
 * 将六位年月转换为页面展示的月份文本。
 * @param {string} month YYYYMM 格式的月份。
 * @param {string} separator 年和月之间的分隔符。
 * @returns {string} 格式化后的月份。
 */
export function formatMonth(month: string, separator = '-') {
  return `${month.slice(0, 4)}${separator}${month.slice(4)}`
}
