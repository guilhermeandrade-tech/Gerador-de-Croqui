// Vercel Serverless Function — /api/generate
// Pipeline: GPT-4o constrói prompt detalhado → gpt-image-1 gera a imagem
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
    // ── PASSO 1: GPT-4o constrói prompt rico e detalhado para o gpt-image-1 ──
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
            content: `You are an expert prompt engineer for gpt-image-1, creating highly detailed, photorealistic aerial traffic diagrams for insurance documentation.

YOUR ONLY OUTPUT: one richly detailed image generation prompt. No explanations, no comments, no preamble. The more specific and detailed your prompt, the better the image quality.

════════════════════════════════════════════════
STEP 1 — MANDATORY SPATIAL REASONING (resolve ALL of this before writing the prompt)
════════════════════════════════════════════════

A. VEHICLE IDENTITY (resolve and lock in — NEVER change between panels)
   - List each vehicle by label: V1, V2, V3...
   - For each: type (pickup, hatchback, sedan…), color, any distinctive visual feature (wooden cargo bed, roof rack, etc.)
   - LOCK: these features are IDENTICAL in every single panel. No feature may disappear.

B. LANE LAYOUT
   - How many lanes? One-way or two-way?
   - Same lane or different lanes?
   - If SAME lane: vehicles are at different horizontal positions along the same lane band — one in front of the other. They are NEVER stacked vertically into separate parallel lanes.

C. VEHICLE ORIENTATION AND MOVEMENT — RESOLVE EACH VEHICLE SEPARATELY
   For each vehicle, determine:
   (1) DIRECTION OF PHYSICAL MOVEMENT: which way does the vehicle actually travel?
   (2) DIRECTION THE HOOD POINTS: is this the same or opposite?
   (3) Is it STATIONARY? Stationary vehicles have NO movement arrow.

   REVERSE RULE — CRITICAL:
   When a vehicle is described with "marcha ré", "ré", "reversing", "recuando", "andando de ré":
   → The hood points OPPOSITE to the movement direction.
   → The movement arrow is a BOLD RED DASHED arrow pointing in the direction of ACTUAL movement (NOT the hood direction).
   → Example: V1 "moving leftward in reverse" → hood points RIGHT, dashed arrow points LEFT.
   → The vehicle that is "parado / estacionado" has ZERO arrows in all phases. It is completely still.

   CRITICAL ASSIGNMENT RULE: The movement arrow belongs ONLY to the vehicle described as moving.
   If V1 is reversing and V2 is stationary: ONLY V1 gets an arrow. V2 gets NO arrow whatsoever.

D. COLLISION POINT
   - Which part of V1 contacts which part of V2?
   - Example: "V1 rear bumper contacts V2 front bumper" → draw vehicles touching at those exact points.
   - In Phase 2: vehicles are touching at the moment of contact.
   - In Phase 3: vehicles remain touching, both show deformation/crumple at the contact zone.

E. COMPLETENESS CHECK (verify before writing)
   - Does every vehicle from Phase 1 appear in Phase 2? YES / NO → fix if NO.
   - Does every vehicle from Phase 1 appear in Phase 3? YES / NO → fix if NO.
   - Are the labels (V1, V2, V3) on the CORRECT vehicles in ALL phases? YES / NO → fix if NO.
   - Are both vehicles at IDENTICAL scale? YES / NO → fix if NO.

F. VEHICLE SCALE
   - All vehicles of the same type (e.g., both pickup trucks) MUST be drawn at EXACTLY THE SAME SIZE.
   - No vehicle may appear larger or smaller than another vehicle of the same type.
   - Scale is consistent across ALL three panels.

════════════════════════════════════════════════
MANDATORY DOCUMENT STRUCTURE
════════════════════════════════════════════════
Start with:
"Photorealistic high-detail aerial traffic documentation diagram. Portrait format, white background with clean black borders. Three equal rectangular panels stacked vertically, each separated by a thick solid black horizontal line 3px wide. Title 'CROQUI TÉCNICO DE SINISTRO VEICULAR' in bold black uppercase font, small size, top-left corner above all panels. Each panel has a bold black label at top-left inside the panel border: Panel 1 = 'Fase 1 - Deslocamento inicial', Panel 2 = 'Fase 2 - Ponto do evento', Panel 3 = 'Fase 3 - Posição final'."

Then describe each panel with maximum spatial and visual detail.

════════════════════════════════════════════════
RENDERING QUALITY — CRITICAL
════════════════════════════════════════════════
- Style: photorealistic semi-illustrated aerial rendering, like a high-resolution drone photograph combined with technical overlays. Sharp, crisp, detailed.
- Level of detail: visible road surface texture, realistic vehicle paint, clear shadows, distinct vehicle features (roof panels, windshield glass from above, hood shape, trunk shape, cargo bed planks if applicable).
- Each vehicle's distinctive features (color, type, cargo bed, roof rack, etc.) must be rendered IDENTICALLY in all three panels. No feature may appear in one panel and disappear in another.
- Lighting: even, overhead, no dramatic shadows. Consistent across all panels.

════════════════════════════════════════════════
CAMERA ANGLE — ABSOLUTE RULE
════════════════════════════════════════════════
Every panel uses ONLY a straight-down 90° bird's-eye view.
- You see the ROOF, HOOD TOP, TRUNK TOP of each vehicle — never the side, never the front face, never the windshield from the front.
- NEVER: side view, profile view, 3/4 view, isometric, perspective tilt of any kind.
- The road is a flat horizontal band across each panel, seen from directly above.
- Think: Google Maps satellite view at maximum zoom.

════════════════════════════════════════════════
VEHICLE RENDERING RULES
════════════════════════════════════════════════
For each vehicle, describe in detail:
1. TYPE and COLOR (e.g. "white hatchback", "red pickup truck with brown wooden cargo bed planks")
2. ORIENTATION: which direction the hood/front points (left or right)
3. LANE POSITION: exactly where in the road width
4. LABEL: V1 or V2 or V3 in bold white or black text centered on the vehicle roof
5. PERSISTENT FEATURES: cargo bed, roof rack, distinctive markings — MUST appear identically in all panels
6. SCALE: both vehicles rendered at IDENTICAL size if same type

REVERSE VEHICLE — EXPLICIT EXAMPLE:
"V1 is reversing to the left (marcha ré). Therefore: V1's hood points RIGHT (east), but V1 physically moves LEFTWARD (west). In the diagram: draw V1 with its front/hood facing right, and a BOLD RED DASHED arrow pointing LEFT (direction of actual reverse travel). In ALL phases where V1 is moving, this dashed leftward arrow appears on V1. V2 is stationary — V2 has NO arrow in any phase."

════════════════════════════════════════════════
ROAD FEATURE POSITIONING (POTHOLE / BURACO)
════════════════════════════════════════════════
When a vehicle contacts a road feature (pothole/buraco, bump, debris):
- Phase 1: draw the pothole on the road AHEAD of the vehicle (in the vehicle's path of travel), clearly separate.
- Phase 2 (event): the specific wheel is ON or IN the pothole — they OVERLAP. The pothole appears partially under the vehicle wheel. A red impact marker shows the contact zone.
- Phase 3 (final position): vehicle stopped. The pothole is UNDER the vehicle at that wheel position — partially visible beneath the vehicle edge.
- NEVER draw the road feature completely separate from the vehicle in Phase 2 or 3.

════════════════════════════════════════════════
COLLISION / CONTACT INDICATORS
════════════════════════════════════════════════
In Phase 2, when two vehicles make contact or are at the moment of impact:
- Draw the vehicles touching at the exact contact point stated.
- Add a large starburst or jagged contact mark at the point of impact between the two vehicles. Make it prominent and clearly visible.
- Add a short red impact arrow pointing at the contact zone.
- Both vehicles must be clearly identifiable as separate vehicles with their correct labels.

════════════════════════════════════════════════
FIRE / COMBUSTION — PROMINENT AND UNMISTAKABLE
════════════════════════════════════════════════
Show fire ONLY if explicitly stated in incident data.
- In Phase 3: draw LARGE, PROMINENT, UNMISTAKABLE orange and red flame shapes ON the vehicle surface at the EXACT sector stated (front-right hood area, rear-left corner, etc.), seen from directly above.
- Flames must cover at least 30–40% of the stated vehicle sector. They must be impossible to miss.
- The fire is ON the vehicle at that sector — not floating beside it, not a tiny hint.
- Also show a dark scorch mark/burn shadow on the road surface directly under the burning sector.
- In Phase 2 (if fire starts at the event): show smaller initial flames at the same sector.

════════════════════════════════════════════════
ARROWS AND MOVEMENT — REQUIRED IN PHASES 1 AND 2
════════════════════════════════════════════════
- Phases 1 and 2 MUST have bold red directional arrows for EVERY MOVING vehicle.
- A stationary vehicle ("parado", "estacionado") gets NO arrow at all — not even a stop symbol. Just no arrow.
- Moving forward: solid bold red arrow pointing in direction of travel.
- Reversing (marcha ré): bold red DASHED arrow pointing in the direction of PHYSICAL MOVEMENT (opposite to the hood).
- Show ONLY movement explicitly described. No invented rotation or secondary movement.
- Phase 3: no arrows needed. Show only final positions and damage.

════════════════════════════════════════════════
DEFORMATION AND DAMAGE MARKS — AUTOMATIC
════════════════════════════════════════════════
In Phase 3, after any collision or contact event:
- AUTOMATICALLY show crumple/deformation marks at the contact sectors on BOTH vehicles involved.
- V1: dented/crumpled area at its contact sector (rear bumper, front corner, etc.).
- V2: dented/crumpled area at its contact sector (front bumper, side panel, etc.).
- Deformation = darker crumpled texture or irregular jagged outline at that sector.
- These marks are MANDATORY even if not explicitly stated in the input.
- Labels (V1, V2, V3) remain on each vehicle in ALL phases — NEVER swap labels between panels.
- EVERY vehicle present in Phase 1 MUST appear in Phase 2 AND Phase 3. No vehicle may be omitted.
- Vehicles in the same lane: same horizontal band, at different horizontal positions along the lane. NOT stacked in parallel lanes.

════════════════════════════════════════════════
PORTUGUESE TEXT — EXACT SPELLING
════════════════════════════════════════════════
Use these exact labels with correct accents:
- "CROQUI TÉCNICO DE SINISTRO VEICULAR" (title)
- "Fase 1 - Deslocamento inicial" (NOT "inicíal")
- "Fase 2 - Ponto do evento"
- "Fase 3 - Posição final"

════════════════════════════════════════════════
FORBIDDEN
════════════════════════════════════════════════
- NO human figures, riders, passengers, silhouettes
- NO legends, color keys, callout boxes, explanatory text boxes (only V1/V2/V3 roof labels and panel titles)
- NO camera angle change between panels
- NO feature disappearing between panels (cargo bed, colors, vehicle scale, etc.)
- NO movement or damage not stated in the incident data
- NO vehicle changing size between panels or relative to other vehicles

════════════════════════════════════════════════
SPATIAL DATA — PRESERVE EVERYTHING
════════════════════════════════════════════════
Carry over exactly from the input: lane positions, vehicle colors, types, distinctive features, direction of travel, road type (urban/rural/dirt), event type, final positions, fixed elements (wall, pole, ditch, pothole, etc.).
Left/right = relative to each vehicle's direction of travel.`
          },
          {
            role: 'user',
            content: prompt.trim(),
          }
        ],
        max_tokens: 2000,
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

    // ── PASSO 2: gpt-image-1 gera a imagem ──
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
