import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Sparkles, ShieldCheck, HeartHandshake, BookOpen, MessageCircle, ArrowRight } from 'lucide-react'
import { loginWithPi, completeOnboarding } from '../services/onboardingService'
import splashImage from '../assets/Splash_screen.jpg'
import logoImage from '../assets/Parrot_splashscreen.jpg'

const interestTags = [
  'Pi Economy',
  'Crypto News',
  'Community Help',
  'DeFi',
  'Social Impact',
  'NFTs',
  'Governance',
  'Maker Culture'
]

const suggestedUsers = [
  { id: '1', username: 'pi_guardian', displayName: 'Pi Guardian', verified: true },
  { id: '2', username: 'pi_builder', displayName: 'Pi Builder', verified: true },
  { id: '3', username: 'pi_trend', displayName: 'Pi Trend', verified: true }
]

const tutorialSteps = [
  {
    title: 'Post your first update',
    description: 'Share your voice with the Pi community using text, images, or polls.',
    icon: BookOpen
  },
  {
    title: 'Tip with Pi',
    description: 'Support creators and friends instantly with Pi transactions.',
    icon: HeartHandshake
  },
  {
    title: 'Join groups',
    description: 'Find communities around your interests and join the conversation.',
    icon: MessageCircle
  },
  {
    title: 'Use community services',
    description: 'Discover helpful tools and trusted Pi services for every need.',
    icon: Sparkles
  }
]

