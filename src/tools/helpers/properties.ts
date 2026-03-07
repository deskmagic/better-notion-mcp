/**
 * Property Helpers
 * Convert between human-friendly and Notion API formats
 */

import * as RichText from './richtext.js'

/**
 * Extract a Notion page ID from a URL or pass through a raw ID.
 * Handles formats:
 * - Raw 32-char hex: "abc123def456abc123def456abc123de"
 * - UUID with dashes: "abc123de-f456-abc1-23de-f456abc123de"
 * - Notion URL: "https://www.notion.so/Page-Title-abc123def456abc123def456abc123de"
 * - Notion URL with query params: "https://www.notion.so/abc123def456abc123def456abc123de?v=xyz"
 */
function extractPageId(value: string): string {
  // If it looks like a Notion URL, extract the 32-char hex ID from the end of the path
  if (value.startsWith('https://') || value.startsWith('http://')) {
    const url = new URL(value)
    const path = url.pathname
    // The page ID is the last 32 hex chars in the path (possibly preceded by a dash after the title)
    const match = path.match(/([a-f0-9]{32})$/i)
    if (match) {
      const hex = match[1]
      // Format as UUID: 8-4-4-4-12
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
    }
  }
  // Already a page ID (with or without dashes)
  return value
}

/**
 * Convert a string or array value to Notion relation format.
 * Accepts page IDs, Notion URLs, or JSON array strings.
 */
function convertToRelation(value: string | string[]): { relation: { id: string }[] } {
  if (typeof value === 'string') {
    // Try parsing as JSON array first (e.g. '["id1","id2"]')
    if (value.startsWith('[')) {
      try {
        const parsed = JSON.parse(value)
        if (Array.isArray(parsed)) {
          const relation = new Array(parsed.length)
          for (let i = 0; i < parsed.length; i++) {
            relation[i] = { id: extractPageId(String(parsed[i])) }
          }
          return { relation }
        }
      } catch {
        // Not valid JSON, treat as single ID
      }
    }
    return { relation: [{ id: extractPageId(value) }] }
  }

  // Array of strings
  const relation = new Array(value.length)
  for (let i = 0; i < value.length; i++) {
    relation[i] = { id: extractPageId(value[i]) }
  }
  return { relation }
}

/**
 * Convert simple property values to Notion API format
 * Handles auto-detection of property types and conversion
 */
export function convertToNotionProperties(
  properties: Record<string, any>,
  schema?: Record<string, string>
): Record<string, any> {
  const converted: Record<string, any> = {}

  const keys = Object.keys(properties)
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const value = properties[key]

    if (value === null || value === undefined) {
      converted[key] = value
      continue
    }

    // Auto-detect property type and convert
    if (typeof value === 'string') {
      // Use schema type if available
      const schemaType = schema?.[key]

      if (schemaType === 'title') {
        converted[key] = { title: [RichText.text(value)] }
      } else if (schemaType === 'rich_text') {
        converted[key] = { rich_text: [RichText.text(value)] }
      } else if (schemaType === 'date') {
        converted[key] = { date: { start: value } }
      } else if (schemaType === 'url') {
        converted[key] = { url: value }
      } else if (schemaType === 'email') {
        converted[key] = { email: value }
      } else if (schemaType === 'phone_number') {
        converted[key] = { phone_number: value }
      } else if (schemaType === 'relation') {
        converted[key] = convertToRelation(value)
      } else if (key === 'Name' || key === 'Title' || key.toLowerCase() === 'title') {
        // Fallback: guess title from key name
        converted[key] = { title: [RichText.text(value)] }
      } else {
        // Fallback: default to select
        converted[key] = { select: { name: value } }
      }
    } else if (typeof value === 'number') {
      converted[key] = { number: value }
    } else if (typeof value === 'boolean') {
      converted[key] = { checkbox: value }
    } else if (Array.isArray(value)) {
      // Use schema type if available for arrays
      const schemaType = schema?.[key]
      if (schemaType === 'relation') {
        converted[key] = convertToRelation(value)
        continue
      }
      // Could be multi_select, relation, people, files
      // Only assume multi_select if all elements are strings
      if (value.length > 0 && value.every((v) => typeof v === 'string')) {
        const multiSelect = new Array(value.length)
        for (let j = 0; j < value.length; j++) {
          multiSelect[j] = { name: value[j] }
        }
        converted[key] = {
          multi_select: multiSelect
        }
      } else {
        converted[key] = value
      }
    } else if (typeof value === 'object') {
      // Already in Notion format or date/complex object
      converted[key] = value
    } else {
      converted[key] = value
    }
  }

  return converted
}

