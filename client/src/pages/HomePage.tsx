import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

type Feature = {
  to: string
  title: string
  description: string
  accent: string
  icon: JSX.Element
}

const iconClass = 'h-6 w-6'

const features: Feature[] = [
  {
    to: '/explore',
    title: 'Explore',
    description: 'Discover trending posts, topics, and people across the network.',
    accent: 'from-sky-500 to-cyan-500',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    )
  },
  {
    to: '/messages',
    title: 'Messages',
    description: 'Real-time direct messages and conversations with other Pioneers.',
    accent: 'from-emerald-500 to-teal-500',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    )
  },
  {
    to: '/groups/discover',
    title: 'Groups',
    description: 'Find and join communities. Create your own group to bring people together.',
    accent: 'from-fuchsia-500 to-pink-500',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    )
  },
  {
    to: '/proposals',
    title: 'Proposals',
    description: 'Participate in community governance: create, discuss, and vote on proposals.',
    accent: 'from-amber-500 to-orange-500',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    )
  },
  {
    to: '/leaderboard',
    title: 'Leaderboard',
    description: 'See the top tippers and most-supported creators in the community.',
    accent: 'from-yellow-500 to-amber-500',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
        <path d="M8 21h8M12 17v4" />
        <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
        <path d="M17 4h3v3a3 3 0 0 1-3 3M7 4H4v3a3 3 0 0 0 3 3" />
      </svg>
    )
  },
  {
    to: '/transactions/history',
    title: 'Transactions',
    description: 'Review your Pi tips, unlocks, and payment history.',
    accent: 'from-violet-500 to-purple-600',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
        <path d="M3 7h18M7 3v4M17 3v4" />
        <rect x="3" y="7" width="18" height="14" rx="2" />
        <path d="M8 13h8M8 17h5" />
      </svg>
    )
  },
  {
    to: '/onboarding',
    title: 'Get Started',
    description: 'New here? Walk through onboarding to set up your profile and preferences.',
    accent: 'from-indigo-500 to-blue-600',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
        <path d="M12 2v6M12 22v-4" />
        <circle cx="12" cy="12" r="4" />
        <path d="M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M2 12h6M16 12h6M4.93 19.07l4.24-4.24M14.83 9.17l4.24-4.24" />
      </svg>
    )
  },
  {
    to: '/admin/health',
    title: 'System Health',
    description: 'Admin dashboard for monitoring service status and metrics.',
    accent: 'from-slate-600 to-slate-800',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    )
  }
]

type Stats = {
  pioneers: number
  groups: number
  proposals: number
  piTipped: number
}