const OnboardingPage = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [piUsername, setPiUsername] = useState('')
  const [username, setUsername] = useState('')
  const [selectedInterests, setSelectedInterests] = useState<string[]>(['Pi Economy', 'Community Help'])
  const [followedUsers, setFollowedUsers] = useState<string[]>(['1'])
  const [showNotification, setShowNotification] = useState(true)
  const [completionProgress, setCompletionProgress] = useState(25)
  const [firstPostPrompt, setFirstPostPrompt] = useState(true)

  const progressLabel = useMemo(() => {
    switch (step) {
      case 0:
        return 'Welcome'
      case 1:
        return 'Pi Authentication'
      case 2:
        return 'Choose a username'
      case 3:
        return 'Select interests'
      case 4:
        return 'Follow suggested users'
      case 5:
        return 'Tutorial view'
      case 6:
        return 'Ready to go!'
      default:
        return 'Welcome'
    }
  }, [step])

  const progressPercent = useMemo(() => 100 / 6 * step, [step])

  const nextStep = () => {
    setStep((current) => Math.min(current + 1, 6))
    setCompletionProgress(Math.min(25 + step * 12, 100))
  }

  const skipStep = () => {
    nextStep()
  }

  const toggleInterest = (tag: string) => {
    setSelectedInterests((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]
    )
  }

  const toggleFollow = (userId: string) => {
    setFollowedUsers((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
    )
  }

  const handlePiLogin = async () => {
    setLoading(true)
    try {
      const authResponse = await loginWithPi('pi-demo-access-token')
      if (authResponse.success && authResponse.user) {
        localStorage.setItem('authToken', authResponse.token || '')
        setPiUsername(authResponse.user.username)
        setUsername(authResponse.user.username)
        nextStep()
      }
    } catch (error) {
      console.error('Pi login failed', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteProfile = async () => {
    setLoading(true)
    try {
      await completeOnboarding({ username, interests: selectedInterests })
      nextStep()
    } catch (error) {
      console.error('Onboarding completion failed', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="relative isolate overflow-hidden">
        <img
          src={splashImage}
          alt="Splash background"
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-60"
        />
        <div className="mx-auto max-w-7xl px-6 py-10 sm:px-10">
          <div className="flex flex-col gap-8 rounded-[38px] border border-white/10 bg-slate-950/80 p-6 shadow-2xl backdrop-blur-xl sm:p-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <img src={logoImage} alt="PiConnect logo" className="h-20 w-20 rounded-3xl border border-white/10 object-cover" />
              </div>
              <div className="space-y-2 text-right">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Start your Pi journey</p>
                <h1 className="text-4xl font-semibold text-white sm:text-5xl">Welcome to PiConnect</h1>
                <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
                  Personalize your community experience, connect with verified Pi users, and start sharing with a first post.
                </p>
              </div>
            </div>

            <div className="rounded-[34px] border border-white/10 bg-slate-900/90 p-6 shadow-xl">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Onboarding</p>
                  <h2 className="text-2xl font-semibold text-white">{progressLabel}</h2>
                </div>
                <div className="text-sm text-slate-400">Step {step + 1} of 7</div>
              </div>

              <div className="rounded-full bg-slate-800 p-1">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="grid gap-6">
              {step === 0 && (
                <section className="rounded-[32px] border border-white/10 bg-slate-900/90 p-8 shadow-xl">
                  <h2 className="text-3xl font-semibold text-white">Ready to explore the Pi universe?</h2>
                  <p className="mt-4 text-slate-300">
                    Tap through our guided setup to personalize your feed, follow Pi-verified friends, and unlock community tools.
                  </p>
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <button
                      type="button"
                      onClick={nextStep}
                      className="inline-flex items-center justify-center gap-2 rounded-3xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                    >
                      Get started
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={skipStep}
                      className="rounded-3xl border border-slate-700 bg-slate-800 px-6 py-3 text-sm text-slate-300 transition hover:border-slate-500"
                    >
                      Skip intro
                    </button>
                  </div>
                </section>
              )}

              {step === 1 && (
                <section className="rounded-[32px] border border-white/10 bg-slate-900/90 p-8 shadow-xl">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h2 className="text-3xl font-semibold text-white">Sign in with Pi</h2>
                      <p className="mt-4 text-slate-300">
                        Authenticate with your Pi wallet to bring your identity and balance into PiConnect.
                      </p>
                    </div>
                    <div className="rounded-3xl border border-cyan-500/20 bg-slate-950 p-6 text-center">
                      <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Pi OAuth</p>
                      <p className="mt-3 text-3xl font-semibold text-white">Fast and secure</p>
                    </div>
                  </div>

                  <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                    <button
                      type="button"
                      onClick={handlePiLogin}
                      disabled={loading}
                      className="inline-flex items-center justify-center gap-2 rounded-3xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {loading ? 'Authenticating…' : 'Continue with Pi'}
                    </button>
                    <button
                      type="button"
                      onClick={skipStep}
                      className="rounded-3xl border border-slate-700 bg-slate-800 px-6 py-3 text-sm text-slate-300 transition hover:border-slate-500"
                    >
                      Skip for now
                    </button>
                  </div>
                </section>
              )}

              {step === 2 && (
                <section className="rounded-[32px] border border-white/10 bg-slate-900/90 p-8 shadow-xl">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-6 w-6 text-cyan-400" />
                      <h2 className="text-2xl font-semibold text-white">Choose your PiConnect username</h2>
                    </div>
                    <p className="text-slate-300">
                      We auto-suggested a username from your Pi identity. You can edit it before joining.
                    </p>
                  </div>
                  <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto]">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-300">Your username</span>
                      <input
                        type="text"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        className="w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                      />
                    </label>
                    <div className="flex items-end gap-3">
                      <button
                        type="button"
                        onClick={nextStep}
                        className="inline-flex items-center justify-center gap-2 rounded-3xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={skipStep}
                    className="mt-4 rounded-3xl border border-slate-700 bg-slate-800 px-6 py-3 text-sm text-slate-300 transition hover:border-slate-500"
                  >
                    Skip username selection
                  </button>
                </section>
              )}

              {step === 3 && (
                <section className="rounded-[32px] border border-white/10 bg-slate-900/90 p-8 shadow-xl">
                  <div>
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="h-6 w-6 text-cyan-400" />
                      <h2 className="text-2xl font-semibold text-white">Personalize your feed</h2>
                    </div>
                    <p className="mt-4 text-slate-300">
                      Pick interests so PiConnect surfaces posts, groups, and services you care about.
                    </p>
                  </div>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {interestTags.map((tag) => {
                      const active = selectedInterests.includes(tag)
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleInterest(tag)}
                          className={`rounded-3xl border px-4 py-3 text-left text-sm transition ${
                            active
                              ? 'border-cyan-400 bg-cyan-500/10 text-cyan-100'
                              : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500'
                          }`}
                        >
                          {tag}
                        </button>
                      )
                    })}
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={nextStep}
                      className="inline-flex items-center justify-center gap-2 rounded-3xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                    >
                      Save interests
                    </button>
                    <button
                      type="button"
                      onClick={skipStep}
                      className="rounded-3xl border border-slate-700 bg-slate-800 px-6 py-3 text-sm text-slate-300 transition hover:border-slate-500"
                    >
                      Skip this step
                    </button>
                  </div>
                </section>
              )}

              {step === 4 && (
                <section className="rounded-[32px] border border-white/10 bg-slate-900/90 p-8 shadow-xl">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-6 w-6 text-cyan-400" />
                    <h2 className="text-2xl font-semibold text-white">Follow Pi-verified users</h2>
                  </div>
                  <p className="mt-4 text-slate-300">
                    These accounts are verified by Pi and are great for your first feed recommendations.
                  </p>
                  <div className="mt-6 grid gap-4">
                    {suggestedUsers.map((user) => {
                      const isFollowing = followedUsers.includes(user.id)
                      return (
                        <div key={user.id} className="flex flex-col rounded-3xl border border-slate-700 bg-slate-950 p-5 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="text-base font-semibold text-white">{user.displayName}</div>
                            <div className="mt-1 text-sm text-slate-400">@{user.username} · Pi verified</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleFollow(user.id)}
                            className={`rounded-3xl px-5 py-2 text-sm font-semibold transition ${
                              isFollowing
                                ? 'bg-slate-700 text-slate-200'
                                : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                            }`}
                          >
                            {isFollowing ? 'Following' : 'Follow'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={nextStep}
                      className="inline-flex items-center justify-center gap-2 rounded-3xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                    >
                      Continue
                    </button>
                    <button
                      type="button"
                      onClick={skipStep}
                      className="rounded-3xl border border-slate-700 bg-slate-800 px-6 py-3 text-sm text-slate-300 transition hover:border-slate-500"
                    >
                      Skip follow suggestions
                    </button>
                  </div>
                </section>
              )}

              {step === 5 && (
                <section className="rounded-[32px] border border-white/10 bg-slate-900/90 p-8 shadow-xl">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="h-6 w-6 text-cyan-400" />
                    <h2 className="text-2xl font-semibold text-white">Quick start tutorial</h2>
                  </div>
                  <p className="mt-4 text-slate-300">
                    Learn the essentials so you can start posting, tipping, and joining groups with confidence.
                  </p>
                  <div className="mt-6 grid gap-4 lg:grid-cols-2">
                    {tutorialSteps.map((item) => {
                      const Icon = item.icon
                      return (
                        <div key={item.title} className="rounded-3xl border border-slate-700 bg-slate-950 p-5">
                          <div className="flex items-center gap-3">
                            <div className="rounded-2xl bg-cyan-500/10 p-3 text-cyan-300">
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                            </div>
                          </div>
                          <p className="mt-3 text-sm text-slate-400">{item.description}</p>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={nextStep}
                      className="inline-flex items-center justify-center gap-2 rounded-3xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                    >
                      Got it
                    </button>
                    <button
                      type="button"
                      onClick={skipStep}
                      className="rounded-3xl border border-slate-700 bg-slate-800 px-6 py-3 text-sm text-slate-300 transition hover:border-slate-500"
                    >
                      Skip tutorial
                    </button>
                  </div>
                </section>
              )}

              {step === 6 && (
                <section className="rounded-[32px] border border-white/10 bg-slate-900/90 p-8 shadow-xl">
                  <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
                    <div className="space-y-6">
                      <div className="rounded-3xl border border-cyan-500/30 bg-slate-950 p-6">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-300">
                            <Sparkles className="h-5 w-5" />
                          </span>
                          <div>
                            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Welcome notification</p>
                            <h3 className="mt-2 text-xl font-semibold text-white">Message from PiConnect team</h3>
                          </div>
                        </div>
                        {showNotification && (
                          <div className="mt-6 rounded-3xl bg-slate-950 p-5 text-sm text-slate-300">
                            <p className="font-medium text-white">Welcome aboard!</p>
                            <p className="mt-2">You’re all set to start connecting with Pi-verified creators, groups, and services.</p>
                            <button
                              type="button"
                              onClick={() => setShowNotification(false)}
                              className="mt-4 rounded-3xl bg-slate-800 px-4 py-2 text-xs text-slate-300 transition hover:bg-slate-700"
                            >
                              Dismiss notice
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="rounded-3xl border border-slate-700 bg-slate-950 p-6">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">First post</p>
                            <h3 className="mt-2 text-xl font-semibold text-white">Start your first post</h3>
                          </div>
                          <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-cyan-300">
                            Suggested
                          </span>
                        </div>
                        <p className="mt-4 text-slate-300">
                          Share a brief introduction, welcome the community, or ask a question to spark your first conversation.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setFirstPostPrompt(false)
                            navigate('/')
                          }}
                          className="mt-6 inline-flex items-center justify-center gap-2 rounded-3xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                        >
                          Create first post
                        </button>
                      </div>
                    </div>

                    <div className="space-y-6 rounded-3xl border border-slate-700 bg-slate-950 p-6">
                      <div className="rounded-3xl bg-slate-900 p-5">
                        <p className="text-sm text-slate-400">Profile completion</p>
                        <div className="mt-4 rounded-full bg-slate-800 p-1">
                          <div className="h-3 rounded-full bg-cyan-500 transition-all" style={{ width: `${completionProgress}%` }} />
                        </div>
                        <p className="mt-3 text-sm text-slate-300">{completionProgress}% complete</p>
                      </div>
                      <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 text-sm text-slate-300">
                        <p className="font-semibold text-white">Next recommended actions</p>
                        <ul className="mt-3 space-y-2">
                          <li>• Add a profile photo</li>
                          <li>• Make your first post</li>
                          <li>• Join a group</li>
                        </ul>
                      </div>
                      <button
                        type="button"
                        onClick={handleCompleteProfile}
                        disabled={loading}
                        className="w-full rounded-3xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {loading ? 'Finishing setup…' : 'Finish onboarding'}
                      </button>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OnboardingPage
