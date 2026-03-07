import { describe, expect, it } from 'vitest'
import { convertToNotionProperties } from './properties'

const richText = (content: string) => ({
  type: 'text',
  text: { content, link: null },
  annotations: {
    bold: false,
    italic: false,
    strikethrough: false,
    underline: false,
    code: false,
    color: 'default'
  }
})

describe('convertToNotionProperties', () => {
  it('returns empty object for empty properties', () => {
    expect(convertToNotionProperties({})).toEqual({})
  })

  describe('null and undefined values', () => {
    it('passes null through as-is', () => {
      const result = convertToNotionProperties({ field: null })
      expect(result).toEqual({ field: null })
    })

    it('passes undefined through as-is', () => {
      const result = convertToNotionProperties({ field: undefined })
      expect(result).toEqual({ field: undefined })
    })
  })

  describe('string values with schema', () => {
    it('converts title schema type', () => {
      const result = convertToNotionProperties({ Name: 'Hello' }, { Name: 'title' })
      expect(result).toEqual({
        Name: { title: [richText('Hello')] }
      })
    })

    it('converts rich_text schema type', () => {
      const result = convertToNotionProperties({ Description: 'Some text' }, { Description: 'rich_text' })
      expect(result).toEqual({
        Description: { rich_text: [richText('Some text')] }
      })
    })

    it('converts date schema type', () => {
      const result = convertToNotionProperties({ Due: '2025-01-15' }, { Due: 'date' })
      expect(result).toEqual({
        Due: { date: { start: '2025-01-15' } }
      })
    })

    it('converts url schema type', () => {
      const result = convertToNotionProperties({ Website: 'https://example.com' }, { Website: 'url' })
      expect(result).toEqual({
        Website: { url: 'https://example.com' }
      })
    })

    it('converts email schema type', () => {
      const result = convertToNotionProperties({ Email: 'test@example.com' }, { Email: 'email' })
      expect(result).toEqual({
        Email: { email: 'test@example.com' }
      })
    })

    it('converts phone_number schema type', () => {
      const result = convertToNotionProperties({ Phone: '+1234567890' }, { Phone: 'phone_number' })
      expect(result).toEqual({
        Phone: { phone_number: '+1234567890' }
      })
    })
  })

  describe('string values without schema (auto-detect)', () => {
    it('detects "Name" key as title', () => {
      const result = convertToNotionProperties({ Name: 'My Page' })
      expect(result).toEqual({
        Name: { title: [richText('My Page')] }
      })
    })

    it('detects "Title" key as title', () => {
      const result = convertToNotionProperties({ Title: 'My Page' })
      expect(result).toEqual({
        Title: { title: [richText('My Page')] }
      })
    })

    it('detects lowercase "title" key as title', () => {
      const result = convertToNotionProperties({ title: 'My Page' })
      expect(result).toEqual({
        title: { title: [richText('My Page')] }
      })
    })

    it('falls back to select for other string keys', () => {
      const result = convertToNotionProperties({ Status: 'Active' })
      expect(result).toEqual({
        Status: { select: { name: 'Active' } }
      })
    })
  })

  describe('number values', () => {
    it('converts number to Notion number format', () => {
      const result = convertToNotionProperties({ Price: 42 })
      expect(result).toEqual({
        Price: { number: 42 }
      })
    })

    it('converts zero', () => {
      const result = convertToNotionProperties({ Count: 0 })
      expect(result).toEqual({
        Count: { number: 0 }
      })
    })

    it('converts negative numbers', () => {
      const result = convertToNotionProperties({ Balance: -100.5 })
      expect(result).toEqual({
        Balance: { number: -100.5 }
      })
    })
  })

  describe('boolean values', () => {
    it('converts true to checkbox', () => {
      const result = convertToNotionProperties({ Done: true })
      expect(result).toEqual({
        Done: { checkbox: true }
      })
    })

    it('converts false to checkbox', () => {
      const result = convertToNotionProperties({ Done: false })
      expect(result).toEqual({
        Done: { checkbox: false }
      })
    })
  })

  describe('array values', () => {
    it('converts array of strings to multi_select', () => {
      const result = convertToNotionProperties({ Tags: ['frontend', 'react', 'typescript'] })
      expect(result).toEqual({
        Tags: {
          multi_select: [{ name: 'frontend' }, { name: 'react' }, { name: 'typescript' }]
        }
      })
    })

    it('passes array of objects through as-is', () => {
      const relations = [{ id: 'abc-123' }, { id: 'def-456' }]
      const result = convertToNotionProperties({ Related: relations })
      expect(result).toEqual({
        Related: relations
      })
    })

    it('passes empty array through as-is', () => {
      const result = convertToNotionProperties({ Items: [] })
      expect(result).toEqual({
        Items: []
      })
    })

    describe('mixed type arrays', () => {
      it('passes mixed array starting with string through as-is', () => {
        const mixed = ['tag', 123]
        const result = convertToNotionProperties({ Mixed: mixed })
        expect(result).toEqual({
          Mixed: mixed
        })
      })

      it('passes mixed array starting with number through as-is', () => {
        const mixed = [123, 'tag']
        const result = convertToNotionProperties({ Mixed: mixed })
        expect(result).toEqual({
          Mixed: mixed
        })
      })
    })
  })

  describe('object values', () => {
    it('passes objects through as-is (already in Notion format)', () => {
      const notionDate = { date: { start: '2025-01-01', end: '2025-01-31' } }
      const result = convertToNotionProperties({ Period: notionDate })
      expect(result).toEqual({
        Period: notionDate
      })
    })

    it('passes complex nested objects through as-is', () => {
      const formula = { formula: { expression: 'prop("Price") * 1.1' } }
      const result = convertToNotionProperties({ Total: formula })
      expect(result).toEqual({
        Total: formula
      })
    })
  })

  describe('relation values with schema', () => {
    it('converts a single page ID string to relation format', () => {
      const result = convertToNotionProperties({ Parent: 'abc123def456' }, { Parent: 'relation' })
      expect(result).toEqual({
        Parent: { relation: [{ id: 'abc123def456' }] }
      })
    })

    it('converts a Notion URL string to relation format (extracts page ID)', () => {
      const result = convertToNotionProperties(
        { Parent: 'https://www.notion.so/My-Page-abc123def456abc123def456abc123de' },
        { Parent: 'relation' }
      )
      expect(result).toEqual({
        Parent: { relation: [{ id: 'abc123de-f456-abc1-23de-f456abc123de' }] }
      })
    })

    it('converts a Notion URL with query params to relation format', () => {
      const result = convertToNotionProperties(
        { Parent: 'https://www.notion.so/abc123def456abc123def456abc123de?v=xyz' },
        { Parent: 'relation' }
      )
      expect(result).toEqual({
        Parent: { relation: [{ id: 'abc123de-f456-abc1-23de-f456abc123de' }] }
      })
    })

    it('converts an array of page ID strings to relation format', () => {
      const result = convertToNotionProperties({ Related: ['abc-123', 'def-456'] }, { Related: 'relation' })
      expect(result).toEqual({
        Related: { relation: [{ id: 'abc-123' }, { id: 'def-456' }] }
      })
    })

    it('converts an array of Notion URLs to relation format', () => {
      const result = convertToNotionProperties(
        {
          Related: [
            'https://www.notion.so/Page-A-abc123def456abc123def456abc123de',
            'https://www.notion.so/Page-B-def456abc123def456abc123def456ab'
          ]
        },
        { Related: 'relation' }
      )
      expect(result).toEqual({
        Related: {
          relation: [{ id: 'abc123de-f456-abc1-23de-f456abc123de' }, { id: 'def456ab-c123-def4-56ab-c123def456ab' }]
        }
      })
    })

    it('converts a JSON array string to relation format', () => {
      const result = convertToNotionProperties({ Related: '["abc-123","def-456"]' }, { Related: 'relation' })
      expect(result).toEqual({
        Related: { relation: [{ id: 'abc-123' }, { id: 'def-456' }] }
      })
    })

    it('converts a UUID-formatted page ID to relation format', () => {
      const result = convertToNotionProperties(
        { Parent: 'abc123de-f456-abc1-23de-f456abc123de' },
        { Parent: 'relation' }
      )
      expect(result).toEqual({
        Parent: { relation: [{ id: 'abc123de-f456-abc1-23de-f456abc123de' }] }
      })
    })

    it('handles empty array for relation schema type', () => {
      const result = convertToNotionProperties({ Related: [] }, { Related: 'relation' })
      expect(result).toEqual({
        Related: { relation: [] }
      })
    })
  })

  describe('mixed properties with schema', () => {
    it('converts multiple property types in a single call', () => {
      const properties = {
        Name: 'Project Alpha',
        Description: 'A cool project',
        Priority: 'High',
        Score: 95,
        Active: true,
        Tags: ['urgent', 'review'],
        Due: '2025-06-01',
        Parent: 'page-id-123',
        Metadata: { custom: true },
        Notes: null
      }
      const schema: Record<string, string> = {
        Name: 'title',
        Description: 'rich_text',
        Due: 'date',
        Parent: 'relation'
      }

      const result = convertToNotionProperties(properties, schema)

      expect(result).toEqual({
        Name: { title: [richText('Project Alpha')] },
        Description: { rich_text: [richText('A cool project')] },
        Priority: { select: { name: 'High' } },
        Score: { number: 95 },
        Active: { checkbox: true },
        Tags: { multi_select: [{ name: 'urgent' }, { name: 'review' }] },
        Due: { date: { start: '2025-06-01' } },
        Parent: { relation: [{ id: 'page-id-123' }] },
        Metadata: { custom: true },
        Notes: null
      })
    })
  })
})
