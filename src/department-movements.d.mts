type Movement = {
  fromDepartment: string
  toDepartment: string
  isSwap: boolean
  isDepartmentFlow: boolean
}
/**
 * 按部门汇总调动记录中的调入、调出与换签次数。
 * @param {Movement[]} transfers 调动记录。
 * @param {string} selectedDepartment 可选的部门筛选值。
 * @returns {Map<string, {movedIn: number, movedOut: number, swaps: number}>} 部门统计结果。
 */
export function departmentMovements(transfers: Movement[], selectedDepartment?: string):
  Map<string, { movedIn: number; movedOut: number; swaps: number }>
