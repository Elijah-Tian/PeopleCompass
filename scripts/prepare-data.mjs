import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ExcelJS from 'exceljs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourcePath = path.join(root, '每月人员异动表202610.xlsx')
const outputPath = path.join(root, 'src/data/processed.json')
const logPath = path.join(root, 'data/cleaning-log.json')
const categories = ['入职', '离职', '转正', '满3个月', '阶段性', '签订合同', '签劳动合同', '满3个月/签订合同']
const cellText = (value) => {
  if (value && typeof value === 'object' && Array.isArray(value.richText)) return value.richText.map((part) => part.text).join('')
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

// Header is on row 2. Only required values are copied; the source workbook remains unchanged.
for (let rowNumber = 3; rowNumber <= activitySheet.rowCount; rowNumber += 1) {
  const row = activitySheet.getRow(rowNumber)
  if (Array.from({ length: 12 }, (_, index) => row.getCell(index + 1).value).every((value) => value === null || value === undefined || value === '')) continue
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
  if (Array.from({ length: 8 }, (_, index) => row.getCell(index + 1).value).every((value) => value === null || value === undefined || value === '')) continue
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

const monthSet = new Set(activity.map((item) => item.month))
const sortedMonths = [...monthSet].sort()
const categoryTotals = Object.fromEntries(categories.map((name) => [name, 0]))
const recentTotals = Object.fromEntries(categories.map((name) => [name, 0]))
for (const item of activity) {
  categoryTotals[item.category] = (categoryTotals[item.category] ?? 0) + 1
  if (item.month >= '202511' && item.month <= '202610') recentTotals[item.category] = (recentTotals[item.category] ?? 0) + 1
}

const transferStats = {
  total: transfers.length,
  swaps: transfers.filter((item) => item.isSwap).length,
  departmentFlows: transfers.filter((item) => item.isDepartmentFlow).length,
  departedExcluded: transfers.filter((item) => item.isLeft).length,
  sameDepartmentExcluded: transfers.filter((item) => !item.isSwap && !item.isLeft && item.fromDepartment === item.toDepartment).length,
  invalidMonth: transfers.filter((item) => !item.month).length,
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
