<script>
  export let selectedCategory;
  export let entries;
  export let filterEntries;
  export let handleFilter;
</script>

<div class="filter-bar">
  <button class={selectedCategory === 'all' ? 'active' : ''} on:click={() => handleFilter('all')}>All</button>
  <button class={selectedCategory === 'article' ? 'active' : ''} on:click={() => handleFilter('article')}>Articles</button>
  <button class={selectedCategory === 'video' ? 'active' : ''} on:click={() => handleFilter('video')}>Videos</button>
</div>
