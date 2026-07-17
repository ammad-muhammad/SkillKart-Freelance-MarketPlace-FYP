const Job = require('../models/Job');
const Gig = require('../models/Gig');
const User = require('../models/User');
const config = require('../config');

/**
 * Dynamic sitemap generation.
 *
 * Content lives in Mongo (Railway) while the SPA is served from Vercel, so the
 * sitemap is generated here and robots.txt points crawlers at this route. That
 * keeps it live — a new job is discoverable without a frontend redeploy.
 *
 * URLs are built against FRONTEND_URL, not this API's host: the pages crawlers
 * should index are the SPA's, not the API's.
 */

// Must match publicStats.controller.js's slugify exactly — it builds the
// category/skill URLs this sitemap points at. utils/helpers.js has a *different*
// slugify (no '&' → 'and'), which would silently produce 404s here.
const slugify = (s) =>
  String(s).toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const CACHE_TTL_MS = 60 * 60 * 1000; // 1h — crawlers don't need real-time
let cache = { xml: null, generatedAt: 0 };

/**
 * Static, always-indexable pages. Anything behind auth, transactional, or
 * user-specific is deliberately absent (and Disallowed in robots.txt).
 * changefreq/priority are hints only; Google largely ignores them, but other
 * engines still read them.
 */
const STATIC_ROUTES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/browse-projects', changefreq: 'hourly', priority: '0.9' },
  { path: '/browse-freelancers', changefreq: 'hourly', priority: '0.9' },
  { path: '/categories', changefreq: 'weekly', priority: '0.8' },
  { path: '/post-project', changefreq: 'monthly', priority: '0.7' },
  { path: '/ai-matchmaking', changefreq: 'monthly', priority: '0.6' },
  { path: '/ai/buddy', changefreq: 'monthly', priority: '0.5' },
  { path: '/ai/cost-estimator', changefreq: 'monthly', priority: '0.5' },
  { path: '/about', changefreq: 'monthly', priority: '0.5' },
  { path: '/contact', changefreq: 'monthly', priority: '0.5' },
  { path: '/help', changefreq: 'monthly', priority: '0.4' },
  { path: '/privacy-policy', changefreq: 'yearly', priority: '0.3' },
  { path: '/terms', changefreq: 'yearly', priority: '0.3' },
  { path: '/cookies', changefreq: 'yearly', priority: '0.3' },
  { path: '/services-agreement', changefreq: 'yearly', priority: '0.3' }
];

/** XML-escape. Titles/slugs are user-authored — an unescaped & breaks the doc. */
const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const toW3C = (date) => new Date(date || Date.now()).toISOString();

const urlEntry = ({ loc, lastmod, changefreq, priority }) => {
  const parts = [`    <loc>${esc(loc)}</loc>`];
  if (lastmod) parts.push(`    <lastmod>${toW3C(lastmod)}</lastmod>`);
  if (changefreq) parts.push(`    <changefreq>${changefreq}</changefreq>`);
  if (priority) parts.push(`    <priority>${priority}</priority>`);
  return `  <url>\n${parts.join('\n')}\n  </url>`;
};

/**
 * The SPA's canonical origin, without a trailing slash.
 * Uses PUBLIC_SITE_URL — not the FRONTEND_URL CORS list, whose first entry is an
 * arbitrary allowed origin and would advertise the wrong domain to crawlers.
 */
const siteOrigin = () => String(config.frontend.publicUrl || '').trim().replace(/\/+$/, '');

/**
 * Collects every public URL. Each source is independently guarded: one failing
 * collection (or an empty collection) must not produce an empty sitemap.
 */
const collectUrls = async () => {
  const origin = siteOrigin();
  const urls = STATIC_ROUTES.map((r) => ({
    loc: `${origin}${r.path}`,
    changefreq: r.changefreq,
    priority: r.priority
  }));

  const safe = async (label, fn) => {
    try {
      return await fn();
    } catch (err) {
      console.warn(`[sitemap] skipped ${label}: ${err.message}`);
      return [];
    }
  };

  // Open jobs
  const jobs = await safe('jobs', () =>
    Job.find({ status: 'open' }).select('_id updatedAt').sort({ updatedAt: -1 }).limit(5000).lean()
  );
  jobs.forEach((j) =>
    urls.push({
      loc: `${origin}/jobs/${j._id}`,
      lastmod: j.updatedAt,
      changefreq: 'weekly',
      priority: '0.7'
    })
  );

  // Active gigs
  const gigs = await safe('gigs', () =>
    Gig.find({ status: 'active' }).select('_id updatedAt category').sort({ updatedAt: -1 }).limit(5000).lean()
  );
  gigs.forEach((g) =>
    urls.push({
      loc: `${origin}/gigs/${g._id}`,
      lastmod: g.updatedAt,
      changefreq: 'weekly',
      priority: '0.7'
    })
  );

  // Public freelancer profiles
  const freelancers = await safe('freelancers', () =>
    User.find({ role: 'freelancer', isActive: true })
      .select('_id updatedAt')
      .sort({ updatedAt: -1 })
      .limit(5000)
      .lean()
  );
  freelancers.forEach((u) =>
    urls.push({
      loc: `${origin}/freelancers/${u._id}`,
      lastmod: u.updatedAt,
      changefreq: 'weekly',
      priority: '0.6'
    })
  );

  // Category pages, derived from the categories that actually have live gigs.
  const categories = await safe('categories', () => Gig.distinct('category', { status: 'active' }));
  categories.filter(Boolean).forEach((c) =>
    urls.push({
      loc: `${origin}/skills/${slugify(c)}`,
      changefreq: 'weekly',
      priority: '0.6'
    })
  );

  return urls;
};

const buildXml = (urls) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(urlEntry).join('\n') +
  `\n</urlset>\n`;

/**
 * @param {boolean} [force] bypass the cache
 * @returns {Promise<{ xml: string, count: number, cached: boolean }>}
 */
const generateSitemap = async (force = false) => {
  const fresh = Date.now() - cache.generatedAt < CACHE_TTL_MS;
  if (!force && cache.xml && fresh) {
    return { xml: cache.xml, count: cache.count, cached: true };
  }

  const urls = await collectUrls();
  const xml = buildXml(urls);
  cache = { xml, count: urls.length, generatedAt: Date.now() };
  return { xml, count: urls.length, cached: false };
};

/**
 * robots.txt for the API host itself. The API must never be indexed, but the
 * sitemap it serves still needs advertising — so this points at this host's own
 * /sitemap.xml (a crawler reaching the API host has no other way to find it).
 * `Disallow: /` and `Sitemap:` are independent directives; the sitemap is still
 * fetched and its (frontend) URLs crawled.
 */
const apiRobots = (apiOrigin) =>
  ['User-agent: *', 'Disallow: /', '', `Sitemap: ${apiOrigin}/sitemap.xml`, ''].join('\n');

module.exports = { generateSitemap, collectUrls, slugify, STATIC_ROUTES, apiRobots };
