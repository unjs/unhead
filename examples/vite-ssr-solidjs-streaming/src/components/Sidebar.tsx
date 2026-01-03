import { useHead } from '@unhead/solid-js'

export default function Sidebar() {
  const categories = ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books']

  useHead({
    title: 'StreamShop 2/11 - Loading...',
    meta: [
      { name: 'description', content: 'Browse our wide selection of products across multiple categories' },
      { name: 'sidebar-loaded', content: 'true' },
    ],
    style: [{ key: 'progress', innerHTML: '.stream-progress::after{width:18%}' }],
  })

  return (
    <aside class="sidebar">
      <h3>Categories</h3>
      <ul>
        {categories.map(cat => (
          <li><a href="#">{cat}</a></li>
        ))}
      </ul>
      <div class="filters">
        <h4>Price Range</h4>
        <div class="price-range">$0 - $1000</div>
        <h4>Rating</h4>
        <div class="stars">**** & up</div>
      </div>
    </aside>
  )
}
