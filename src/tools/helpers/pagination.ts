/**
 * Pagination Helper
 * Auto-handles paginated Notion API responses
 */

/** Safety limit to prevent infinite loops if API always returns has_more: true */
const MAX_PAGES_SAFETY = 1000

export interface PaginatedResponse<T> {
  results: T[]
  next_cursor: string | null
  has_more: boolean
}

export interface PaginationOptions {
  maxPages?: number // Max pages to fetch (0 = unlimited, capped by MAX_PAGES_SAFETY)
  pageSize?: number // Items per page (default: 100)
}

/**
 * Fetch all pages automatically
 */
export async function autoPaginate<T>(
  fetchFn: (cursor?: string, pageSize?: number) => Promise<PaginatedResponse<T>>,
  options: PaginationOptions = {}
): Promise<T[]> {
  const { maxPages = 0, pageSize = 100 } = options
  const effectiveMax = maxPages > 0 ? Math.min(maxPages, MAX_PAGES_SAFETY) : MAX_PAGES_SAFETY
  const allResults: T[] = []
  let cursor: string | null = null
  let pageCount = 0

  do {
    const response = await fetchFn(cursor || undefined, pageSize)
    allResults.push(...response.results)
    cursor = response.next_cursor
    pageCount++

    // Stop if max pages reached (user-specified or safety limit)
    if (pageCount >= effectiveMax) {
      break
    }
  } while (cursor !== null)

  return allResults
}

/**
 * Batch items into chunks
 */
export function batchItems<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = []
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize))
  }
  return batches
}

/**
 * Process items in batches with concurrency limit
 * Optimized to avoid intermediate array allocations (.slice, .map, .flat)
 */
export async function processBatches<T, R>(
  items: T[],
  processFn: (item: T) => Promise<R>,
  options: { batchSize?: number; concurrency?: number } = {}
): Promise<R[]> {
  const { batchSize = 10, concurrency = 3 } = options
  const results: R[] = new Array(items.length)
  let resultIndex = 0

  const itemsLength = items.length
  for (let i = 0; i < itemsLength; i += batchSize * concurrency) {
    const endConcurrent = Math.min(i + batchSize * concurrency, itemsLength)
    const currentBatchesCount = Math.ceil((endConcurrent - i) / batchSize)

    const batchPromises = new Array(currentBatchesCount)
    for (let j = 0; j < currentBatchesCount; j++) {
      const batchStart = i + j * batchSize
      const batchEnd = Math.min(batchStart + batchSize, itemsLength)
      const batchLength = batchEnd - batchStart

      const itemPromises = new Array(batchLength)
      for (let k = 0; k < batchLength; k++) {
        itemPromises[k] = processFn(items[batchStart + k])
      }
      batchPromises[j] = Promise.all(itemPromises)
    }

    const batchResults = await Promise.all(batchPromises)

    for (let j = 0; j < batchResults.length; j++) {
      const batchResult = batchResults[j]
      for (let k = 0; k < batchResult.length; k++) {
        results[resultIndex++] = batchResult[k]
      }
    }
  }

  return results
}
