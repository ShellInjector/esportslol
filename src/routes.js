import { Router } from 'svelte-spa-router';

// Import your components
import News from './components/News.svelte';
import Article from './components/Article.svelte';

// Define your routes
const routes = [
  { path: '/', component: News },
  { path: '/article/:entry.uid', component: Article },
];

// Create the router instance
const router = new Router({
  routes,
});

// Create the route renderer
const { render } = createRouteRenderer(router);

// Export the necessary functions and router instance
export { router, render };
