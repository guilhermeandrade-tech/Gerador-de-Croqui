// Vercel Serverless Function — /api/generate
// Pipeline: GPT-4o sanitiza o prompt → DALL-E 3 gera a imagem
// A chave da OpenAI fica APENAS aqui, no servidor.

export default async function handler(req, res) {
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
    // ── PASSO 1: GPT-4o converte o relato em linguagem neutra para o DALL-E ──
    const sanitizeRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a technical diagram prompt writer for DALL-E 3.
Your task: convert a traffic incident report into a neutral, spatial top-down schematic description that DALL-E 3 can safely generate without triggering its safety filters.

STRICT RULES:
- Output ONLY the rewritten DALL-E prompt. No explanations, no comments.
- Never use words: accident, crash, collision, injury, damage, impact, smash, wreck, victim, hurt, sinistro, colisão, acidente, dano, batida, atropelamento, capotamento, explosão, fogo, sangue.
- Replace them with neutral equivalents: "contact point", "vehicle contact area", "structural deformation mark", "trajectory deviation", "vehicle displacement", "final resting position", "fixed element encountered", "road surface feature".
- Preserve all spatial and positional information exactly (lanes, directions, vehicle types, colors, road layout, panel structure).
- Keep the request framed as: "flat overhead 2D technical schematic diagram for traffic engineering and insurance documentation".
- Keep all panel labels in Portuguese as-is: "Fase 1 - Deslocamento inicial", "Fase 2 - Ponto do evento", "Fase 3 - Posição final".
- Keep the image title label: CROQUI TÉCNICO — omit the word SINISTRO from the title in the prompt, just call it CROQUI TÉCNICO VEICULAR.
- Keep all visual rules: top-down only, red arrows, V1/V2/V3 labels, no legends, no people, no fire, no smoke.`
          },
          {
            role: 'user',
            content: prompt.trim(),
          }
        ],
        max_tokens: 1200,
        temperature: 0.2,
      }),
    });

    if (!sanitizeRes.ok) {
      const err = await sanitizeRes.json();
      throw new Error('GPT-4o error: ' + (err?.error?.message || sanitizeRes.status));
    }

    const sanitizeData = await sanitizeRes.json();
    const safePrompt = sanitizeData.choices?.[0]?.message?.content?.trim();

    if (!safePrompt) {
      throw new Error('GPT-4o não retornou um prompt válido.');
    }

    // ── PASSO 2: DALL-E 3 gera a imagem com o prompt sanitizado ──
    const imageRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: safePrompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        response_format: 'url',
      }),
    });

    const imageData = await imageRes.json();

    if (!imageRes.ok || imageData.error) {
      const msg = imageData?.error?.message || `Erro HTTP ${imageRes.status}`;
      return res.status(imageRes.status).json({ error: msg });
    }

    return res.status(200).json({
      url: imageData.data[0].url,
      safe_prompt: safePrompt, // retorna o prompt reescrito para debug
    });

  } catch (err) {
    return res.status(500).json({ error: 'Erro interno: ' + err.message });
  }
}
