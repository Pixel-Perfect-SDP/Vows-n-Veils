const axios = require('axios');

// OpenStreetMap Nominatim API for geocoding (address -> coordinates)
// Note: No API key needed for basic usage, but rate-limited
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

// Main endpoint for getting map data (geocoding)
exports.getMapData = async (req, res) => {
    const { address, lat, lon } = req.query;
    
    try {
        if (address) {
            // Geocoding: Convert address to coordinates
            const url = `${NOMINATIM_BASE_URL}/search?format=json&addressdetails=1&limit=1&q=${encodeURIComponent(address)}`;
            
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Vows-n-Veils-Wedding-App/1.0'
                }
            });
            
            if (response.data && response.data.length > 0) {
                const result = response.data[0];
                res.json({
                    lat: parseFloat(result.lat),
                    lon: parseFloat(result.lon),
                    display_name: result.display_name,
                    address: result.address
                });
            } else {
                res.status(404).json({ message: 'Address not found' });
            }
        } else if (lat && lon) {
            // Reverse geocoding: Convert coordinates to address
            const url = `${NOMINATIM_BASE_URL}/reverse?format=json&addressdetails=1&lat=${lat}&lon=${lon}`;
            
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Vows-n-Veils-Wedding-App/1.0'
                }
            });
            
            if (response.data) {
                const result = response.data;
                res.json({
                    lat: parseFloat(lat),
                    lon: parseFloat(lon),
                    display_name: result.display_name,
                    address: result.address
                });
            } else {
                res.status(404).json({ message: 'Coordinates not found' });
            }
        } else {
            res.status(400).json({ message: 'Either address or lat/lon parameters are required' });
        }
    } catch (error) {
        console.error('Map API error:', error.message);
        res.status(500).json({ 
            message: 'Error fetching map data', 
            error: error.message 
        });
    }
};

// Get nearby venues (wedding venues, hotels, event spaces)
exports.getNearbyPlaces = async (req, res) => {
    const { lat, lon, radius = 2000 } = req.query; // Increased radius for venues
    
    if (!lat || !lon) {
        return res.status(400).json({ message: 'lat and lon parameters are required' });
    }
    
    try {
        // Search for wedding venues and event spaces using Overpass API
        const overpassUrl = 'https://overpass-api.de/api/interpreter';
        const query = `
            [out:json][timeout:25];
            (
                node["amenity"~"conference_centre|community_centre|events_venue"](around:${radius},${lat},${lon});
                way["amenity"~"conference_centre|community_centre|events_venue"](around:${radius},${lat},${lon});
                relation["amenity"~"conference_centre|community_centre|events_venue"](around:${radius},${lat},${lon});
                node["tourism"~"hotel|guest_house|resort"](around:${radius},${lat},${lon});
                way["tourism"~"hotel|guest_house|resort"](around:${radius},${lat},${lon});
                relation["tourism"~"hotel|guest_house|resort"](around:${radius},${lat},${lon});
                node["leisure"~"garden|park"](around:${radius},${lat},${lon});
                way["leisure"~"garden|park"](around:${radius},${lat},${lon});
                relation["leisure"~"garden|park"](around:${radius},${lat},${lon});
                node["building"~"hotel|church|cathedral"](around:${radius},${lat},${lon});
                way["building"~"hotel|church|cathedral"](around:${radius},${lat},${lon});
                relation["building"~"hotel|church|cathedral"](around:${radius},${lat},${lon});
            );
            out center meta;
        `;
        
        const response = await axios.post(overpassUrl, query, {
            headers: {
                'Content-Type': 'text/plain'
            }
        });
        
        const venues = response.data.elements.map(element => {
            let venueType = 'venue';
            
            // Categorize venue types
            if (element.tags?.tourism === 'hotel' || element.tags?.tourism === 'resort' || element.tags?.building === 'hotel') {
                venueType = 'hotel';
            } else if (element.tags?.amenity === 'conference_centre' || element.tags?.amenity === 'events_venue') {
                venueType = 'event_space';
            } else if (element.tags?.building === 'church' || element.tags?.building === 'cathedral') {
                venueType = 'religious';
            } else if (element.tags?.leisure === 'garden' || element.tags?.leisure === 'park') {
                venueType = 'outdoor';
            } else if (element.tags?.amenity === 'community_centre') {
                venueType = 'community';
            }

            return {
                id: element.id,
                name: element.tags?.name || 'Unnamed Venue',
                venueType: venueType,
                lat: element.lat || element.center?.lat,
                lon: element.lon || element.center?.lon,
                address: element.tags?.['addr:full'] || `${element.tags?.['addr:street'] || ''} ${element.tags?.['addr:housenumber'] || ''}`.trim(),
                phone: element.tags?.phone || null,
                website: element.tags?.website || null
            };
        }).filter(venue => venue.lat && venue.lon);
        
        res.json(venues);
    } catch (error) {
        console.error('Nearby venues API error:', error.message);
        res.status(500).json({ 
            message: 'Error fetching nearby venues', 
            error: error.message 
        });
    }
};
