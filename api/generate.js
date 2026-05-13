// Vercel Serverless Function — /api/generate
// Pipeline 2 etapas:
//   1. GPT-4o recebe os dados do caso e escreve um prompt curto, visual e otimizado para gpt-image-1
//   2. gpt-image-1 gera a imagem a partir desse prompt
// A chave da OpenAI fica APENAS aqui, no servidor.

// ─────────────────────────────────────────────────────────────────────────────
// Sistema do GPT-4o — escreve o prompt final para o gpt-image-1
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT_GPT4O = `
You are an expert image prompt writer for gpt-image-1.
Your job: receive vehicle accident data and write ONE short, visually precise image generation prompt.

OUTPUT FORMAT: plain text only. No explanation, no preamble, no markdown.
Start directly with the image description. Max 600 words.

════════ MANDATORY STYLE (always include this exact phrasing) ════════
Begin every prompt with:
"Photorealistic top-down aerial drone photograph, 90-degree nadir view from 12-meter altitude. Like Google Maps satellite at maximum zoom. Ultra-sharp, high-resolution, documentary style. Three equal rectangular panels stacked vertically, separated by thick black lines. White border area outside panels. Title 'CROQUI TÉCNICO DE SINISTRO VEICULAR' in bold black uppercase at top-left above all panels."

════════ PANEL LABELS (exact text, copy verbatim) ════════
- Panel 1 label: "Fase 1 - Deslocamento inicial"
- Panel 2 label: "Fase 2 - Evento / colisão"  ← NOTE: "colisão" with tilde on ã
- Panel 3 label: "Fase 3 - Posição final"

════════ CAMERA — ABSOLUTE RULE ════════
Every single panel: camera directly above, 90° downward. You see ONLY the vehicle ROOF/TOP.
NEVER lateral view, NEVER 3/4, NEVER perspective, NEVER side view.
If any panel shows the side of a vehicle, the prompt has failed.

════════ STYLE DETAILS ════════
- Road surface: photorealistic texture seen from above (dirt road = brown earth with tire tracks, pebbles, dust; asphalt = dark gray with lane markings)
- Roadside: natural grass or shoulder visible at edges (realistic, not invented elements)
- Vehicles: realistic paint, roof panel details, windshield reflection from above, subtle shadow on ground
- Lighting: even daylight, overhead sun, no dramatic shadows
- NOT cartoon, NOT sketch, NOT line drawing, NOT illustration, NOT artistic render

════════ SPATIAL REASONING — do this before writing ════════
For each vehicle:
A. What color and type? (these MUST be identical in all 3 panels)
B. Which direction is the hood pointing?
C. Which direction is the vehicle physically moving?
D. REVERSE RULE: if reversing → hood points OPPOSITE to movement → dashed red arrow points in actual movement direction
E. STATIONARY → no arrow at all
F. What label (V1/V2)? Label = property of physical vehicle, never changes between panels

════════ PANEL-BY-PANEL RULES ════════
PANEL 1 — Initial movement:
- Vehicle(s) in starting position
- Red directional arrow(s) for moving vehicles
- Road features (potholes, obstacles) visible AHEAD of the vehicle in its path, clearly separated from it
- Small V1/V2 label near each vehicle

PANEL 2 — Event:
- Vehicle has reached the event point
- IF POTHOLE: the specific wheel is INSIDE the pothole — wheel and pothole OVERLAP. Displaced dirt/gravel around the rim. Front corner of vehicle appears dropped into hole. NOT separate from vehicle.
- IF COLLISION: vehicles touching at exact contact point. Starburst/impact mark between them.
- Red arrow still showing movement direction
- V1/V2 label on each vehicle

PANEL 3 — Final position:
- Vehicles stopped. NO arrows. NO rotation/movement from Panel 2 position unless stated.
- IF FIRE: LARGE realistic orange-red flames ON the vehicle at the exact stated sector (front-right, rear-left, etc.). Flames cover 30-40% of that sector. Highly visible from above. Dark smoke cloud above the burning area.
- IF COLLISION: visible crumple/deformation marks on both vehicles at contact zone.
- V1/V2 label on each vehicle

════════ LABEL RULE ════════
V1 label appears on the same physical vehicle (identified by color+type) in ALL THREE panels.
V2 label same. NEVER swap. If silver truck = V1 in panel 1, silver truck = V1 in panels 2 and 3.

════════ FORBIDDEN ════════
NO humans, NO houses, NO fences (unless stated in case). NO legends/callout boxes with explanatory text. NO extra text besides panel labels and V1/V2 roof labels. NO invented elements not in case data.
`.trim();

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────────────────────────────────────
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
    // ── ETAPA 1: GPT-4o escreve prompt visual otimizado ──
    const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT_GPT4O },
          { role: 'user',   content: prompt.trim() },
        ],
        max_tokens: 1200,
        temperature: 0.15,
      }),
    });

    if (!gptRes.ok) {
      const err = await gptRes.json();
      throw new Error('GPT-4o: ' + (err?.error?.message || gptRes.status));
    }

    const gptData  = await gptRes.json();
    const imagePrompt = gptData.choices?.[0]?.message?.content?.trim();
    if (!imagePrompt) throw new Error('GPT-4o não retornou prompt.');

    // ── ETAPA 2: gpt-image-1 gera a imagem ──
    const imgRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:   'gpt-image-1',
        prompt:  imagePrompt,
        n:       1,
        size:    '1024x1536',
        quality: 'high',
      }),
    });

    const imgData = await imgRes.json();
    if (!imgRes.ok || imgData.error) {
      throw new Error(imgData?.error?.message || `gpt-image-1 HTTP ${imgRes.status}`);
    }

    const b64 = imgData.data?.[0]?.b64_json;
    if (!b64) throw new Error('Sem imagem na resposta.');

    return res.status(200).json({
      b64,
      safe_prompt: `── Prompt gerado pelo GPT-4o ──\n${imagePrompt}`,
    });

  } catch (err) {
    return res.status(500).json({ error: 'Erro interno: ' + err.message });
  }
}
