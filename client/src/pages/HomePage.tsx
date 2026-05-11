import { Link } from 'react-router-dom'

type Feature = {
  to: string
  title: string
  description: string
}

const features: Feature[] = [
  {
    to: '/explore',
    title: 'Explore',
    description: 'Discover trending posts, topics, and people across the network.'
  },
  {
    to: '/messages',
    title: 'Messages',
    description: 'Real-time direct messages and conversations with other Pioneers.'
  },
  {
    to: '/groups/discover',
    title: 'Groups',
    description: 'Find and join communities. Create your own group to bring people together.'
  },
  {
    to: '/proposals',
    title: 'Proposals',
    description: 'Participate in community governance: create, discuss, and vote on proposals.'
  },
  {
    to: '/leaderboard',
    title: 'Leaderboard',
    description: 'See the top tippers and most-supported creators in the community.'
  },
  {
    to: '/transactions/history',
    title: 'Transactions',
    description: 'Review your Pi tips, unlocks, and payment history.'
  },
  {
    to: '/onboarding',
    title: 'Get Started',
    description: 'New here? Walk through onboarding to set up your profile and preferences.'
  },
  {
    to: '/admin/health',
    title: 'System Health',
    description: 'Admin dashboard for monitoring service status and metrics.'
  }
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <header className="border-b border-gray-200 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600" />
            <span className="text-lg font-semibold text-gray-900">ChirperPi Hub</span>
          </div>
          <nav className="flex items-center gap-4 text-sm font-medium text-gray-700">
            <Link to="/explore" className="hover:text-indigo-600">Explore</Link>
            <Link to="/messages" className="hover:text-indigo-600">Messages</Link>
            <Link to="/groups/discover" className="hover:text-indigo-600">Groups</Link>
            <Link
              to="/onboarding"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-white shadow-sm hover:bg-indigo-700"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <section className="mb-16 text-center">
          <h1 className="mb-4 text-5xl font-bold tracking-tight text-gray-900">
            Welcome to ChirperPi Hub
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            A decentralized social network for the Pi Network ecosystem. Connect with Pioneers,
            join communities, vote on proposals, and exchange Pi.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              to="/onboarding"
              className="rounded-lg bg-indigo-600 px-6 py-3 text-white font-medium shadow-sm hover:bg-indigo-700"
            >
              Get Started
            </Link>
            <Link
              to="/explore"
              className="rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 hover:bg-gray-50"
            >
              Explore the Network
            </Link>
          </div>
        </section>

        <section>
          <h2 className="mb-6 text-2xl font-semibold text-gray-900">Features</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Link
                key={feature.to}
                to={feature.to}
                className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
              >
                <h3 className="mb-2 text-lg font-semibold text-gray-900 group-hover:text-indigo-600">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200 bg-white/70 py-6 text-center text-sm text-gray-500">
        ChirperPi Hub — built for the Pi Network ecosystem
      </footer>
    </div>
  )
}
