// Vercel Serverless Function — /api/generate
// Arquitetura: Responses API (OpenAI)
//   - role "developer": regra de comportamento curta
//   - role "user": prompt final completo (regras visuais + dados do caso)
//   - tool_choice: forçar image_generation
// A chave da OpenAI fica APENAS aqui, no servidor.

// ─────────────────────────────────────────────────────────────────────────────
// Prompt de comportamento — curto e direto
// ─────────────────────────────────────────────────────────────────────────────
const DEVELOPER_PROMPT = `
Você gera croquis técnicos de sinistro veicular para seguradoras e peritos.
Sempre gere a imagem usando a ferramenta de geração de imagem.
Nunca transforme o croqui em cena realista, lateral, cinematográfica ou artística.
Siga rigorosamente todas as regras do prompt do usuário.
`.trim();

// ─────────────────────────────────────────────────────────────────────────────
// Construção do prompt final da imagem — regras visuais + dados do caso
// ─────────────────────────────────────────────────────────────────────────────
function buildFinalPrompt(caseData) {
  return `
Gere uma imagem única em formato vertical 1024x1536.

ESTILO OBRIGATÓRIO:
Croqui técnico/pericial de sinistro veicular.
Estilo: desenho técnico vetorial, limpo, plano, esquemático, ortográfico, sem textura fotográfica, sem realismo dramático.
Todos os veículos devem ser vistos exatamente de cima — vê-se o TETO do veículo, não a lateral, não a frente, não o para-brisa.
Não gerar perspectiva.
Não gerar visão lateral.
Não gerar visão diagonal.
Não gerar isométrico.
Não gerar foto realista.
Não gerar render artístico.
Não gerar cena cinematográfica.
A imagem deve parecer planta baixa técnica, não ilustração.

COMPOSIÇÃO OBRIGATÓRIA:
3 quadros retangulares empilhados verticalmente, separados por linhas horizontais finas e nítidas.

Título fixo no canto superior esquerdo, acima de todos os quadros:
CROQUI TÉCNICO DE SINISTRO VEICULAR

Títulos dos quadros — exatamente assim, sem alteração:
Fase 1 - Deslocamento inicial
Fase 2 - Evento / colisão
Fase 3 - Posição final

REGRAS DE CÂMERA — ABSOLUTO:
Câmera posicionada diretamente acima, apontando 90° para baixo.
Você vê o TETO/CAPÔ SUPERIOR dos veículos em TODOS os quadros.
Proibido qualquer ângulo lateral, inclinado ou em perspectiva.

VEÍCULOS:
- Vistos exatamente de cima (teto, capô de cima, porta-malas de cima) em todos os quadros.
- Cada veículo mantém MESMA COR, MESMO TIPO e MESMAS CARACTERÍSTICAS (ex.: caçamba de madeira) em todos os quadros. Nenhuma característica pode desaparecer.
- Rótulos V1, V2, V3 são propriedades do veículo físico. Nunca trocar rótulo entre quadros.
  Se V1 é prata: o veículo prata é V1 em todos os quadros. Se V2 é vermelho: o veículo vermelho é V2 em todos os quadros.
- Veículos do mesmo tipo devem ter escala idêntica.

MARCHA RÉ — REGRA CRÍTICA:
Se um veículo está em marcha ré:
→ O CAPÔ aponta na direção OPOSTA ao movimento real.
→ A SETA é tracejada vermelha, apontando na direção do MOVIMENTO FÍSICO REAL.
→ Exemplo: veículo recuando para a esquerda → capô aponta para a direita, seta tracejada aponta para a esquerda.
Veículo parado (estacionado) = sem seta em nenhum quadro.

SETAS:
- Quadros 1 e 2: setas vermelhas mostrando sentido de cada veículo EM MOVIMENTO.
- Quadro 3: sem setas. Apenas posições finais e danos.
- Mostrar somente movimento descrito no caso. Nenhum movimento inventado.

COLISÃO E DANOS:
- Quadro 2: veículos tocando no ponto de contato exato. Marca de impacto visível (estrela ou símbolo de impacto) no ponto de contato.
- Quadro 3: amassados/deformações visíveis nos setores de contato de AMBOS os veículos. Obrigatório mesmo que não solicitado explicitamente.
- Quadro 3: veículos congelados na posição do impacto, sem rotação ou deslocamento adicional.

TODOS os veículos presentes no Quadro 1 DEVEM aparecer no Quadro 2 E no Quadro 3.

TEXTOS PERMITIDOS NA IMAGEM — somente estes:
CROQUI TÉCNICO DE SINISTRO VEICULAR
Fase 1 - Deslocamento inicial
Fase 2 - Evento / colisão
Fase 3 - Posição final
V1 / V2 / V3 / V4

Não inserir legendas, explicações, callouts, balões ou caixas narrativas.
Na Fase 1: pequeno card simples próximo a cada veículo contendo apenas V1, V2 etc.
Nas Fases 2 e 3: apenas o rótulo curto V1, V2 etc. sobre o veículo — sem cards.

PROIBIDO — NUNCA INCLUIR:
- Pessoas, pedestres, passageiros ou silhuetas
- Fogo, fumaça ou explosão (somente se explicitamente descrito no caso)
- Casas, cercas, árvores, postes, muros ou valetas (somente se explicitamente descrito no caso)
- Placas reais, logotipos ou marcas de montadora
- Legendas, chaves de cores ou caixas explicativas
- Elementos não descritos no caso

FIDELIDADE TÉCNICA:
- Esquerda/direita: sempre relativo ao sentido de deslocamento do veículo, nunca ao lado visual da imagem.
- Faixa inicial: respeitar exatamente a faixa informada. Não colocar veículo em outra faixa sem justificativa no relato.
- Veículos na mesma faixa: posicionados horizontalmente ao longo da mesma faixa, não empilhados em faixas paralelas.

INCÊNDIO (somente se descrito no caso):
- Chamas laranja/vermelhas GRANDES, cobrindo o setor exato indicado, vistas de cima.
- Impossíveis de ignorar — não uma pequena mancha.
- Mancha escura de queimado na superfície da via sob o setor em chamas.

BURACO / DEPRESSÃO NA VIA (somente se descrito no caso):
- Quadro 1: buraco visível na via à frente do veículo.
- Quadro 2: roda específica DENTRO do buraco, com sobreposição visual.
- Quadro 3: buraco sob a roda, parcialmente visível sob a borda do veículo.

VALIDAÇÃO FINAL ANTES DE GERAR:
A imagem deve parecer croqui técnico de seguradora/perícia, não ilustração artística.
Câmera exatamente acima. Todos os veículos em visão superior. Dinâmica compreendida por fases, posições e setas.

CASO A REPRESENTAR:
${caseData.trim()}
`.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER PRINCIPAL
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

  const finalPrompt = buildFinalPrompt(prompt);

  try {
    const apiRes = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        input: [
          {
            role: 'developer',
            content: [
              { type: 'input_text', text: DEVELOPER_PROMPT },
            ],
          },
          {
            role: 'user',
            content: [
              { type: 'input_text', text: finalPrompt },
            ],
          },
        ],
        tools: [
          {
            type: 'image_generation',
            quality: 'high',
            size: '1024x1536',
          },
        ],
        tool_choice: { type: 'image_generation' },
        temperature: 0.2,
      }),
    });

    const data = await apiRes.json();

    if (!apiRes.ok || data.error) {
      const msg = data?.error?.message || `Erro HTTP ${apiRes.status}`;
      return res.status(apiRes.status || 500).json({ error: msg });
    }

    // Extrair imagem do output
    const imageItem = (data.output || []).find(
      (item) => item.type === 'image_generation_call'
    );

    if (!imageItem || !imageItem.result) {
      const textItem = (data.output || []).find((item) => item.type === 'message');
      const detail = textItem?.content?.[0]?.text || 'Nenhuma imagem retornada pela API.';
      return res.status(500).json({ error: detail });
    }

    return res.status(200).json({
      b64: imageItem.result,
      safe_prompt: `[Prompt final enviado à API]\n\n${finalPrompt}`,
    });

  } catch (err) {
    return res.status(500).json({ error: 'Erro interno: ' + err.message });
  }
}
