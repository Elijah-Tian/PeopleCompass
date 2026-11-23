type Movement = {
  fromDepartment: string
  toDepartment: string
  isSwap: boolean
  isDepartmentFlow: boolean
}
export function departmentMovements(transfers: Movement[], selectedDepartment?: string):
  Map<string, { movedIn: number; movedOut: number; swaps: number }>
