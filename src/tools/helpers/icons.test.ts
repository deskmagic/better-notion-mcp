import { unlinkSync, writeFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { NotionMCPError } from './errors'
import { formatIcon, resolveIcon } from './icons'

describe('formatIcon', () => {
  describe('emoji icons', () => {
    it('wraps a single emoji as emoji type', () => {
      expect(formatIcon('🚀')).toEqual({ type: 'emoji', emoji: '🚀' })
    })

    it('wraps a flag emoji as emoji type', () => {
      expect(formatIcon('🇩🇪')).toEqual({ type: 'emoji', emoji: '🇩🇪' })
    })

    it('wraps a simple text emoji', () => {
      expect(formatIcon('📋')).toEqual({ type: 'emoji', emoji: '📋' })
    })
  })

  describe('external URL icons', () => {
    it('wraps an https URL as external type', () => {
      expect(formatIcon('https://example.com/logo.png')).toEqual({
        type: 'external',
        external: { url: 'https://example.com/logo.png' }
      })
    })

    it('wraps an http URL as external type', () => {
      expect(formatIcon('http://example.com/icon.svg')).toEqual({
        type: 'external',
        external: { url: 'http://example.com/icon.svg' }
      })
    })

    it('wraps a complex URL with query parameters', () => {
      const url = 'https://example.com/path?query=val#hash'
      expect(formatIcon(url)).toEqual({
        type: 'external',
        external: { url }
      })
    })
  })

  describe('Notion built-in icon shorthand', () => {
    it('expands name:color to native Notion icon', () => {
      expect(formatIcon('document:gray')).toEqual({
        type: 'icon',
        icon: { name: 'document', color: 'gray' }
      })
    })

    it('expands with different colors', () => {
      expect(formatIcon('helm:blue')).toEqual({
        type: 'icon',
        icon: { name: 'helm', color: 'blue' }
      })
    })

    it('expands lightgray color', () => {
      expect(formatIcon('star:lightgray')).toEqual({
        type: 'icon',
        icon: { name: 'star', color: 'lightgray' }
      })
    })

    it('expands with orange color', () => {
      expect(formatIcon('fire:orange')).toEqual({
        type: 'icon',
        icon: { name: 'fire', color: 'orange' }
      })
    })

    it('does not treat a colon in a URL as icon shorthand', () => {
      expect(formatIcon('https://example.com/icon:blue.svg')).toEqual({
        type: 'external',
        external: { url: 'https://example.com/icon:blue.svg' }
      })
    })
  })

  describe('file_upload icons', () => {
    it('parses file_upload:uuid format', () => {
      expect(formatIcon('file_upload:a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toEqual({
        type: 'file_upload',
        file_upload: { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' }
      })
    })

    it('rejects file_upload: with invalid uuid', () => {
      expect(() => formatIcon('file_upload:not-a-uuid')).toThrow()
    })

    it('rejects file_upload: with empty id', () => {
      expect(() => formatIcon('file_upload:')).toThrow()
    })
  })

  describe('upload:/path icons', () => {
    it('returns upload_pending marker for upload:/path format', () => {
      expect(formatIcon('upload:/tmp/logo.png')).toEqual({
        type: 'upload_pending',
        path: '/tmp/logo.png'
      })
    })

    it('returns upload_pending marker for nested paths', () => {
      expect(formatIcon('upload:/Users/personal/images/icon.svg')).toEqual({
        type: 'upload_pending',
        path: '/Users/personal/images/icon.svg'
      })
    })

    it('rejects upload: with empty path', () => {
      expect(() => formatIcon('upload:')).toThrow()
    })

    it('rejects upload: with relative path', () => {
      expect(() => formatIcon('upload:relative/path.png')).toThrow()
    })
  })

  describe('invalid color shorthand', () => {
    it('rejects invalid color as unsafe URL scheme', () => {
      // 'magenta' is not a valid Notion color, so 'document:magenta' is not
      // recognized as shorthand. It then parses as a URL with 'document:' scheme,
      // which is not in the safe protocol list, so it throws NotionMCPError.
      expect(() => formatIcon('document:magenta')).toThrow(NotionMCPError)
    })
  })

  describe('empty string input', () => {
    it('throws NotionMCPError for empty string', () => {
      expect(() => formatIcon('')).toThrow(/Icon value must be a non-empty string/)
    })
  })

  describe('unsafe URL rejection', () => {
    it('rejects javascript: URLs', () => {
      expect(() => formatIcon('javascript:alert(1)')).toThrow(NotionMCPError)
    })

    it('rejects data: URLs', () => {
      expect(() => formatIcon('data:text/html,<script>alert(1)</script>')).toThrow(NotionMCPError)
    })

    it('rejects vbscript: URLs', () => {
      expect(() => formatIcon('vbscript:msgbox(1)')).toThrow(NotionMCPError)
    })

    it('rejects http URLs with whitespace', () => {
      expect(() => formatIcon('https://example.com/icon .png')).toThrow(NotionMCPError)
    })
  })

  describe('edge cases', () => {
    it('does not treat a leading colon as shorthand', () => {
      // ':blue' has colonIdx 0, which is < 1, so it falls through to emoji
      // then isSafeUrl(':blue') returns false because it's a relative URL with a colon
      expect(() => formatIcon(':blue')).toThrow(NotionMCPError)
    })

    it('treats a plain string as emoji', () => {
      expect(formatIcon('star')).toEqual({ type: 'emoji', emoji: 'star' })
    })

    it('handles multiple colons by taking the last part as color', () => {
      // Fork divergence: shorthand expands to a native Notion icon, not an external URL
      expect(formatIcon('brand:logo:blue')).toEqual({
        type: 'icon',
        icon: { name: 'brand:logo', color: 'blue' }
      })
    })

    it('handles safe non-HTTP protocols as emoji (falling through)', () => {
      expect(formatIcon('mailto:user@example.com')).toEqual({
        type: 'emoji',
        emoji: 'mailto:user@example.com'
      })
      expect(formatIcon('tel:+123456789')).toEqual({
        type: 'emoji',
        emoji: 'tel:+123456789'
      })
    })

    it('throws NotionMCPError for non-string input', () => {
      expect(() => formatIcon(123 as any)).toThrow(/Icon value must be a non-empty string/)
    })
  })
})

describe('resolveIcon', () => {
  it('passes through non-upload_pending icons unchanged', async () => {
    const icon = { type: 'emoji', emoji: '🚀' }
    const result = await resolveIcon(icon, {} as any)
    expect(result).toEqual(icon)
  })

  it('passes through file_upload icons unchanged', async () => {
    const icon = { type: 'file_upload', file_upload: { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' } }
    const result = await resolveIcon(icon, {} as any)
    expect(result).toEqual(icon)
  })

  it('passes through native icon objects unchanged', async () => {
    const icon = { type: 'icon', icon: { name: 'document', color: 'gray' } }
    const result = await resolveIcon(icon, {} as any)
    expect(result).toEqual(icon)
  })

  it('uploads file and returns file_upload icon for upload_pending', async () => {
    // Create a temp file for the test
    const testPath = '/tmp/test-logo-resolve-icon.png'
    writeFileSync(testPath, Buffer.from('fake-png-data'))

    try {
      const mockNotion = {
        fileUploads: {
          create: vi.fn().mockResolvedValue({ id: 'upload-abc-123', status: 'pending' }),
          send: vi.fn().mockResolvedValue({ status: 'uploaded' }),
          complete: vi.fn().mockResolvedValue({ status: 'uploaded' })
        }
      }

      const pendingIcon = { type: 'upload_pending', path: testPath }
      const result = await resolveIcon(pendingIcon, mockNotion as any)

      expect(result).toEqual({
        type: 'file_upload',
        file_upload: { id: 'upload-abc-123' }
      })
      expect(mockNotion.fileUploads.create).toHaveBeenCalled()
      expect(mockNotion.fileUploads.send).toHaveBeenCalled()
      expect(mockNotion.fileUploads.complete).toHaveBeenCalled()
    } finally {
      try {
        unlinkSync(testPath)
      } catch {}
    }
  })
})
