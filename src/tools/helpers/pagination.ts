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
 */
export async function processBatches<T, R>(
  items: T[],
  processFn: (item: T) => Promise<R>,
  options: { batchSize?: number; concurrency?: number } = {}
): Promise<R[]> {
  const { batchSize = 10, concurrency = 3 } = options

  // Pre-allocate the results array to avoid resizing during pushes
  const results: R[] = new Array(items.length)
  let resultIndex = 0

  // Iterate over items directly, creating batches dynamically without intermediate array allocations
  for (let i = 0; i < items.length; i += batchSize * concurrency) {
    const batchPromises = []

    // Create concurrent batches
    for (let c = 0; c < concurrency; c++) {
      const startIndex = i + c * batchSize
      if (startIndex >= items.length) break
      const endIndex = Math.min(startIndex + batchSize, items.length)

      // Pre-allocate chunk promises to avoid map/push overhead
      const chunkPromises = new Array(endIndex - startIndex)
      for (let k = startIndex; k < endIndex; k++) {
        chunkPromises[k - startIndex] = processFn(items[k])
      }
      batchPromises.push(Promise.all(chunkPromises))
    }

    const chunkResults = await Promise.all(batchPromises)

    // Unpack results into the pre-allocated results array
    for (let c = 0; c < chunkResults.length; c++) {
      const chunk = chunkResults[c]
      for (let k = 0; k < chunk.length; k++) {
        results[resultIndex++] = chunk[k]
      }
    }
  }

  return results
}
