import { Loading } from 'solid-js'
import Header from '../components/Header'
import TeamSection from '../components/TeamSection'
import StatsSection from '../components/StatsSection'

export default function AboutPage() {
  return (
    <>
      <Loading fallback={<div class="skeleton header-skeleton">Loading header...</div>}>
        <Header showProgress={false} />
      </Loading>
      <div class="about-content">
        <div class="about-hero">
          <h1>About StreamShop</h1>
          <p>Your trusted destination for quality products since 2020</p>
        </div>
        <TeamSection />
        <StatsSection />
      </div>
    </>
  )
}
