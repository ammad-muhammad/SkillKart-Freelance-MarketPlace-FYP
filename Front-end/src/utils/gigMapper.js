/**
 * Map a real Gig document (from the API) into the flat shape the marketplace
 * GigCard expects. Keeps all card rendering consistent across pages.
 *
 * API gig shape: {
 *   _id, title, category, subcategory, skills[],
 *   pricing: { basic: { price } }, media: { banner, images[] },
 *   stats: { rating, reviewsCount },
 *   freelancerId: { _id, firstName, lastName, profilePicture, rating }
 * }
 */
export const mapGig = (g) => {
  const f = g.freelancerId || {};
  const freelancerName = `${f.firstName || ''} ${f.lastName || ''}`.trim() || 'Freelancer';
  return {
    id: g._id,
    title: g.title,
    image: g.media?.banner || g.media?.images?.[0] || null,
    price: g.pricing?.basic?.price ?? 0,
    rating: g.stats?.rating ? Number(g.stats.rating.toFixed(1)) : 0,
    reviews: g.stats?.reviewsCount || 0,
    freelancerId: f._id || null,
    freelancerName,
    freelancerAvatar: f.profilePicture || null,
    category: g.category,
    subcategory: g.subcategory,
    skills: g.skills || [],
  };
};

/**
 * Map a freelancer-search profile into the marketplace freelancer-card shape.
 * API profile: FreelancerProfile w/ populated userId.
 */
export const mapFreelancer = (p) => {
  const u = p.userId || {};
  const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Freelancer';
  return {
    id: String(u._id || p._id),
    name,
    title: p.title || 'Freelancer',
    rating: p.rating || u.rating || 0,
    reviews: p.completedProjects || 0,
    price: p.hourlyRate || 0,
    avatar: u.profilePicture || null,
    seed: name,
    skills: (p.skills || []).map((s) => (typeof s === 'object' ? s.name : s)).filter(Boolean),
  };
};
