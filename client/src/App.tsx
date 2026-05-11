import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import './App.css'

const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const GroupDiscoveryPage = lazy(() => import('./pages/GroupDiscoveryPage'))
const GroupCreatePage = lazy(() => import('./pages/GroupCreatePage'))
const GroupPage = lazy(() => import('./pages/GroupPage'))
const GroupInviteJoinPage = lazy(() => import('./pages/GroupInviteJoinPage'))
const TransactionHistoryPage = lazy(() => import('./pages/TransactionHistoryPage'))
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'))
const ProposalListingPage = lazy(() => import('./pages/ProposalListingPage'))
const ProposalDetailPage = lazy(() => import('./pages/ProposalDetailPage'))
const ProposalResultsPage = lazy(() => import('./pages/ProposalResultsPage'))
const MessagingPage = lazy(() => import('./pages/MessagingPage'))
const ExplorePage = lazy(() => import('./pages/ExplorePage'))
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'))
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'))
const HomePage = lazy(() => import('./pages/HomePage'))

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Suspense fallback={<div className="p-8 text-center text-gray-600">Loading page…</div>}>
          <Routes>
            <Route path="/profile/:username" element={<ProfilePage />} />
            <Route path="/groups/discover" element={<GroupDiscoveryPage />} />
            <Route path="/groups/new" element={<GroupCreatePage />} />
            <Route path="/groups/join/:inviteCode" element={<GroupInviteJoinPage />} />
            <Route path="/groups/:groupId" element={<GroupPage />} />
            <Route path="/transactions/history" element={<TransactionHistoryPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/messages" element={<MessagingPage />} />
            <Route path="/messages/:conversationId" element={<MessagingPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/proposals" element={<ProposalListingPage />} />
            <Route path="/proposals/:id" element={<ProposalDetailPage />} />
            <Route path="/proposals/:id/results" element={<ProposalResultsPage />} />
            <Route path="/admin/health" element={<AdminDashboardPage />} />
            <Route path="/" element={<HomePage />} />
          </Routes>
        </Suspense>
      </div>
    </Router>
  )
}

export default App