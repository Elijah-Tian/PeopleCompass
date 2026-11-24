import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ExcelJS from 'exceljs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourcePath = path.join(root, '每月人员异动表202610.xlsx')
const outputPath = path.join(root, 'src/data/processed.json')
const logPath = path.join(root, 'data/cleaning-log.json')
const categories = ['入职', '离职', '转正', '满3个月', '阶段性', '签订合同', '签劳动合同', '满3个月/签订合同']
/**
 * 将 Excel 单元格值转换为可清洗的文本。
 * @param {unknown} value 单元格原始值。
 * @returns {string} 单元格文本。
 */
const cellText = (value) => {
  if (value && typeof value === 'object' && Array.isArray(value.richText)) return value.richText.map(
    /**
     * 提取富文本片段的文字。
     * @param {{text: string}} part 富文本片段。
     * @returns {string} 片段文字。
     */
    (part) => part.text,
  ).join('')
  if (value && typeof value === 'object' && typeof value.text === 'string') return value.text
  return value == null ? '' : String(value)
}

if (!fs.existsSync(sourcePath)) {
  throw new Error(`未找到源文件：${path.basename(sourcePath)}`)
}

const workbook = new ExcelJS.Workbook()
await workbook.xlsx.readFile(sourcePath)
const activitySheet = workbook.getWorksheet('入转离')
const transferSheet = workbook.getWorksheet('调动')
if (!activitySheet || !transferSheet) throw new Error('工作簿缺少「入转离」或「调动」工作表')

const activity = []
let activitySourceRows = 0
let month = ''
let category = ''
let monthFillCount = 0
let categoryFillCount = 0
let trimmedCategoryCount = 0
let blankCategoryCount = 0

// 表头位于第 2 行。只复制统计所需字段，保留源工作簿原样。
for (let rowNumber = 3; rowNumber <= activitySheet.rowCount; rowNumber += 1) {
  const row = activitySheet.getRow(rowNumber)
  if (Array.from({ length: 12 },
    /**
     * 读取入转离记录中的一个源字段。
     * @param {unknown} _ Array.from 提供的占位值。
     * @param {number} index 字段位置。
     * @returns {unknown} 单元格原始值。
     */
    (_, index) => row.getCell(index + 1).value,
  ).every(
    /**
     * 判断源字段是否为空。
     * @param {unknown} value 单元格原始值。
     * @returns {boolean} 字段是否为空。
     */
    (value) => value === null || value === undefined || value === '',
  )) continue
  activitySourceRows += 1
  const rowMonth = row.getCell(1).value
  if (rowMonth !== null && rowMonth !== undefined && rowMonth !== '') month = cellText(rowMonth).trim()
  else if (month) monthFillCount += 1

  const rowCategory = row.getCell(2).value
  if (rowCategory !== null && rowCategory !== undefined && rowCategory !== '') {
    const rawCategory = cellText(rowCategory)
    const cleanCategory = rawCategory.trim()
    if (rawCategory !== cleanCategory) trimmedCategoryCount += 1
    category = cleanCategory
  } else if (category) {
    categoryFillCount += 1
  } else {
    blankCategoryCount += 1
  }

  if (!/^\d{6}$/.test(month) || !category) continue
  const location = cellText(row.getCell(4).value).trim()
  const department = cellText(row.getCell(5).value).trim()
  activity.push({ month, category, location, department })
}

const transfers = []
for (let rowNumber = 2; rowNumber <= transferSheet.rowCount; rowNumber += 1) {
  const row = transferSheet.getRow(rowNumber)
  if (Array.from({ length: 8 },
    /**
     * 读取调动记录中的一个源字段。
     * @param {unknown} _ Array.from 提供的占位值。
     * @param {number} index 字段位置。
     * @returns {unknown} 单元格原始值。
     */
    (_, index) => row.getCell(index + 1).value,
  ).every(
    /**
     * 判断调动源字段是否为空。
     * @param {unknown} value 单元格原始值。
     * @returns {boolean} 字段是否为空。
     */
    (value) => value === null || value === undefined || value === '',
  )) continue
  const fromDepartment = cellText(row.getCell(3).value).replace(/\s+/g, '')
  const toDepartment = cellText(row.getCell(5).value).replace(/\s+/g, '')
  const remark = cellText(row.getCell(8).value).trim()
  const isSwap = remark === '换签'
  const isLeft = remark === '已离职'
  const effectiveDate = row.getCell(7).value
  const parsedDate = effectiveDate instanceof Date ? effectiveDate : null
  const year = parsedDate?.getUTCFullYear()
  const monthNumber = parsedDate ? parsedDate.getUTCMonth() + 1 : undefined
  const transferMonth = year && monthNumber ? `${year}${String(monthNumber).padStart(2, '0')}` : ''
  transfers.push({
    month: transferMonth,
    fromDepartment,
    toDepartment,
    isSwap,
    isLeft,
    isDepartmentFlow: !isSwap && !isLeft && fromDepartment !== toDepartment,
  })
}

