<script>
  import { onMount } from 'svelte';
  

  let entries = [];
  let loading = true;
  let visibleEntries = 14;
  let skipEntries = 0;
  let selectedCategories = [];

  const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  onMount(async () => {
    try {
      const articles = [];
      const videos = [];

      for (let i = 0; i <= 600; i += 100) {
        const response = await fetch(`https://wrapper-eight.vercel.app/articles/${i}`, {
          headers: {
            'Access_token': 'cs9bf74a8cc357da4224f2b444',
            'Api_key': 'bltad9188aa9a70543a'
          }
        });
        const data = await response.json();
        articles.push(...data.entries.map(entry => ({
          ...entry,
          type: 'article',
        })));
      }

      for (let i = 0; i <= 900; i += 100) {
        const response = await fetch(`https://wrapper-eight.vercel.app/videos/${i}`, {
          headers: {
            'Access_token': 'cs9bf74a8cc357da4224f2b444',
            'Api_key': 'bltad9188aa9a70543a'
          }
        });
        const data = await response.json();
        videos.push(...data.entries.map(entry => ({
          ...entry,
          type: 'video',
        })));
      }

      const combinedEntries = [...articles, ...videos];
      entries = shuffleArray(combinedEntries);
      loading = false;
      updateVisibleEntries();
    } catch (error) {
      console.log(error);
    }
  });

  let currentEntries = [];

  const handleLoadMore = () => {
    visibleEntries += 14;
    if (visibleEntries >= entries.length) {
      skipEntries += 100;
      loadMoreEntries();
    } else {
      updateVisibleEntries();
    }
  };

  const applyFilter = () => {
    visibleEntries = 14;
    updateVisibleEntries();
  };

  const updateVisibleEntries = () => {
    let filteredEntries = entries;

    if (selectedCategories.length > 0) {
      filteredEntries = entries.filter(entry => selectedCategories.includes(entry.type));
    }

    currentEntries = filteredEntries
      .slice(0, visibleEntries)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  };

  const shareOnTwitter = (entry, text) => {
    let shareUrl = '';

    if (entry && entry.type === 'article') {
      if (entry.external_link && entry.external_link.url) {
        shareUrl = entry.external_link.url;
      } else {
        shareUrl = `https://lolesports.com/article/${encodeURIComponent(entry.title)}/${encodeURIComponent(entry.uid)}`;
      }
    } else if (entry && entry.type === 'video') {
      if (entry.video_id) {
        shareUrl = `https://lolesports.com/video/${encodeURIComponent(entry.video_id)}`;
      } else {
        shareUrl = `https://lolesports.com/video/${encodeURIComponent(entry.uid)}`;
      }
    }

    if (shareUrl) {
      const encodedUrl = encodeURIComponent(shareUrl);
      const encodedText = encodeURIComponent(text);
      const twitterShareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
      const windowOptions = 'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=420,width=550';
      window.open(twitterShareUrl, '_blank', windowOptions);
    } else {
      console.log('Share URL is not available.');
    }
  };
</script>

{#if !loading}
         <!-- My-Slide-Section -->
          <div class="HomeHero" style="height: 500px; position: relative;">
  <img class="card-img-top" src="https://images.contentstack.io/v3/assets/bltb6530b271fddd0b1/blte299f23c6e55ebed/63bcad4899e03c1edced9b6f/VAL_Ep6_Homepage-CG-Still.jpg" alt="" style="object-fit: cover; height: 102%; width: 100%;">
  <div class="welcome-text" style="position: absolute; top: 54%; left: 50%; transform: translate(-50%, -50%); color: white; text-align: center; font-family: 'Bebas Neue', sans-serif;">
    <h1>Welcome to LeagueMag</h1>
  </div>
</div>
<div class="et_pb_text_inner">
  <h2>Latest news</h2>
  <hr>
</div>
<div class="news-container">
  <div class="row g-4">
    {#each currentEntries as entry (entry.uid)}
      <div class="col-md-6">
        <div class="card" style="background-color: transparent;">
          <a class="content-block article" href="{
            entry.type === 'article'
              ? entry.external_link?.url || `https://lolesports.com/article/${encodeURIComponent(entry.title)}/${encodeURIComponent(entry.uid)}`
              : entry.video_id
                ? `https://lolesports.com/video/${entry.video_id}`
                : `https://lolesports.com/video/${entry.uid}`
          }" target="_self">
            {#if entry.type === 'article' && entry.header_image}
              <div class="header" style="background-image: url('{entry.header_image.url || 'default_image_url'}');"></div>
            {:else if entry.type !== 'article'}
              <div class="header" style="background-image: url('{entry.thumbnail_high || entry.thumbnail_low}');"></div>
            {/if}
            <div class="description">
              <div class="content-type">{entry.type}</div>
              <div class="title">
                <div class="text">{entry.title}</div>
                <p class="card-text">
                <small class="text-createdat">{entry.created_at}</small>
                </p>
                </div>
            </div>
          </a>
        </div>
      </div>
    {/each}
  </div>
</div>
{/if}

{#if entries.length > visibleEntries}
<div class="load-more-container">
  <div class="load-more">
    <div class="load-more-button" role="button" on:click={handleLoadMore}>
      LOAD MORE
    </div>
  </div>
</div>
{/if}

<style>

.news-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.card {
  width: 100%;
  margin-bottom: 20px;
}


</style>
