import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getAiInspiration(mood: string = "energetic") {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Create a 32-step electronic music pattern for a drum machine and a melody.
      Mood: ${mood}
      
      Response MUST be in strict JSON format.
      Schema:
      {
        "drums": {
          "kick": [boolean], (32 values)
          "snare": [boolean], (32 values)
          "clap": [boolean], (32 values)
          "hihat": [boolean], (32 values)
          "perc": [boolean], (32 values)
          "rim": [boolean] (32 values)
        },
        "melody": [string] (32 notes from ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"] or null)
      }`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            drums: {
              type: Type.OBJECT,
              properties: {
                kick: { type: Type.ARRAY, items: { type: Type.BOOLEAN } },
                snare: { type: Type.ARRAY, items: { type: Type.BOOLEAN } },
                clap: { type: Type.ARRAY, items: { type: Type.BOOLEAN } },
                hihat: { type: Type.ARRAY, items: { type: Type.BOOLEAN } },
                perc: { type: Type.ARRAY, items: { type: Type.BOOLEAN } },
                rim: { type: Type.ARRAY, items: { type: Type.BOOLEAN } },
              }
            },
            melody: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Generation Error:", error);
    return null;
  }
}