/**
 * Highly optimized extraction of properties from a Notion page response.
 * Uses direct string building and fixed-length arrays to avoid
 * creating thousands of intermediate arrays during large `.map()` chains.
 */
export function extractPageProperties(pageProperties: any): any {
  const properties: any = {}

  const keys = Object.keys(pageProperties)
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const p = pageProperties[key] as any

    if (p.type === 'title' && p.title) {
      let str = ''
      for (let j = 0; j < p.title.length; j++) str += p.title[j].plain_text || ''
      properties[key] = str
    } else if (p.type === 'rich_text' && p.rich_text) {
      let str = ''
      for (let j = 0; j < p.rich_text.length; j++) str += p.rich_text[j].plain_text || ''
      properties[key] = str
    } else if (p.type === 'select' && p.select) {
      properties[key] = p.select.name
    } else if (p.type === 'multi_select' && p.multi_select) {
      const arr = new Array(p.multi_select.length)
      for (let j = 0; j < p.multi_select.length; j++) arr[j] = p.multi_select[j].name
      properties[key] = arr
    } else if (p.type === 'number') {
      properties[key] = p.number
    } else if (p.type === 'checkbox') {
      properties[key] = p.checkbox
    } else if (p.type === 'url') {
      properties[key] = p.url
    } else if (p.type === 'email') {
      properties[key] = p.email
    } else if (p.type === 'phone_number') {
      properties[key] = p.phone_number
    } else if (p.type === 'date' && p.date) {
      properties[key] = p.date.start + (p.date.end ? ` to ${p.date.end}` : '')
    } else if (p.type === 'relation' && p.relation) {
      const arr = new Array(p.relation.length)
      for (let j = 0; j < p.relation.length; j++) arr[j] = p.relation[j].id
      properties[key] = arr
    } else if (p.type === 'rollup' && p.rollup) {
      properties[key] = p.rollup
    } else if (p.type === 'people' && p.people) {
      const arr = new Array(p.people.length)
      for (let j = 0; j < p.people.length; j++) arr[j] = p.people[j].name || p.people[j].id
      properties[key] = arr
    } else if (p.type === 'files' && p.files) {
      const arr = new Array(p.files.length)
      for (let j = 0; j < p.files.length; j++)
        arr[j] = p.files[j].file?.url || p.files[j].external?.url || p.files[j].name
      properties[key] = arr
    } else if (p.type === 'formula' && p.formula) {
      properties[key] = p.formula[p.formula.type]
    } else if (p.type === 'created_time') {
      properties[key] = p.created_time
    } else if (p.type === 'last_edited_time') {
      properties[key] = p.last_edited_time
    } else if (p.type === 'created_by' && p.created_by) {
      properties[key] = p.created_by.name || p.created_by.id
    } else if (p.type === 'last_edited_by' && p.last_edited_by) {
      properties[key] = p.last_edited_by.name || p.last_edited_by.id
    } else if (p.type === 'status' && p.status) {
      properties[key] = p.status.name
    } else if (p.type === 'unique_id' && p.unique_id) {
      properties[key] = p.unique_id.prefix ? `${p.unique_id.prefix}-${p.unique_id.number}` : p.unique_id.number
    }
  }
  return properties
}
