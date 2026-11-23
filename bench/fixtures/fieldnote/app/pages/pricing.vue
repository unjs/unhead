<script setup lang="ts">
const yearly = ref(false)
const interval = computed(() => yearly.value ? 'yearly' : 'monthly')

useHead({
  link: [{ rel: 'canonical', href: 'https://fieldnote.example/pricing' }],
  bodyAttrs: { 'data-page': 'pricing', 'data-billing': interval },
})

useSeoMeta({
  title: () => yearly.value ? 'Annual pricing' : 'Pricing',
  description: () => yearly.value
    ? 'Fieldnote Team costs $96 per person per year.'
    : 'Fieldnote Team costs $10 per person per month.',
  ogTitle: 'Fieldnote pricing',
})
</script>

<template>
  <section class="inner-page">
    <h1>Simple plans.</h1>
    <p>Start with a free workspace. Upgrade when your team needs more room.</p>
    <fieldset class="billing">
      <legend>Billing interval</legend>
      <button type="button" :aria-pressed="!yearly" @click="yearly = false">Monthly</button>
      <button type="button" :aria-pressed="yearly" @click="yearly = true">Yearly</button>
    </fieldset>
    <div class="cards">
      <article class="card">
        <h2>Starter</h2>
        <p class="price">$0</p>
        <p>Three projects for small teams.</p>
      </article>
      <article class="card">
        <h2>Team</h2>
        <p class="price">${{ yearly ? 96 : 10 }}</p>
        <p>Per person per {{ yearly ? 'year' : 'month' }}. Unlimited projects.</p>
      </article>
    </div>
  </section>
</template>
