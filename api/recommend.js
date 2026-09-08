module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { hvacType, buildingAge, buildingSize, energyBill, score } = req.body;

        const prompt = `You are an energy efficiency consultant working with Trane Technologies. Based on the following building profile, provide exactly 6 specific actionable recommendations for improving energy efficiency. Format each recommendation as a single line starting with a relevant emoji. Put each recommendation on its own line.

Building Profile:
- Age: ${buildingAge} years
- Size: ${buildingSize} square feet
- HVAC System: ${hvacType}
- Monthly Energy Bill: $${energyBill}
- Energy Efficiency Score: ${score}/100

Provide 6 recommendations, one per line, each starting with an emoji.`;

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://parker-dewey.vercel.app',
                'X-Title': 'Energy Efficiency Checker'
            },
            body: JSON.stringify({
                model: 'mistralai/mistral-7b-instruct:free',
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 800,
                temperature: 0.7
            })
        });

        const data = await response.json();
        console.log('OpenRouter response:', JSON.stringify(data));

        // Check if response is valid
        if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
            console.error('Invalid response structure:', JSON.stringify(data));
            return res.status(500).json({ 
                error: 'Invalid AI response',
                details: JSON.stringify(data)
            });
        }

        const content = data.choices[0].message.content;
        console.log('AI content:', content);

        const recommendations = content
            .split('\n')
            .filter(line => line.trim().length > 0)
            .map(line => line.trim());

        return res.status(200).json({ recommendations });

    } catch (error) {
        console.error('Handler error:', error);
        return res.status(500).json({ error: error.message });
    }
}