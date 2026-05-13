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
    // ── PASSO 1: GPT-4o converte o relato em prompt seguro para o gpt-image-1 ──
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
            content: `You are a prompt engineer for gpt-image-1, creating aerial traffic diagrams for insurance documentation.

YOUR ONLY OUTPUT: one image generation prompt. No explanations, no comments.

════════════════════════════════════════════════
MANDATORY DOCUMENT LAYOUT
════════════════════════════════════════════════
Begin every prompt with:
"Portrait-format technical document on white background. Three rectangular panels stacked vertically, each separated by a thick black horizontal line. Title 'CROQUI TÉCNICO VEICULAR' in small bold font at top-left above all panels. Each panel has a bold label at its top-left: Panel 1 = 'Fase 1 - Deslocamento inicial', Panel 2 = 'Fase 2 - Ponto do evento', Panel 3 = 'Fase 3 - Posição final'."

Then describe each panel.

════════════════════════════════════════════════
CAMERA ANGLE — THIS IS THE MOST IMPORTANT RULE
════════════════════════════════════════════════
ALL panels use STRICTLY a straight-down bird's-eye view.
Imagine a camera mounted on a helicopter pointing STRAIGHT DOWN at the road below.
You see the ROOF/TOP SURFACE of every vehicle — never the side, never the front face, never the rear face.
The road surface is visible as a flat horizontal band from this overhead perspective.
This is like Google Maps satellite view or an aerial photograph taken from directly above.

NEVER: side view, profile view, lateral view, 3/4 view, isometric view, perspective view.
NEVER: show the side doors, side windows, headlights from the front, or tail lights from the rear.
ALWAYS: show the roof, roof panel, and top surfaces of the vehicles.

════════════════════════════════════════════════
VEHICLE DIRECTION IN BIRD'S-EYE VIEW
════════════════════════════════════════════════
When a vehicle travels from left to right, as seen from directly above:
- The front of the vehicle (hood/bonnet top surface) points toward the right side of the panel.
- The rear of the vehicle (trunk/boot top surface) points toward the left side of the panel.
- You see the roof, windshield glass from above, and the top of the hood.
The vehicle is oriented horizontally in the panel with its nose pointing right.

════════════════════════════════════════════════
VISUAL STYLE
════════════════════════════════════════════════
- Realistic semi-illustrated aerial rendering — detailed, clear, technically accurate.
- Vehicles must look IDENTICAL across all three panels (same shape, same color, same style, same proportions). Only position and events differ between panels.
- Road: realistic texture seen from above (dirt road = sandy/dusty texture with tire tracks visible from above; asphalt = gray surface with lane markings visible from above).
- Red arrows overlaid on the scene showing only actual stated movement.
- NO people, NO side silhouettes, NO human figures of any kind.
- NO camera angle changes between panels — all panels use the same straight-down view.
- Fire/flames: ONLY if stated in incident data. Show at the EXACT vehicle sector stated (front-right, rear-left, etc.) as seen from directly above — orange/red glow or flames visible on the roof/surface of the vehicle at that sector.
- NO invented movement, rotation, or events not in the incident data.
- NO legends, callout boxes, or extra text — only V1/V2/V3 labels and panel titles.

════════════════════════════════════════════════
PHASE ACCURACY
════════════════════════════════════════════════
- Phase 1: vehicle at starting position, oriented in travel direction, red directional arrow.

- Phase 2: show ONLY the event that actually happened, with these rules:
  * Road features (hole, pothole, bump): draw the feature AT the vehicle's wheel that contacted it. The vehicle overlaps the feature — they are in contact, not separated.
  * The red arrow must show only the movement that occurred up to this point.
  * NO added rotation, spin, or movement not stated in the incident data.

- Phase 3: vehicle at final resting position:
  * If the vehicle stopped ON or OVER a road feature (hole, bump), the vehicle must be drawn OVERLAPPING that feature — the feature is under the vehicle, at the wheel position stated.
  * Fire/flames: shown at the EXACT sector stated (front-right, rear-left, etc.) ON the vehicle surface.
  * Vehicle keeps same orientation as Phase 1 unless rotation is explicitly described.
  * All vehicle labels (V1, V2, V3) must be correct — do not swap or repeat labels.

════════════════════════════════════════════════
REVERSE VEHICLE RULE
════════════════════════════════════════════════
When a vehicle is described as reversing (ré, going backwards):
- Its FRONT (hood) points AWAY from the direction of movement.
- Example: a vehicle reversing to the LEFT has its FRONT pointing RIGHT and moves LEFTWARD.
- Draw the vehicle with its front in the opposite direction of the movement arrow.
- The movement arrow points in the direction of actual travel (e.g. leftward for a vehicle in reverse going left).

════════════════════════════════════════════════
PORTUGUESE TEXT ACCURACY
════════════════════════════════════════════════
All panel labels must use exact correct Portuguese:
- "Fase 1 - Deslocamento inicial" (NOT "inicíal", NOT "Inicial")
- "Fase 2 - Ponto do evento"
- "Fase 3 - Posição final"
- Title: "CROQUI TÉCNICO VEICULAR"
No accents on capital letters unless explicitly correct in Portuguese.

════════════════════════════════════════════════
SAFETY REPLACEMENTS
════════════════════════════════════════════════
Replace: accident, crash, collision, injury, damage, impact, smash, wreck, victim, hurt, sinistro, colisão, acidente, dano, batida, atropelamento, capotamento, explosão, sangue
→ with: "contact point", "vehicle displacement", "trajectory deviation", "structural deformation area", "final resting position"

Fire/fogo/incêndio/chamas: keep as-is if stated in incident data.

════════════════════════════════════════════════
SPATIAL DATA — PRESERVE EXACTLY
════════════════════════════════════════════════
Carry over: lane positions, vehicle colors and types, direction of travel, road type, event details, final position, fixed elements.
Left/right = relative to vehicle's direction of travel, not image side.`
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
        size: '1024x1536',
        quality: 'high',
      }),
    });

    const imageData = await imageRes.json();

    if (!imageRes.ok || imageData.error) {
      const msg = imageData?.error?.message || `Erro HTTP ${imageRes.status}`;
      return res.status(imageRes.status).json({ error: msg });
    }

    const b64 = imageData.data[0].b64_json;

    return res.status(200).json({
      b64,
      safe_prompt: safePrompt,
    });

  } catch (err) {
    return res.status(500).json({ error: 'Erro interno: ' + err.message });
  }
}
