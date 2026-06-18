import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { InternalAxiosRequestConfig } from 'axios'
import apiClient from '../client'

describe('apiClient', () => {
  const originalAdapter = apiClient.defaults.adapter
  const originalHref = window.location.href

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter
    window.location.href = originalHref
  })

  function mockAdapter(status: number, data: unknown) {
    apiClient.defaults.adapter = (config: InternalAxiosRequestConfig) => {
      if (status >= 400) {
        return Promise.reject({
          response: { status, data, config },
          config,
          isAxiosError: true,
        })
      }
      return Promise.resolve({
        data,
        status,
        statusText: 'OK',
        headers: {},
        config,
      })
    }
  }

  it('does not redirect on 401', async () => {
    mockAdapter(401, { error: 'Unauthorized' })
    const hrefBefore = window.location.href

    await expect(apiClient.get('/auth/me')).rejects.toMatchObject({
      response: { status: 401 },
    })
    expect(window.location.href).toBe(hrefBefore)
  })

  it('rejects non-401 errors', async () => {
    mockAdapter(500, { error: 'Server error' })

    await expect(apiClient.get('/groups')).rejects.toMatchObject({
      response: { status: 500 },
    })
  })

  it('passes through successful responses', async () => {
    mockAdapter(200, null)

    const res = await apiClient.get('/auth/me')

    expect(res.status).toBe(200)
    expect(res.data).toBeNull()
  })
})
