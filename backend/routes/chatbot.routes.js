const express = require('express');
const router = express.Router();

/**
 * @swagger
 * /api/chatbot/answer:
 *   post:
 *     summary: Find answer using Hugging Face AI
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - question
 *               - faqQuestions
 *             properties:
 *               question:
 *                 type: string
 *               faqQuestions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: AI response with similarity scores
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Server error
 */
router.post('/answer', async (req, res) => {
    try {
        const { question, faqQuestions } = req.body;

        if (!question || !faqQuestions || !Array.isArray(faqQuestions)) {
            return res.status(400).json({ error: 'Missing question or faqQuestions array' });
        }

        const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
        if (!HF_API_KEY) {
            return res.status(500).json({ error: 'Hugging Face API key not configured' });
        }

        // THIS IS WHERE WE CALL HUGGING FACE API
        const response = await fetch(
            'https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/sentence-similarity',

        {
            method: 'POST',
                headers: {
                'Authorization': `Bearer ${HF_API_KEY}`,
                    'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: {
                    source_sentence: question,
                    sentences: faqQuestions
                }
            })
        }
    );

if (!response.ok) {
    const errorText = await response.text();
    console.error('Hugging Face API error:', errorText);
    return res.status(response.status).json({
        error: 'Hugging Face API error',
        details: errorText
    });
}

const scores = await response.json();
res.json({ scores });

  } catch (err) {
    console.error('Chatbot API error:', err);
    res.status(500).json({ error: err.message });
}
});

module.exports = router;