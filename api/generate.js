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
    // ── PASSO 1: GPT-4o converte o relato em linguagem segura e estruturada para o DALL-E ──
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
            content: `You are a DALL-E 3 prompt engineer for traffic engineering technical diagrams used in insurance documentation.

YOUR ONLY OUTPUT: a single rewritten DALL-E 3 prompt. No explanations, no comments, no preamble. Start directly with the diagram description.

═══════════════════════════════════════════
MANDATORY STRUCTURE — PRESERVE EXACTLY
═══════════════════════════════════════════
The output prompt MUST open with this exact block:

"Technical traffic engineering diagram on white background, portrait format. Three separate rectangular panels stacked vertically, divided by thick horizontal black lines, like a technical document. Each panel label printed in small bold black text at the top-left of each panel. Panel 1 (top): 'Fase 1 - Deslocamento inicial'. Panel 2 (middle): 'Fase 2 - Ponto do evento'. Panel 3 (bottom): 'Fase 3 - Posição final'. Title 'CROQUI TÉCNICO VEICULAR' printed in the very top-left corner of the full image in small clean font."

Then describe each of the three panels using the spatial data from the input, maintaining the correct sequence.

═════════════════════════════
MANDATORY VISUAL STYLE
═════════════════════════════
- VIEW: Strict orthographic overhead view. Camera pointing straight down at 90 degrees. Like a satellite map, a floor plan, or an urban planning diagram. ZERO perspective. ZERO isometric tilt. ZERO 3D depth. ZERO elevation angle.
- VEHICLES: Simple flat colored rectangles or rounded rectangles, viewed from directly above, like symbols on a map or a board game piece. Respect the vehicle color stated in the input. Label each vehicle V1, V2, V3 in small black text beside each shape.
- ROAD: Flat 2D lines for lane markings and center lines. No texture. No shading. Flat gray fill for road surface.
- ARROWS: Flat red directional arrows showing movement trajectories.
- ABSOLUTELY NO: people, human figures, riders, passengers, helmets, silhouettes of humans.
- FIRE/COMBUSTION: Only represent fire if explicitly stated in the incident report. If present, show it as flat 2D orange and red schematic indicator shapes (simple flat circles or irregular patches) around the vehicle — NOT as photorealistic flames, NOT as volumetric smoke. A small flat orange zone symbol is sufficient.
- ABSOLUTELY NO: dramatic lighting, lens flare, motion blur, volumetric smoke, cinematic explosion effects.
- ABSOLUTELY NO: legends, color keys, callout boxes, narrative text inside panels (only V1/V2/V3 labels and panel titles are allowed).
- STYLE: clean flat engineering blueprint. Traffic analysis schematic. 2D map-style symbols. Not artistic. Not photorealistic. Not cinematic.

═══════════════════════════════════
SAFETY WORD REPLACEMENTS
═══════════════════════════════════
These words trigger DALL-E safety filters — replace every instance:
accident, crash, collision, injury, damage, impact, smash, wreck, victim, hurt
→ replace with: "contact point", "vehicle displacement", "trajectory deviation", "structural deformation area", "final resting position", "vehicle contact zone"

sinistro, colisão, acidente, dano, batida, atropelamento, capotamento, explosão, sangue
→ replace with the same neutral equivalents above

EXCEPTION: "fire", "fogo", "incêndio", "chamas" may be kept if they appear in the incident data, but must be described as "flat 2D thermal event indicator (orange zone symbol)" — never as photorealistic flames.

══════════════════════════
PRESERVE ALL SPATIAL DATA
══════════════════════════
Carry over ALL of the following from the input, exactly:
- Lane position of each vehicle (left lane, right lane, shoulder, etc.)
- Vehicle colors and types
- Direction of travel for each vehicle
- Road type (urban, highway, dirt road, etc.) and lane count
- Nature of the event (trajectory deviation, contact zone, loss of directional control, etc.)
- Final resting position of each vehicle
- Any fixed elements mentioned (wall, pole, ditch/canal, guardrail, curb, tree, etc.)
- Left/right orientation MUST be relative to each vehicle's direction of travel, not the image side.`
          },
          {
            role: 'user',
            content: prompt.trim(),
          }
        ],
        max_tokens: 1600,
        temperature: 0.1,
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

    // ── PASSO 2: DALL-E 3 gera a imagem em formato retrato (3 painéis verticais) ──
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
        size: '1024x1792',   // retrato — ideal para 3 painéis empilhados verticalmente
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
      safe_prompt: safePrompt,
    });

  } catch (err) {
    return res.status(500).json({ error: 'Erro interno: ' + err.message });
  }
}
