
const axios = require('axios');
const VISUAL_CROSSING_API_KEY = '2VPYZFP3UHJYDW7RSW4NGT3Q9'; // Replace with your actual API key

// Example: GET weather data for a location and date
exports.getAllWeatherCrossings = async (req, res) => {
    // Example: Accept location and date as query params
    const { location = 'New York,NY', date = '' } = req.query;
    try {
        // Build Visual Crossing API URL
        let url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodeURIComponent(location)}`;
        if (date) url += `/${date}`;
        url += `?key=${VISUAL_CROSSING_API_KEY}`;

        const response = await axios.get(url);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching weather data', error: error.message });
    }
};

exports.getWeatherCrossingById = (req, res) => {
    const crossing = weatherCrossings.find(wc => wc.id === req.params.id);
    if (crossing) {
        res.json(crossing);
    } else {
        res.status(404).json({ message: 'Weather Crossing not found' });
    }
};

exports.createWeatherCrossing = (req, res) => {
    const newCrossing = { id: Date.now().toString(), ...req.body };
    weatherCrossings.push(newCrossing);
    res.status(201).json(newCrossing);
};

exports.updateWeatherCrossing = (req, res) => {
    const index = weatherCrossings.findIndex(wc => wc.id === req.params.id);
    if (index !== -1) {
        weatherCrossings[index] = { ...weatherCrossings[index], ...req.body };
        res.json(weatherCrossings[index]);
    } else {
        res.status(404).json({ message: 'Weather Crossing not found' });
    }
};

exports.deleteWeatherCrossing = (req, res) => {
    const index = weatherCrossings.findIndex(wc => wc.id === req.params.id);
    if (index !== -1) {
        const deleted = weatherCrossings.splice(index, 1);
        res.json(deleted[0]);
    } else {
        res.status(404).json({ message: 'Weather Crossing not found' });
    }
};
