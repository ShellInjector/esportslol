<script>
  import { onMount } from 'svelte';
  import { getContext } from 'svelte';

  let articleData = null;

  const params = getContext('params');

  onMount(async () => {
    try {
      // Extract the UID parameter from the route
      const { uid } = params.entry.uid;

      const response = await fetch(`https://cdn.contentstack.io/v3/content_types/articles/entries/${uid}?environment=production&bustcache=bustcache&locale=en-gb&include[]=league&include[]=author`);
      articleData = await response.json();
    } catch (error) {
      console.log(error);
    }
  });

  console.log(articleData);
</script>

<div>
  {#if articleData}
    <h1>{articleData.title}</h1>
    <!-- Render the article data -->
  {:else}
    <p>Loading...</p>
  {/if}
</div>
