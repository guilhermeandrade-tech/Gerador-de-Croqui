// Vercel Serverless Function — /api/generate
// Pipeline: GPT-4o sanitiza o prompt → gpt-image-1 gera a imagem
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
    // ── PASSO 1: GPT-4o converte o relato em linguagem segura e estruturada para o gpt-image-1 ──
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
            content: `You are a prompt engineer for gpt-image-1, specializing in traffic engineering diagrams for insurance documentation.

YOUR ONLY OUTPUT: a single image generation prompt. No explanations, no comments, no preamble.

════════════════════════════════════════════════
MANDATORY LAYOUT — DO NOT ALTER
════════════════════════════════════════════════
Start every prompt with:
"Technical aerial traffic diagram, portrait orientation, white background. Three rectangular panels stacked vertically separated by thick black horizontal lines. Title 'CROQUI TÉCNICO VEICULAR' in top-left corner above all panels. Panel headers in bold black text top-left of each panel: Panel 1 = 'Fase 1 - Deslocamento inicial', Panel 2 = 'Fase 2 - Ponto do evento', Panel 3 = 'Fase 3 - Posição final'."

Then describe each panel individually.

════════════════════════════════════════════════
CRITICAL: HORIZONTAL ROAD ORIENTATION
════════════════════════════════════════════════
In ALL panels, the road MUST run HORIZONTALLY across the full width of the panel — from the left edge to the right edge. The road is a wide horizontal band crossing each panel. Vehicles move left→right (or right→left based on stated direction). NEVER show a road going vertically (top to bottom). NEVER show a road going diagonally.

════════════════════════════════════════════════
VISUAL STYLE
════════════════════════════════════════════════
- VIEW: Aerial top-down view, camera at exactly 90° pointing straight down. Like satellite or drone imagery. Zero tilt, zero perspective, zero isometric angle.
- VEHICLES: Realistic vehicles seen from directly above — correct shape and color for the vehicle type stated. Label each V1, V2, V3 in small bold text on or beside the vehicle.
- ROAD: Realistic texture appropriate to road type (dirt road = sandy/dusty texture with tire tracks; asphalt = gray with lane markings).
- ARROWS: Bold red arrows overlaid on the scene showing actual movement that occurred. Only show movement that is explicitly stated in the incident data.
- NO people, riders, passengers, or human silhouettes.
- NO invented movement: do not add rotation, spin, slide, or any vehicle motion not stated in the incident data.
- Fire/flames: only if stated in incident data. Show as aerial view of fire at the SPECIFIC VEHICLE SECTOR stated (front, rear, left side, right side). Fire must be ON the vehicle at the correct location, not floating nearby.
- NO legends, callout boxes, or explanatory text beyond V1/V2/V3 labels and panel titles.

════════════════════════════════════════════════
PHASE-BY-PHASE ACCURACY
════════════════════════════════════════════════
Translate the incident data into EXACTLY three panels:
- Panel 1 (Fase 1): vehicles in starting positions in their correct lanes, traveling horizontally, with directional red arrow.
- Panel 2 (Fase 2): only the event that actually happened — show the vehicle at the moment of the described event (e.g. front wheel at a road surface feature). Do NOT add any movement, rotation, or effect not described. Show the road feature (hole, bump, etc.) at the correct position relative to the vehicle.
- Panel 3 (Fase 3): vehicle at its final resting position exactly as described. Any fire/damage shown only at the specific sector stated.

════════════════════════════════════════════════
SAFETY WORD REPLACEMENTS
════════════════════════════════════════════════
Replace these words to avoid content filter:
accident, crash, collision, injury, damage, impact, smash, wreck, victim, hurt
→ "contact point", "vehicle displacement", "trajectory deviation", "structural deformation area", "final resting position"

sinistro, colisão, acidente, dano, batida, atropelamento, capotamento, explosão, sangue
→ same neutral equivalents

EXCEPTION: fire/fogo/incêndio/chamas may remain if in the incident data.

════════════════════════════════════════════════
PRESERVE ALL SPATIAL DATA
════════════════════════════════════════════════
Carry over exactly: lane positions, vehicle colors and types, direction of travel, road type and configuration, event details, final position, any fixed elements (wall, pole, ditch, etc.).
Left/right always relative to the vehicle's direction of travel, not the image side.`
          },
          {
            role: 'user',
            content: prompt.trim(),
          }
        ],
        max_tokens: 1800,
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

    // ── PASSO 2: gpt-image-1 gera a imagem em formato retrato (3 painéis verticais) ──
    const imageRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: safePrompt,
        n: 1,
        size: '1024x1536',   // retrato — ideal para 3 painéis empilhados verticalmente
        quality: 'high',     // máxima qualidade
      }),
    });

    const imageData = await imageRes.json();

    if (!imageRes.ok || imageData.error) {
      const msg = imageData?.error?.message || `Erro HTTP ${imageRes.status}`;
      return res.status(imageRes.status).json({ error: msg });
    }

    // gpt-image-1 retorna base64
    const b64 = imageData.data[0].b64_json;

    return res.status(200).json({
      b64,
      safe_prompt: safePrompt,
    });

  } catch (err) {
    return res.status(500).json({ error: 'Erro interno: ' + err.message });
  }
}
