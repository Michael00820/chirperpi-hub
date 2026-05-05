/**
 * Admin Dashboard Page
 * Shows system health, stats, and monitoring information
 * Protected by admin role check
 */

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import axios from 'axios'

interface HealthData {
  status: string
  timestamp: string
  uptime: number
  version: string
  database: {
    status: string
    activeConnections: number
  }
  cache: {
    status: string
  }
  stats: {
    totalUsers: number
    totalPosts: number
    totalGroups: number
  }
  performance: {
    memoryUsage: {
      heapUsed: string
      heapTotal: string
      external: string
      rss: string
    }
    uptime: {
      days: number
      hours: number
      minutes: number
    }
  }
  environment: string
}

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [health, setHealth] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if user is admin
    if (!user || user.role !== 'admin') {
      navigate('/')
      return
    }

    fetchHealthData()
  }, [user, navigate])

  const fetchHealthData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('authToken')
      const response = await axios.get('/api/health/admin', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      setHealth(response.data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health data')
    } finally {
      setLoading(false)
    }
  }

  if (!user || user.role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">System health and monitoring</p>
        </div>

        {/* Refresh Button */}
        <div className="mb-6">
          <button
            onClick={fetchHealthData}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors"
          >
            Refresh Data
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">
              <strong>Error:</strong> {error}
            </p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
            <p className="text-gray-600 mt-4">Loading system health...</p>
          </div>
        )}

        {/* Content */}
        {health && !loading && (
          <div className="space-y-6">
            {/* Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* System Status */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">System Status</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {health.status === 'healthy' ? '✓ Healthy' : '⚠ Degraded'}
                    </p>
                  </div>
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl ${
                    health.status === 'healthy' ? 'bg-green-100' : 'bg-yellow-100'
                  }`}>
                    {health.status === 'healthy' ? '✓' : '!'}
                  </div>
                </div>
              </div>

              {/* Database Status */}
              <div className="bg-white rounded-lg shadow p-6">
                <div>
                  <p className="text-gray-600 text-sm">Database</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {health.database.status === 'connected' ? '✓ Connected' : '✗ Disconnected'}
                  </p>
                  <p className="text-gray-500 text-xs mt-2">
                    {health.database.activeConnections} active connections
                  </p>
                </div>
              </div>

              {/* Cache Status */}
              <div className="bg-white rounded-lg shadow p-6">
                <div>
                  <p className="text-gray-600 text-sm">Cache (Redis)</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {health.cache.status === 'connected' ? '✓ Connected' : '✗ Disconnected'}
                  </p>
                </div>
              </div>

              {/* Uptime */}
              <div className="bg-white rounded-lg shadow p-6">
                <div>
                  <p className="text-gray-600 text-sm">Uptime</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {health.performance.uptime.days}d {health.performance.uptime.hours}h {health.performance.uptime.minutes}m
                  </p>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm">Total Users</p>
                <p className="text-4xl font-bold text-gray-900 mt-2">{health.stats.totalUsers.toLocaleString()}</p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm">Total Posts</p>
                <p className="text-4xl font-bold text-gray-900 mt-2">{health.stats.totalPosts.toLocaleString()}</p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm">Total Groups</p>
                <p className="text-4xl font-bold text-gray-900 mt-2">{health.stats.totalGroups.toLocaleString()}</p>
              </div>
            </div>

            {/* Performance */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Performance</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Memory Usage</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Heap Used:</span>
                      <span className="font-mono text-gray-900">{health.performance.memoryUsage.heapUsed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Heap Total:</span>
                      <span className="font-mono text-gray-900">{health.performance.memoryUsage.heapTotal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">External:</span>
                      <span className="font-mono text-gray-900">{health.performance.memoryUsage.external}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">RSS:</span>
                      <span className="font-mono text-gray-900">{health.performance.memoryUsage.rss}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">System Info</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Environment:</span>
                      <span className="font-mono text-gray-900">{health.environment}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Version:</span>
                      <span className="font-mono text-gray-900">{health.version}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Updated:</span>
                      <span className="font-mono text-gray-900">
                        {new Date(health.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Server Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Server Information</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Request ID:</span>
                  <span className="font-mono text-gray-900">Sample: {Math.random().toString(36).substring(7)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Monitoring:</span>
                  <span className="font-mono text-gray-900">Sentry Error Tracking Active</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">API Rate Limiting:</span>
                  <span className="font-mono text-gray-900">100 req/15min per IP/user</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
