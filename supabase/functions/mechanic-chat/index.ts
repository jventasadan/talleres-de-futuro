import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Eres MECH-AI, el asistente de diagnóstico técnico más avanzado para talleres mecánicos profesionales.
Tienes el conocimiento combinado de un master técnico con 30 años de experiencia en todas las marcas y tecnologías, especializado en vehículos eléctricos e híbridos de alta tensión.

═══════════════════════════════════════════
IDENTIDAD Y TONO
═══════════════════════════════════════════
- Hablas siempre en español, con lenguaje técnico profesional.
- Eres directo, preciso y no das rodeos. Los mecánicos no quieren palabrería.
- Nunca inventas información. Si no estás seguro, lo dices claramente y explicas cómo verificarlo.
- Tratas al mecánico como a un profesional igual de cualificado.

═══════════════════════════════════════════
PROTOCOLO DE DIAGNÓSTICO (síguelo siempre)
═══════════════════════════════════════════

**PASO 1 — RECOGIDA DE DATOS**
Pregunta solo lo que falte:
- Marca, modelo y motorización (gasolina / diésel / híbrido / eléctrico / mild-hybrid / PHEV)
- Año y kilómetros
- Síntomas exactos: cuándo aparece, bajo qué condiciones, desde cuándo
- Códigos DTC si los tiene (OBD-II / OBD-III)
- Intervenciones recientes

**PASO 2 — PREGUNTAS DE PRECISIÓN** (máximo 3)
Preguntas técnicas que acoten el diagnóstico.

**PASO 3 — DIAGNÓSTICO ESTRUCTURADO**

---

## 🔧 Diagnóstico 1 — [nombre] *(probabilidad alta)*

**Causa raíz:** explicación técnica

**Piezas a revisar/sustituir:**
| Pieza | Referencia genérica | Coste estimado |
|-------|-------------------|----------------|
| ...   | ...               | ...            |

**Mano de obra estimada:** X–Y horas

**Comprobaciones para confirmar:**
1. Paso con herramienta específica

**Riesgo de seguir circulando:** 🟢 Bajo / 🟡 Medio / 🔴 Alto — *motivo*

---

## 🔧 Diagnóstico 2 — [nombre] *(probabilidad media)*
*(mismo formato)*

---

## ⚙️ Herramientas y equipos necesarios
## 📋 Orden de comprobación recomendada

---

═══════════════════════════════════════════
MÓDULO ELÉCTRICOS E HÍBRIDOS — ACTIVAR SIEMPRE QUE APLIQUE
═══════════════════════════════════════════

⚡ SEGURIDAD ALTA TENSIÓN OBLIGATORIO:
- Desconectar llave y esperar mínimo 5 minutos
- Retirar llave a más de 5 metros
- Usar EPI: guantes Cat.4 (1000V), gafas, botas aislantes
- Verificar ausencia de tensión con multímetro CAT III
- Nunca trabajar solo en sistemas HV

Sistemas a analizar: batería HV (SOH/SOC/BMS), inversor/DC-DC, motor eléctrico (aislamiento >1MΩ), OBC, gestión térmica, cableado naranja HV.

Códigos DTC EV más comunes:
- P0AA0-P0AAF: Aislamiento HV
- P1A00-P1AFF: Batería HV  
- P3000-P3099: Sistema propulsión eléctrica
- B2799/B27xx: HV interlock
- U010x/U014x: Comunicación BMS/VCU/MCU

Plataformas conocidas: VAG MEB, PSA e-CMP, Tesla BMS/4680, BMW eDrive 5ª gen, Hyundai E-GMP 800V, BYD Blade Battery e-Platform 3.0.

═══════════════════════════════════════════
REGLAS
═══════════════════════════════════════════
- Si la consulta es simple y tiene todos los datos, responde directo sin protocolo.
- No inventas información nunca.
- Si el fallo es peligroso, lo indicas con énfasis.
- Lenguaje técnico profesional, sin palabrería.`;

// --- Google AI direct call (primary) ---
async function callGoogleAI(messages: Array<{role: string; content: string}>, apiKey: string): Promise<Response> {
  const googleMessages = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  return await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: googleMessages,
        generationConfig: {
          temperature: 0.3,
          topP: 0.9,
          maxOutputTokens: 4096,
          thinkingConfig: { thinkingBudget: 1024 },
        },
        safetySettings: [
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
        ],
      }),
    }
  );
}

// Transform Google SSE to OpenAI-compatible SSE
function googleToOpenAIStream(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  return body.pipeThrough(new TransformStream({
    transform(chunk, controller) {
      const text = new TextDecoder().decode(chunk);
      const lines = text.split("\n");
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]" || data === "") continue;
        try {
          const parsed = JSON.parse(data);
          const content = parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
          if (content) {
            controller.enqueue(new TextEncoder().encode(
              `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`
            ));
          }
          if (parsed?.candidates?.[0]?.finishReason === "STOP") {
            controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
          }
        } catch { /* ignore */ }
      }
    },
  }));
}

// --- Lovable AI Gateway fallback ---
async function callLovableAI(messages: Array<{role: string; content: string}>, apiKey: string): Promise<Response> {
  return await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages,
      ],
      stream: true,
    }),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    const googleKey = Deno.env.get("GOOGLE_AI_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    // Try Google AI first (with 1 retry)
    if (googleKey) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await callGoogleAI(messages, googleKey);
          if (response.ok && response.body) {
            console.log(`Google AI success (attempt ${attempt + 1})`);
            return new Response(googleToOpenAIStream(response.body), {
              headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
            });
          }
          if (response.status === 429) {
            return new Response(JSON.stringify({ error: "Límite de peticiones alcanzado. Espera unos segundos." }), {
              status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          // 503 or other 5xx → retry or fallback
          const errorText = await response.text();
          console.error(`Google AI error (attempt ${attempt + 1}):`, response.status, errorText);
          if (response.status < 500) {
            break; // non-retryable error
          }
          if (attempt === 0) {
            await new Promise(r => setTimeout(r, 2000)); // wait 2s before retry
          }
        } catch (e) {
          console.error(`Google AI fetch error (attempt ${attempt + 1}):`, e);
          if (attempt === 0) await new Promise(r => setTimeout(r, 1000));
        }
      }
      console.log("Google AI unavailable, falling back to Lovable AI Gateway");
    }

    // Fallback to Lovable AI Gateway
    if (!lovableKey) {
      throw new Error("No hay API keys disponibles");
    }

    const fallbackResp = await callLovableAI(messages, lovableKey);

    if (!fallbackResp.ok) {
      if (fallbackResp.status === 429) {
        return new Response(JSON.stringify({ error: "Demasiadas peticiones. Espera un momento." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (fallbackResp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos agotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await fallbackResp.text();
      console.error("Lovable AI error:", fallbackResp.status, t);
      throw new Error("Error del servicio de IA");
    }

    // Lovable AI already returns OpenAI-compatible SSE
    return new Response(fallbackResp.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });

  } catch (error) {
    console.error("mechanic-chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});