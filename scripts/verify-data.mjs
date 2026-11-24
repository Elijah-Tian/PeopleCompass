import { readFileSync } from 'node:fs'
import { departmentMovements } from '../src/department-movements.mjs'

const baseline = JSON.parse(readFileSync(new URL('../data/verification-baseline.json', import.meta.url), 'utf8'))

/**
 * 将清洗后的异动与调动数据和历史基准、全量规则逐项对账。
 * @param {{activity: object[], transfers: object[], activitySourceRows: number, categories: string[]}} data 待核对的数据。
 * @returns {boolean} 所有对账项是否通过。
 */
export function verifyData({ activity, transfers, activitySourceRows, categories }) {
  let failures = 0
  /**
   * 输出单项对账的预期值与实际值并累计差异。
   * @param {string} label 对账项名称。
   * @param {string | number} expected 历史基准或规则的预期值。
   * @param {string | number} actual 清洗结果中的实际值。
   */
  function check(label, expected, actual) {
    const passed = expected === actual
    console.log(`${passed ? '✓' : '✗'} ${label}  预期 ${expected}，实际 ${actual}`)
    if (!passed) failures++
  }

  const { firstMonth, lastMonth, recentStart } = baseline
  /**
   * 判断记录是否处于历史基准的月份范围内。
   * @param {{month: string}} row 异动或调动记录。
   * @returns {boolean} 是否纳入历史对账。
   */
  const inBaseline = row => row.month >= firstMonth && row.month <= lastMonth
  const history = activity.filter(inBaseline)
  const recent = history.filter(
    /**
     * 判断历史记录是否属于近十二个月。
     * @param {{month: string}} row 异动记录。
     * @returns {boolean} 是否纳入近期基准。
     */
    row => row.month >= recentStart,
  )
  const historicalTransfers = transfers.filter(inBaseline)
  const months = [...new Set(history.map(
    /**
     * 提取历史记录月份以核对覆盖范围。
     * @param {{month: string}} row 异动记录。
     * @returns {string} 记录月份。
     */
    row => row.month,
  ))].sort()
  console.log(`\n历史对账  ${firstMonth} 至 ${lastMonth}`)
  check('入转离记录', baseline.activityRecords, history.length)
  check('调动记录', baseline.transferRecords, historicalTransfers.length)
  check('首月', firstMonth, months[0])
  check('末月', lastMonth, months.at(-1))
  check('覆盖月份数', baseline.monthCount, months.length)
  for (const [category, [allCount, recentCount]] of Object.entries(baseline.categories)) {
    check(`历史 · ${category}`, allCount, history.filter(
      /**
       * 识别当前类别的历史记录。
       * @param {{category: string}} row 异动记录。
       * @returns {boolean} 类别是否一致。
       */
      row => row.category === category,
    ).length)
    check(`${recentStart}–${lastMonth} · ${category}`, recentCount, recent.filter(
      /**
       * 识别当前类别的近期记录。
       * @param {{category: string}} row 异动记录。
       * @returns {boolean} 类别是否一致。
       */
      row => row.category === category,
    ).length)
  }

  /**
   * 核对部门调入、调出与换签合计。
   * @param {object[]} rows 待核对的调动记录。
   * @param {number} expectedFlows 预期部门流动次数。
   * @param {number} expectedSwaps 预期换签次数。
   */
  function checkMovements(rows, expectedFlows, expectedSwaps) {
    check('符合部门流动规则的记录', expectedFlows, rows.filter(
      /**
       * 识别纳入部门流动的记录。
       * @param {{isDepartmentFlow: boolean}} row 调动记录。
       * @returns {boolean} 是否为部门流动。
       */
      row => row.isDepartmentFlow,
    ).length)
    const departments = [...departmentMovements(rows).values()]
    /**
     * 合计各部门同一统计字段的次数。
     * @param {'movedIn' | 'movedOut' | 'swaps'} field 部门统计字段。
     * @returns {number} 全部部门的合计次数。
     */
    const total = field => departments.reduce(
      /**
       * 累计一个部门的指定流动次数。
       * @param {number} sum 当前累计次数。
       * @param {{movedIn: number, movedOut: number, swaps: number}} row 部门统计行。
       * @returns {number} 更新后的累计次数。
       */
      (sum, row) => sum + row[field],
      0,
    )
    check('部门明细 · 调入合计', expectedFlows, total('movedIn'))
    check('部门明细 · 调出合计', expectedFlows, total('movedOut'))
    check('部门明细 · 换签合计', expectedSwaps, total('swaps'))
  }
  check('换签记录', baseline.swaps, historicalTransfers.filter(
    /**
     * 识别历史基准中的换签记录。
     * @param {{isSwap: boolean}} row 调动记录。
     * @returns {boolean} 是否为换签。
     */
    row => row.isSwap,
  ).length)
  checkMovements(historicalTransfers, baseline.departmentFlows, baseline.swaps)

  console.log(`\n全量规则（含新增月份）  入转离 ${activity.length} 条，调动 ${transfers.length} 条`)
  check('读取的入转离记录全部进入统计', activitySourceRows, activity.length)
  /**
   * 识别不符合 YYYYMM 规则的月份。
   * @param {{month: string}} row 异动或调动记录。
   * @returns {boolean} 月份是否无效。
   */
  const invalidMonth = row => !/^\d{4}(0[1-9]|1[0-2])$/.test(row.month)
  check('无效月份记录', 0, [...activity, ...transfers].filter(invalidMonth).length)
  check('未纳入指标卡的类别记录', 0, activity.filter(
    /**
     * 识别不属于已确认类别的异动记录。
     * @param {{category: string}} row 异动记录。
     * @returns {boolean} 类别是否缺少定义。
     */
    row => !categories.includes(row.category),
  ).length)
  /**
   * 根据原部门、现部门与排除项判断是否应计入部门流动。
   * @param {{fromDepartment: string, toDepartment: string, isSwap: boolean, isLeft: boolean}} row 调动记录。
   * @returns {boolean} 是否符合部门流动口径。
   */
  const eligible = row => Boolean(row.fromDepartment && row.toDepartment &&
    row.fromDepartment !== row.toDepartment && !row.isSwap && !row.isLeft)
  check('部门流动分类错误记录', 0, transfers.filter(
    /**
     * 识别清洗结果与部门流动口径不一致的记录。
     * @param {{isDepartmentFlow: boolean}} row 调动记录。
     * @returns {boolean} 分类是否存在差异。
     */
    row => row.isDepartmentFlow !== eligible(row),
  ).length)
  checkMovements(transfers, transfers.filter(eligible).length, transfers.filter(
    /**
     * 识别全量调动数据中的换签记录。
     * @param {{isSwap: boolean}} row 调动记录。
     * @returns {boolean} 是否为换签。
     */
    row => row.isSwap,
  ).length)
  if (failures) console.error(`验收失败，共 ${failures} 项差异。本次未写入页面数据和清洗日志。`)
  return failures === 0
}
