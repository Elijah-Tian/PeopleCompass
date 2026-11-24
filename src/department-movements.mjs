/**
 * 按部门汇总调入、调出及单独统计的换签记录。
 * @param {Array<{fromDepartment: string, toDepartment: string, isSwap: boolean, isDepartmentFlow: boolean}>} transfers 调动记录。
 * @param {string} selectedDepartment 需要展示的部门。
 * @returns {Map<string, {movedIn: number, movedOut: number, swaps: number}>} 部门统计结果。
 */
export function departmentMovements(transfers, selectedDepartment = '全部部门') {
  const counts = new Map()
  /**
   * 将一条调动计入指定部门的统计字段。
   * @param {string} name 部门名称。
   * @param {'movedIn' | 'movedOut' | 'swaps'} field 对应的统计字段。
   */
  function add(name, field) {
    if (selectedDepartment !== '全部部门' && selectedDepartment !== name) return
    const row = counts.get(name) ?? { movedIn: 0, movedOut: 0, swaps: 0 }
    row[field] += 1
    counts.set(name, row)
  }
  for (const transfer of transfers) {
    if (transfer.isSwap) {
      add(transfer.toDepartment, 'swaps')
    } else if (transfer.isDepartmentFlow) {
      add(transfer.fromDepartment, 'movedOut')
      add(transfer.toDepartment, 'movedIn')
    }
  }
  return counts
}
