const { v4: uuidv4 } = require('uuid');

// Simple in-memory sample trails generator for local/dev and Azure Static Web Apps
// Accepts query params: latitude, longitude, maxDistance, page, limit
exports.getTrailsNear = async (req, res) => {
  try {
    const qlat = parseFloat(req.query.latitude);
    const qlon = parseFloat(req.query.longitude);
    const maxDistance = parseInt(req.query.maxDistance) || 10000;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);

    // Default coordinates: -26.1569, 28.0020
    const latitude = Number.isFinite(qlat) ? qlat : -26.1569;
    const longitude = Number.isFinite(qlon) ? qlon : 28.0020;

    // Create dummy data matching the schema
    const total = 100; // pretend there are 100 trails

    // For determinism, make distances based on index
    const trails = [];
    const start = (page - 1) * limit;
    for (let i = 0; i < limit; i++) {
      const idx = start + i;
      if (idx >= total) break;

      const tlat = latitude + (i + 1) * 0.001; // small offset
      const tlon = longitude + (i + 1) * 0.001;

      trails.push({
        name: `Trail ${idx + 1}`,
        location: {
          latitude: Number(tlat.toFixed(6)),
          longitude: Number(tlon.toFixed(6))
        },
        distance: Math.round((i + 1) * 250),
        elevationGain: Math.round((i + 1) * 10),
        difficulty: ['Easy', 'Moderate', 'Hard'][idx % 3],
        tags: ['scenic', 'loop'],
        gpsRoute: [
          { latitude: Number(latitude.toFixed(6)), longitude: Number(longitude.toFixed(6)) },
          { latitude: Number(tlat.toFixed(6)), longitude: Number(tlon.toFixed(6)) }
        ],
        description: `A pleasant ${['easy','moderate','challenging'][idx % 3]} trail near the area.`,
        photos: [],
        status: 'open',
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        id: uuidv4()
      });
    }

    const response = {
      success: true,
      data: trails,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };

    res.json(response);
  } catch (err) {
    console.error('Trails API error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
