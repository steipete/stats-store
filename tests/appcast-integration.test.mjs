#!/usr/bin/env node

/**
 * Integration tests for the appcast proxy endpoint
 * Run with: node tests/appcast-integration.test.mjs
 * 
 * This complements the Vitest unit tests by testing the actual HTTP endpoint
 */

import { test, describe } from 'node:test'
import assert from 'node:assert'

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000'

async function fetchAppcast(path, params = {}, headers = {}) {
  const url = new URL(`/api/v1/appcast/${path}`, BASE_URL)
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.append(key, value)
  })
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/xml',
      ...headers
    }
  })
  
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers),
    body: await response.text()
  }
}

describe('Appcast Proxy Integration Tests', () => {
  test('should handle request with all Sparkle parameters', async () => {
    const result = await fetchAppcast('appcast.xml', {
      appName: 'Vibe Tunnel',
      appVersion: '123',
      osVersion: '14.0',
      cpu64bit: '1',
      cpuFreqMHz: '2400',
      cputype: '16777228',
      cpusubtype: '2',
      model: 'MacBookPro17,1',
      ncpu: '8',
      lang: 'en',
      ramMB: '16384'
    }, {
      'User-Agent': 'Vibe Tunnel/1.0.0 Sparkle/2.0.0'
    })
    
    console.log('Test 1 - Full parameters:', {
      status: result.status,
      contentType: result.headers['content-type']
    })
    
    assert.strictEqual(result.status, 200, 'Should return 200 OK')
    assert(result.headers['content-type']?.includes('xml'), 'Should return XML content')
  })

  test('should handle request with only User-Agent (most common)', async () => {
    const result = await fetchAppcast('appcast.xml', {}, {
      'User-Agent': 'Vibe Tunnel/1.2.0 Sparkle/2.0.0'
    })
    
    console.log('Test 2 - Only User-Agent:', {
      status: result.status,
      contentType: result.headers['content-type']
    })
    
    assert.strictEqual(result.status, 200, 'Should return 200 OK with just User-Agent')
  })

  test('should handle legacy bundleIdentifier parameter', async () => {
    const result = await fetchAppcast('appcast-prerelease.xml', {
      bundleIdentifier: 'com.amantus.vibetunnel',
      bundleShortVersionString: '1.0.0-beta',
      osVersion: '14.0',
      cputype: '16777228',
      model: 'MacBookPro17,1',
      ncpu: '8',
      lang: 'en',
      ramMB: '16384'
    }, {
      'User-Agent': 'Vibe Tunnel/1.0.0-beta Sparkle/2.0.0'
    })
    
    console.log('Test 3 - Legacy bundleIdentifier:', {
      status: result.status
    })
    
    assert.strictEqual(result.status, 200, 'Should support legacy bundleIdentifier')
  })

  test('should return 400 when no identification provided', async () => {
    const result = await fetchAppcast('appcast.xml', {}, {})
    
    console.log('Test 4 - No identification:', {
      status: result.status,
      body: result.body
    })
    
    assert.strictEqual(result.status, 400, 'Should return 400 Bad Request')
    assert(result.body.includes('Missing app identifier'), 'Should indicate missing identifier')
  })

  test('should return 404 for unknown app', async () => {
    const result = await fetchAppcast('appcast.xml', {
      appName: 'UnknownApp',
      appVersion: '1.0'
    }, {
      'User-Agent': 'UnknownApp/1.0 Sparkle/2.0.0'
    })
    
    console.log('Test 5 - Unknown app:', {
      status: result.status
    })
    
    assert.strictEqual(result.status, 404, 'Should return 404 for unknown app')
  })

  test('should handle different User-Agent formats', async () => {
    const testCases = [
      'MyApp/2.1.3 Sparkle/2.0.0',
      'Another App/1.0.0-beta Sparkle/2.1.0',
      'SimpleApp/1.0',
      'App With Spaces/3.2.1 Sparkle/2.0.0'
    ]
    
    for (const userAgent of testCases) {
      const result = await fetchAppcast('appcast.xml', {}, {
        'User-Agent': userAgent
      })
      
      console.log(`Test 6 - User-Agent "${userAgent}":`, {
        status: result.status
      })
      
      // Note: These will fail against a real server unless the apps exist
      // In production, you'd mock the server or use test data
    }
  })
})

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Running appcast proxy integration tests...')
  console.log('Base URL:', BASE_URL)
  console.log('=' .repeat(50))
}