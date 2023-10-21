<script>
  import { onMount } from 'svelte';
  import Header from './Header.svelte';
  import Footer from './Footer.svelte';
  import Icon from './Icon.svelte';
  import News from './News.svelte';
  import Article from './Article.svelte';

  let isLoading = true;

  onMount(() => {
    setTimeout(() => {
      isLoading = false;
    }, 1800);
  });
</script>

<div class="App">
  <Header />

  <div class="main-content">
    <div class="container">
      <div class="row">
        {#if isLoading}
          <div class="spinner">
            <Icon />
          </div>
        {:else}
          <div class="col my-3">
           <News />
          </div>
        {/if}
      </div>
    </div>
  </div>

  <Footer />
</div>
