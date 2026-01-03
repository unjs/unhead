import { Suspense, use } from 'react'
import { useHead } from '@unhead/react'
import { Link } from 'react-router-dom'

const teamCache = new Map<string, Promise<{ name: string; role: string }[]>>()
const statsCache = new Map<string, Promise<{ customers: number; products: number; countries: number }>>()

function TeamSection() {
  const key = 'team'
  if (!teamCache.has(key)) {
    const delay = typeof window === 'undefined' ? 500 : 0
    teamCache.set(key, new Promise(resolve =>
      setTimeout(() => resolve([
        { name: 'Alice Chen', role: 'CEO & Founder' },
        { name: 'Bob Smith', role: 'CTO' },
        { name: 'Carol Davis', role: 'Head of Design' },
      ]), delay)
    ))
    teamCache.get(key)!.finally(() => setTimeout(() => teamCache.delete(key), 100))
  }
  const team = use(teamCache.get(key)!)

  useHead({
    title: 'About StreamShop - Meet Our Team',
    meta: [{ name: 'team-loaded', content: 'true' }],
    style: [{ key: 'progress', innerHTML: '.stream-progress::after{width:50%}' }],
  })

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: `window.__streamLog?.('👥 Team loaded', '#f59e0b')` }} />
      <section className="team-section">
        <h2>Our Team</h2>
        <div className="team-grid">
          {team.map(member => (
            <div key={member.name} className="team-card">
              <div className="team-avatar">👤</div>
              <h3>{member.name}</h3>
              <p>{member.role}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

function StatsSection() {
  const key = 'stats'
  if (!statsCache.has(key)) {
    const delay = typeof window === 'undefined' ? 1000 : 0
    statsCache.set(key, new Promise(resolve =>
      setTimeout(() => resolve({ customers: 100000, products: 5000, countries: 50 }), delay)
    ))
    statsCache.get(key)!.finally(() => setTimeout(() => statsCache.delete(key), 100))
  }
  const stats = use(statsCache.get(key)!)

  useHead({
    title: 'About StreamShop - Ready!',
    meta: [
      { name: 'stats-loaded', content: 'true' },
      { property: 'og:title', content: 'About StreamShop' },
    ],
    style: [{ key: 'progress', innerHTML: '.stream-progress{opacity:0;transition:opacity 0.3s}' }],
    script: [{
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'StreamShop',
        foundingDate: '2020',
      }),
    }],
  })

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: `window.__streamLog?.('📊 Stats loaded', '#22d3ee')` }} />
      <section className="stats-section">
        <h2>Our Impact</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-number">{stats.customers.toLocaleString()}+</span>
            <span className="stat-label">Happy Customers</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{stats.products.toLocaleString()}+</span>
            <span className="stat-label">Products</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{stats.countries}+</span>
            <span className="stat-label">Countries</span>
          </div>
        </div>
      </section>
    </>
  )
}

export default function AboutPage() {
  useHead({
    title: 'About StreamShop',
    htmlAttrs: { lang: 'en', 'data-page': 'about' },
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'description', content: 'Learn about StreamShop and our mission' },
      { name: 'page-id', content: 'about' },
    ],
    link: [{ rel: 'canonical', href: 'https://example.com/about' }],
    style: [{ key: 'progress', innerHTML: '.stream-progress::after{width:10%}' }],
  })

  return (
    <div className="app">
      <div className="stream-progress" />
      <header className="site-header">
        <div className="logo">🛒 StreamShop</div>
        <nav className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/about">About</Link>
        </nav>
      </header>

      <main className="about-content">
        <nav className="page-nav">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/about" className="nav-link active">About</Link>
        </nav>

        <div className="about-hero">
          <h1>About StreamShop</h1>
          <p>We're on a mission to make online shopping faster and more enjoyable.</p>
        </div>

        <Suspense fallback={<div className="skeleton team-skeleton">Loading team...</div>}>
          <TeamSection />
        </Suspense>

        <Suspense fallback={<div className="skeleton stats-skeleton">Loading stats...</div>}>
          <StatsSection />
        </Suspense>
      </main>

      <footer className="site-footer">
        <p>© 2024 StreamShop - React Streaming SSR Demo</p>
      </footer>
    </div>
  )
}