const monthSet = new Set(activity.map(
  /**
   * 读取异动事件月份以生成时间轴。
   * @param {{month: string}} item 异动事件。
   * @returns {string} 事件月份。
   */
  (item) => item.month,
))
const sortedMonths = [...monthSet].sort()
const categoryTotals = Object.fromEntries(categories.map(
  /**
   * 初始化历史类别计数。
   * @param {string} name 异动类别。
   * @returns {[string, number]} 类别及初始计数。
   */
  (name) => [name, 0],
))
const recentTotals = Object.fromEntries(categories.map(
  /**
   * 初始化近十二个月的类别计数。
   * @param {string} name 异动类别。
   * @returns {[string, number]} 类别及初始计数。
   */
  (name) => [name, 0],
))
for (const item of activity) {
  categoryTotals[item.category] = (categoryTotals[item.category] ?? 0) + 1
  if (item.month >= '202511' && item.month <= '202610') recentTotals[item.category] = (recentTotals[item.category] ?? 0) + 1
}

const transferStats = {
  total: transfers.length,
  swaps: transfers.filter(
    /**
     * 识别单独统计的换签记录。
     * @param {{isSwap: boolean}} item 调动记录。
     * @returns {boolean} 是否为换签。
     */
    (item) => item.isSwap,
  ).length,
  departmentFlows: transfers.filter(
    /**
     * 识别符合部门流动口径的记录。
     * @param {{isDepartmentFlow: boolean}} item 调动记录。
     * @returns {boolean} 是否计入部门流动。
     */
    (item) => item.isDepartmentFlow,
  ).length,
  departedExcluded: transfers.filter(
    /**
     * 识别因已离职而排除的记录。
     * @param {{isLeft: boolean}} item 调动记录。
     * @returns {boolean} 是否标记为已离职。
     */
    (item) => item.isLeft,
  ).length,
  sameDepartmentExcluded: transfers.filter(
    /**
     * 识别不构成部门间流动的同部门记录。
     * @param {{isSwap: boolean, isLeft: boolean, fromDepartment: string, toDepartment: string}} item 调动记录。
     * @returns {boolean} 是否为同部门且未被其他规则排除。
     */
    (item) => !item.isSwap && !item.isLeft && item.fromDepartment === item.toDepartment,
  ).length,
  invalidMonth: transfers.filter(
    /**
     * 识别未得到有效月份的调动记录。
     * @param {{month: string}} item 调动记录。
     * @returns {boolean} 月份是否缺失。
     */
    (item) => !item.month,
  ).length,
}

const log = {
  sourceFile: path.basename(sourcePath),
  generatedAt: new Date().toISOString(),
  originalPreserved: true,
  sheets: {
    '入转离': { sourceRecords: activitySourceRows, usableRecords: activity.length, sourceFields: 12 },
    '调动': { sourceRecords: transfers.length, usableRecords: transfers.length, sourceFields: 8 },
  },
  cleaning: {
    monthDownFills: monthFillCount,
    categoryDownFills: categoryFillCount,
    trimmedCategoryValues: trimmedCategoryCount,
    blankCategoryBeforeFill: blankCategoryCount,
    namesAndExactDatesDroppedFromAppData: true,
    downFillFields: ['月份', '类别'],
  },
  validation: {
    monthCount: sortedMonths.length,
    firstMonth: sortedMonths[0],
    lastMonth: sortedMonths.at(-1),
    categoryTotals,
    recentTwelveMonthTotals: recentTotals,
    transferStats,
  },
  rules: [
    '换签不计入部门调入、调出，单独统计。',
    '原部门与现部门不同，且不是换签、不是已离职，才计入部门流动。',
    '类别 trim 首尾空格，离职 空格归入离职。',
    '仅对月份、类别向下填充。',
    '异动事件按记录统计，不称为去重员工人数。',
  ],
}

if (process.argv.includes('--verify')) {
  const { verifyData } = await import('./verify-data.mjs')
  if (!verifyData({ activity, transfers, activitySourceRows, categories })) process.exit(1)
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.mkdirSync(path.dirname(logPath), { recursive: true })
fs.writeFileSync(outputPath, `${JSON.stringify({ categories, months: sortedMonths, activity, transfers, transferStats }, null, 2)}\n`, 'utf8')
fs.writeFileSync(logPath, `${JSON.stringify(log, null, 2)}\n`, 'utf8')

if (process.argv.includes('--verify')) {
  console.log('验收通过。页面数据与清洗日志已更新。')
} else {
  console.log(JSON.stringify({ activityRecords: activity.length, transferRecords: transfers.length, months: sortedMonths.length, categoryTotals, recentTwelveMonthTotals: recentTotals, transferStats }, null, 2))
}
