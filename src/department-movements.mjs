/** Attribute transfers to the same department rows used by the table and CSV. */
export function departmentMovements(transfers, selectedDepartment = '全部部门') {
  const counts = new Map()
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
