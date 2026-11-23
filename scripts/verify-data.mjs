import { readFileSync } from 'node:fs'
import { departmentMovements } from '../src/department-movements.mjs'

const baseline = JSON.parse(readFileSync(new URL('../data/verification-baseline.json', import.meta.url), 'utf8'))

export function verifyData({ activity, transfers, activitySourceRows, categories }) {
  let failures = 0
  function check(label, expected, actual) {
    const passed = expected === actual
    console.log(`${passed ? '✓' : '✗'} ${label}  预期 ${expected}，实际 ${actual}`)
    if (!passed) failures++
  }

  const { firstMonth, lastMonth, recentStart } = baseline
  const inBaseline = row => row.month >= firstMonth && row.month <= lastMonth
  const history = activity.filter(inBaseline)
  const recent = history.filter(row => row.month >= recentStart)
  const historicalTransfers = transfers.filter(inBaseline)
  const months = [...new Set(history.map(row => row.month))].sort()
  console.log(`\n历史对账  ${firstMonth} 至 ${lastMonth}`)
  check('入转离记录', baseline.activityRecords, history.length)
  check('调动记录', baseline.transferRecords, historicalTransfers.length)
  check('首月', firstMonth, months[0])
  check('末月', lastMonth, months.at(-1))
  check('覆盖月份数', baseline.monthCount, months.length)
  for (const [category, [allCount, recentCount]] of Object.entries(baseline.categories)) {
    check(`历史 · ${category}`, allCount, history.filter(row => row.category === category).length)
    check(`${recentStart}–${lastMonth} · ${category}`, recentCount, recent.filter(row => row.category === category).length)
  }

  function checkMovements(rows, expectedFlows, expectedSwaps) {
    check('符合部门流动规则的记录', expectedFlows, rows.filter(row => row.isDepartmentFlow).length)
    const departments = [...departmentMovements(rows).values()]
    const total = field => departments.reduce((sum, row) => sum + row[field], 0)
    check('部门明细 · 调入合计', expectedFlows, total('movedIn'))
    check('部门明细 · 调出合计', expectedFlows, total('movedOut'))
    check('部门明细 · 换签合计', expectedSwaps, total('swaps'))
  }
  check('换签记录', baseline.swaps, historicalTransfers.filter(row => row.isSwap).length)
  checkMovements(historicalTransfers, baseline.departmentFlows, baseline.swaps)

  console.log(`\n全量规则（含新增月份）  入转离 ${activity.length} 条，调动 ${transfers.length} 条`)
  check('读取的入转离记录全部进入统计', activitySourceRows, activity.length)
  const invalidMonth = row => !/^\d{4}(0[1-9]|1[0-2])$/.test(row.month)
  check('无效月份记录', 0, [...activity, ...transfers].filter(invalidMonth).length)
  check('未纳入指标卡的类别记录', 0, activity.filter(row => !categories.includes(row.category)).length)
  const eligible = row => Boolean(row.fromDepartment && row.toDepartment &&
    row.fromDepartment !== row.toDepartment && !row.isSwap && !row.isLeft)
  check('部门流动分类错误记录', 0, transfers.filter(row => row.isDepartmentFlow !== eligible(row)).length)
  checkMovements(transfers, transfers.filter(eligible).length, transfers.filter(row => row.isSwap).length)
  if (failures) console.error(`验收失败，共 ${failures} 项差异。本次未写入页面数据和清洗日志。`)
  return failures === 0
}
