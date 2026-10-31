const router = require('express').Router();

const branches = [
  {
    id: 'Qasimabad',
    query: 'Dr MK & Associates Dental Care Center Qasimabad Hyderabad, Pakistan',
    googleUrl: 'https://maps.app.goo.gl/pdrTaQZu8ChGwsZRA',
  },
  {
    id: 'Mithi',
    query: 'Dr Munesh Kumar & Associates Dental Implant & Facial Surgery Clinic Mithi, Pakistan',
    googleUrl: 'https://maps.app.goo.gl/FkKCoHvEY1aLYkLk8',
  },
];
const cacheDuration = 15 * 60 * 1000;
let cachedResult;

router.get('/', async (_req, res, next) => {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return res.json({ configured: false, branches: [] });
  if (cachedResult && cachedResult.expiresAt > Date.now()) return res.json(cachedResult.data);

  try {
    const results = await Promise.all(branches.map(async (branch) => {
      const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.rating,places.userRatingCount,places.reviews,places.googleMapsUri',
        },
        body: JSON.stringify({
          textQuery: branch.query,
          maxResultCount: 1,
          languageCode: 'en',
        }),
      });

      if (!response.ok) {
        const details = await response.text();
        console.error(`Google Places lookup failed for ${branch.id}: ${response.status} ${details}`);
        throw new Error('Google reviews could not be loaded. Please try again later.');
      }

      const data = await response.json();
      const place = data.places?.[0];
      return {
        id: branch.id,
        googleUrl: branch.googleUrl,
        rating: place?.rating ?? null,
        reviewCount: place?.userRatingCount ?? null,
        googleMapsUri: place?.googleMapsUri || branch.googleUrl,
        reviews: (place?.reviews || []).map((review) => ({
          rating: review.rating,
          text: review.text?.text || '',
          publishTime: review.publishTime || null,
          authorName: review.authorAttribution?.displayName || 'Google user',
          authorUrl: review.authorAttribution?.uri || branch.googleUrl,
        })),
      };
    }));

    const result = { configured: true, branches: results };
    cachedResult = { data: result, expiresAt: Date.now() + cacheDuration };
    res.json(result);
  } catch (error) {
    if (error.message === 'Google reviews could not be loaded. Please try again later.') {
      return res.status(502).json({ message: error.message });
    }
    next(error);
  }
});

module.exports = router;
