module.exports = async function handler(req, res) {
    // Allow requests from any origin
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { hvacType, buildingAge, buildingSize, energyBill, score } = req.body;

        const prompt = `You are an energy efficiency consultant working with Trane Technologies. Based on the following building profile, provide 6-8 specific, actionable recommendations for improving energy efficiency. Format each recommendation as a single line starting with a relevant emoji.

Building Profile:
- Age: ${buildingAge} years
- Size: ${buildingSize} square feet
- HVAC System: ${hvacType}
- Monthly Energy Bill: $${energyBill}
- Energy Efficiency Score: ${score}/100

Provide practical, measurable recommendations specific to this building profile.`;

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'mistralai/mistral-7b-instruct:free',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('OpenRouter error:', errorData);
            return res.status(500).json({ error: 'OpenRouter API failed', details: errorData });
        }

        const data = await response.json();
        const recommendations = data.choices[0].message.content
            .split('\n')
            .filter(line => line.trim().length > 0)
            .map(line => line.trim());

        return res.status(200).json({ recommendations });

    } catch (error) {
        console.error('Handler error:', error);
        return res.status(500).json({ error: error.message });
    }
}