const formatCount = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export default function HomePage() {
  const [navOpen, setNavOpen] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const { isAuthenticated, user, signInWithPi, isSigningIn, signInError, logout } = useAuth()
  const handleLogout = logout

  useEffect(() => {
    document.title = 'ChirperPi Hub — Decentralized social for Pi Network'
    let cancelled = false
    api
      .get('/stats')
      .then((res) => {
        if (cancelled) return
        const data = res.data || {}
        setStats({
          pioneers: Number(data.pioneers) || 0,
          groups: Number(data.groups) || 0,
          proposals: Number(data.proposals) || 0,
          piTipped: Number(data.piTipped) || 0
        })
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  const statTiles = [
    { label: 'Pioneers', value: stats ? formatCount(stats.pioneers) : '—' },
    { label: 'Active Groups', value: stats ? formatCount(stats.groups) : '—' },
    { label: 'Proposals', value: stats ? formatCount(stats.proposals) : '—' },
    { label: 'Pi Tipped', value: stats ? `${formatCount(stats.piTipped)} π` : '—' }
  ]

  const handleSignIn = () => {
    signInWithPi().catch(() => undefined)
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-md">
              <span className="text-base font-bold">π</span>
            </div>
            <span className="text-lg font-semibold tracking-tight">ChirperPi Hub</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-700 md:flex">
            <Link to="/explore" className="hover:text-indigo-600">Explore</Link>
            <Link to="/messages" className="hover:text-indigo-600">Messages</Link>
            <Link to="/groups/discover" className="hover:text-indigo-600">Groups</Link>
            <Link to="/proposals" className="hover:text-indigo-600">Proposals</Link>
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link
                  to={`/profile/${user?.username || ''}`}
                  className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-800 shadow-sm hover:border-indigo-300"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-xs font-bold text-white">
                    {(user?.username || '?').charAt(0).toUpperCase()}
                  </span>
                  <span className="max-w-[120px] truncate text-sm">@{user?.username}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => handleLogout?.()}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Log out
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
              >
                {isSigningIn ? 'Signing in…' : 'Sign in with Pi'}
              </button>
            )}
          </nav>

          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setNavOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 md:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              {navOpen ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M3 6h18M3 12h18M3 18h18" />
              )}
            </svg>
          </button>
        </div>

        {navOpen && (
          <div className="border-t border-slate-200 bg-white md:hidden">
            <div className="mx-auto flex max-w-6xl flex-col px-4 py-2 text-sm font-medium text-slate-700">
              <Link to="/explore" onClick={() => setNavOpen(false)} className="rounded px-2 py-3 hover:bg-slate-100">Explore</Link>
              <Link to="/messages" onClick={() => setNavOpen(false)} className="rounded px-2 py-3 hover:bg-slate-100">Messages</Link>
              <Link to="/groups/discover" onClick={() => setNavOpen(false)} className="rounded px-2 py-3 hover:bg-slate-100">Groups</Link>
              <Link to="/proposals" onClick={() => setNavOpen(false)} className="rounded px-2 py-3 hover:bg-slate-100">Proposals</Link>
              <Link to="/leaderboard" onClick={() => setNavOpen(false)} className="rounded px-2 py-3 hover:bg-slate-100">Leaderboard</Link>
              {isAuthenticated ? (
                <>
                  <Link
                    to={`/profile/${user?.username || ''}`}
                    onClick={() => setNavOpen(false)}
                    className="rounded px-2 py-3 hover:bg-slate-100"
                  >
                    @{user?.username}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setNavOpen(false)
                      handleLogout?.()
                    }}
                    className="my-2 rounded-lg border border-slate-200 px-4 py-3 text-center text-slate-700"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setNavOpen(false)
                    handleSignIn()
                  }}
                  disabled={isSigningIn}
                  className="my-2 rounded-lg bg-indigo-600 px-4 py-3 text-center text-white disabled:opacity-60"
                >
                  {isSigningIn ? 'Signing in…' : 'Sign in with Pi'}
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-32 left-1/2 h-[480px] w-[680px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-indigo-300/40 via-violet-300/30 to-fuchsia-300/40 blur-3xl" />
          <div className="absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-cyan-300/30 blur-3xl" />
          <div className="absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-pink-300/30 blur-3xl" />
        </div>

        <div className="mx-auto max-w-6xl px-4 pb-12 pt-12 sm:px-6 sm:pt-20 lg:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-3 py-1 text-xs font-medium text-indigo-700 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Built for the Pi Network ecosystem
            </span>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              The social network where{' '}
              <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                Pioneers connect
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-slate-600 sm:text-lg">
              Share posts, join communities, vote on proposals, and exchange Pi — all in one
              decentralized hub built for the Pi Network.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {isAuthenticated ? (
                <Link
                  to="/explore"
                  className="w-full rounded-xl bg-indigo-600 px-6 py-3 text-center font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 sm:w-auto"
                >
                  Open Your Feed
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleSignIn}
                  disabled={isSigningIn}
                  className="w-full rounded-xl bg-indigo-600 px-6 py-3 text-center font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-60 sm:w-auto"
                >
                  {isSigningIn ? 'Signing in…' : 'Sign in with Pi'}
                </button>
              )}
              <Link
                to="/explore"
                className="w-full rounded-xl border border-slate-300 bg-white px-6 py-3 text-center font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 sm:w-auto"
              >
                Explore the Network
              </Link>
            </div>
            {signInError && (
              <p className="mx-auto mt-4 max-w-md rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {signInError}
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {statTiles.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-4 text-center shadow-sm backdrop-blur"
              >
                <div className="text-xl font-bold text-slate-900 sm:text-2xl">{s.value}</div>
                <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Everything you need
            </h2>
            <p className="mt-1 text-sm text-slate-600 sm:text-base">
              Tap any tile to jump straight in.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Link
              key={feature.to}
              to={feature.to}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg"
            >
              <div
                className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${feature.accent} text-white shadow-md`}
              >
                {feature.icon}
              </div>
              <h3 className="text-base font-semibold text-slate-900 group-hover:text-indigo-600 sm:text-lg">
                {feature.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{feature.description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 opacity-0 transition group-hover:opacity-100">
                Open
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-8 text-center text-white shadow-xl sm:p-12">
          <h3 className="text-2xl font-bold sm:text-3xl">
            {isAuthenticated ? `Welcome back, @${user?.username}` : 'Ready to join the conversation?'}
          </h3>
          <p className="mx-auto mt-3 max-w-xl text-sm text-indigo-100 sm:text-base">
            {isAuthenticated
              ? 'Jump back in — see what your community is talking about today.'
              : 'Sign in with your Pi account to start posting, tipping, and voting.'}
          </p>
          {isAuthenticated ? (
            <Link
              to="/explore"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-indigo-700 shadow-md transition hover:bg-indigo-50"
            >
              Open Explore
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-indigo-700 shadow-md transition hover:bg-indigo-50 disabled:opacity-60"
            >
              {isSigningIn ? 'Signing in…' : 'Sign in with Pi'}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-center text-sm text-slate-500 sm:flex-row sm:px-6 sm:text-left">
          <div>ChirperPi Hub — built for the Pi Network ecosystem</div>
          <div className="flex items-center gap-4">
            <Link to="/explore" className="hover:text-indigo-600">Explore</Link>
            <Link to="/proposals" className="hover:text-indigo-600">Proposals</Link>
            <Link to="/admin/health" className="hover:text-indigo-600">Status</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
