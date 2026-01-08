
import { GoogleGenAI, Type } from "@google/genai";
import { MenuItem } from "../types";

export interface AIResponse {
  recommendationText: string;
  suggestedItemIds: string[];
}

/**
 * Diccionario de respuestas predeterminadas para ahorrar costos de API (Zero-cost responses)
 */
const QUICK_RESPONSES: Record<string, (menu: MenuItem[]) => AIResponse | null> = {
  "piura": (menu) => ({
    recommendationText: "¡Habla, churre! ¡Qué elegancia la de Francia! Como buen paisano, lánzate de frente por un Frito o un Pan con Chicharrón bien malcriado. ¡Aquí te sientes como en Piura!",
    suggestedItemIds: menu.filter(i => i.tags?.includes('norteño')).map(i => i.id)
  }),
  "desayuno": (menu) => ({
    recommendationText: "¡Habla sobrino! Para empezar el día con fuerza, te recomiendo estos platos que son ley en todo desayuno piurano.",
    suggestedItemIds: menu.filter(i => i.tags?.includes('desayuno')).map(i => i.id)
  }),
  "bajada": (menu) => ({
    recommendationText: "¡Habla causa! ¿Buscando la bajada? Estos sánguches son los salvadores oficiales de la madrugada. ¡Bien malcriados!",
    suggestedItemIds: menu.filter(i => i.tags?.includes('bajada')).map(i => i.id)
  }),
  "almuerzo": (menu) => ({
    recommendationText: "¡Habla malcriado! Si buscas algo contundente para el almuerzo, estos platos te van a dejar bien servido.",
    suggestedItemIds: menu.filter(i => i.tags?.includes('almuerzo')).map(i => i.id)
  })
};

export const getRecommendation = async (userPreference: string, currentMenu: MenuItem[]): Promise<AIResponse> => {
  const lowerInput = userPreference.toLowerCase().trim();

  // 1. INTENTO DE RESPUESTA LOCAL (Ahorra costo y latencia)
  for (const key in QUICK_RESPONSES) {
    if (lowerInput.includes(key)) {
      const response = QUICK_RESPONSES[key](currentMenu);
      if (response) return response;
    }
  }

  // 2. FALLBACK A IA (Solo para consultas que no matchean con lo anterior)
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const menuSummary = currentMenu.map(item => `ID: ${item.id} - ${item.name}: ${item.description} (Tags: ${item.tags?.join(', ')})`).join('\n');
  
  const prompt = `
    Eres el "Churre IA", experto de la Sanguchería Piurana "Churre Malcriado".
    Basado en el menú:
    ${menuSummary}
    
    Instrucciones:
    1. Responde MUY CORTO (máximo 2 líneas), alegre y con jerga piurana (sobrino, churre, malcriado).
    2. Identifica los IDs de los productos que encajen con: "${userPreference}"
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendationText: { type: Type.STRING },
            suggestedItemIds: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["recommendationText", "suggestedItemIds"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return {
      recommendationText: result.recommendationText || "¡Habla sobrino! Mira lo que tengo para ti.",
      suggestedItemIds: result.suggestedItemIds || []
    };
  } catch (error) {
    console.error("AI Error:", error);
    return {
      recommendationText: "¡Habla causa! No te entendí bien, pero checa estos que están buenazos.",
      suggestedItemIds: []
    };
  }
};
