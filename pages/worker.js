// Pages supports a www custom domain while DNS stays with MuuMuu.
// Send only API/admin traffic to the existing authenticated Worker and D1.
export default {
  fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path.startsWith('/api/') || path === '/admin' || path.startsWith('/admin/')) {
      return env.BACKEND.fetch(request);
    }
    return env.ASSETS.fetch(request);
  }
};
