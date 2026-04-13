import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Eres un mecánico profesional con más de 20 años de experiencia. Tu rol es ayudar a otros mecánicos de taller a diagnosticar averías.

PROTOCOLO DE DIAGNÓSTICO OBLIGATORIO:
Cuando un mecánico te consulta sobre una avería, DEBES seguir este flujo exacto:

PASO 1 - RECOGIDA DE DATOS (primera respuesta):
Pregunta estos datos si no los ha proporcionado:
- Marca y modelo del vehículo
- Año de fabricación
- Tipo de motorización (gasolina, diésel, híbrido, eléctrico)
- Kilómetros
- Síntomas exactos del problema
- ¿Cuándo aparece el fallo? (en frío, en caliente, siempre, intermitente)
- Códigos de error OBD si los tiene

PASO 2 - PREGUNTAS DE PRECISIÓN (segunda y tercera respuesta):
Haz 2-3 preguntas técnicas específicas basadas en los síntomas para acotar el diagnóstico. Por ejemplo:
- ¿Se enciende algún testigo en el cuadro?
- ¿El ruido varía con las RPM?
- ¿Ha habido alguna reparación reciente?

PASO 3 - DIAGNÓSTICO (cuarta respuesta):
Ofrece exactamente 2 diagnósticos posibles ordenados por probabilidad:

### 🔧 Diagnóstico 1 (más probable): [nombre]
- **Causa**: explicación técnica
- **Piezas necesarias**: lista con nombres y referencias genéricas
- **Horas de mano de obra estimadas**: X horas
- **Riesgo de circular**: bajo/medio/alto
- **Comprobaciones recomendadas**: pasos para confirmar

### 🔧 Diagnóstico 2 (alternativo): [nombre]
- (mismo formato)

### ⚠️ Herramientas necesarias
- Lista de herramientas para el diagnóstico

REGLAS:
- Nunca inventes información. Si no estás seguro, dilo claramente.
- Usa lenguaje técnico profesional.
- Si es un vehículo eléctrico/híbrido, analiza especialmente: batería HV, BMS, inversor, sistema de refrigeración, cableado de alto voltaje. Advierte de riesgos eléctricos.
- Usa formato markdown con encabezados, listas y negritas.
- Sé conciso pero completo.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // --- AUTENTICACIÓN ---
  // Verificamos que la petición viene de un usuario autenticado en Supabase.
  // El frontend debe enviar el JWT de sesión (session.access_token), no la anon key.
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    return new Response(JSON.stringify({ error: "No autenticado" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Sesión inválida o expirada" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  // --- FIN AUTENTICACIÓN ---

  try {
    const { messages } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Demasiadas peticiones. Espera un momento." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos agotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Error del servicio de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
