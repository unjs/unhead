import { useHead } from '@unhead/solid-js'

export default function TeamSection() {
  const team = [
    { name: 'Alice Chen', role: 'CEO & Founder' },
    { name: 'Bob Smith', role: 'CTO' },
    { name: 'Carol Davis', role: 'Head of Design' },
  ]

  useHead({
    title: 'About StreamShop - Meet Our Team',
    meta: [{ name: 'team-loaded', content: 'true' }],
    style: [{ key: 'progress', innerHTML: '.stream-progress::after{width:50%}' }],
  })

  return (
    <section class="team-section">
      <h2>Our Team</h2>
      <div class="team-grid">
        {team.map(member => (
          <div class="team-card">
            <div class="team-avatar">[avatar]</div>
            <h3>{member.name}</h3>
            <p>{member.role}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
