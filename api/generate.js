// Vercel Serverless Function — /api/generate
// A chave da OpenAI fica APENAS aqui, no servidor.
// O frontend chama /api/generate e nunca vê a chave.

export default async function handler(req, res) {
  // Apenas POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 20) {
    return res.status(400).json({ error: 'Prompt inválido ou muito curto.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Chave da API não configurada no servidor.' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt.trim(),
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        response_format: 'url',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const msg = data?.error?.message || `Erro HTTP ${response.status}`;
      return res.status(response.status).json({ error: msg });
    }

    return res.status(200).json({ url: data.data[0].url });

  } catch (err) {
    return res.status(500).json({ error: 'Erro interno ao chamar a OpenAI: ' + err.message });
  }
}
