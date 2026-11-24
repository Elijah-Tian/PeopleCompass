import processedData from './processed.json'

export type Activity = {
  month: string
  category: string
  location: string
  department: string
}

export type TransferStats = {
  total: number
  departmentFlows: number
  swaps: number
}

type MovementData = {
  categories: string[]
  months: string[]
  activity: Activity[]
  transferStats: TransferStats
}

/**
 * 判断输入是否为可读取字段的普通记录。
 * @param {unknown} value 待校验的数据。
 * @returns {boolean} 是否为记录对象。
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * 判断输入是否为文本。
 * @param {unknown} value 待校验的数据。
 * @returns {boolean} 是否为字符串。
 */
function isText(value: unknown): value is string {
  return typeof value === 'string'
}

/**
 * 判断输入是否为六位年月文本。
 * @param {unknown} value 待校验的数据。
 * @returns {boolean} 是否符合 YYYYMM 格式。
 */
function isMonth(value: unknown): value is string {
  return isText(value) && /^\d{6}$/.test(value)
}

/**
 * 判断输入是否为可用于异动统计的事件记录。
 * @param {unknown} value 待校验的数据。
 * @returns {boolean} 是否具备事件所需字段。
 */
function isActivity(value: unknown): value is Activity {
  return isRecord(value) && isMonth(value.month) && isText(value.category) &&
    isText(value.location) && isText(value.department)
}

/**
 * 判断输入是否为非负安全整数计数。
 * @param {unknown} value 待校验的数据。
 * @returns {boolean} 是否为有效计数。
 */
function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

/**
 * 判断输入是否为调动统计对象。
 * @param {unknown} value 待校验的数据。
 * @returns {boolean} 是否具备有效的调动计数。
 */
function isTransferStats(value: unknown): value is TransferStats {
  return isRecord(value) && isCount(value.total) &&
    isCount(value.departmentFlows) && isCount(value.swaps)
}

/**
 * 校验生成的页面数据并收窄为业务数据类型。
 * @param {unknown} value 从 JSON 读取的原始数据。
 * @returns {MovementData} 校验后的异动数据。
 */
function readMovementData(value: unknown): MovementData {
  if (!isRecord(value)) throw new Error('异动数据格式不正确')

  const { categories, months, activity, transferStats } = value
  if (!Array.isArray(categories) || !categories.every(isText)) {
    throw new Error('异动数据的类别格式不正确')
  }
  if (!Array.isArray(months) || !months.length || !months.every(isMonth)) {
    throw new Error('异动数据缺少有效月份')
  }
  if (!Array.isArray(activity) || !activity.every(isActivity)) {
    throw new Error('异动记录格式不正确')
  }
  if (!isTransferStats(transferStats)) {
    throw new Error('调动统计格式不正确')
  }

  return { categories, months, activity, transferStats }
}

export const movementData = readMovementData(processedData)
