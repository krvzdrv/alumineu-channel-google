/**
 * [GGL] robots.txt Worker — отдаёт текст только для /robots.txt по hostname.
 */
import { ROBOTS_BY_HOST } from './robots-bodies.js';

export default {
  fetch(request) {
    const host = new URL(request.url).hostname.toLowerCase();
    const body = ROBOTS_BY_HOST[host];
    if (!body) {
      return new Response('Not found', { status: 404 });
    }
    return new Response(body, {
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'public, max-age=3600',
      },
    });
  },
};
