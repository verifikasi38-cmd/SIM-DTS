import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("GEMINI_API_KEY is missing. Gemini features will not work.");
      // We return a dummy object or throw. But throwing here might break if the app functions without AI.
      // E.g., user is just trying to use non-AI features. We will throw and catch below.
    }
    aiClient = new GoogleGenAI({ apiKey: key || 'dummy-key' });
  }
  return aiClient;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export async function extractKtpData(imageBuffer: ArrayBuffer, mimeType: string) {
  const ai = getAi();
  const prompt = `
    Extract data from this Indonesian KTP (Identity Card). 
    Return ONLY a JSON object with these keys:
    - nik (string, 16 digits)
    - name (string)
    - birthPlace (string)
    - birthDate (string, format YYYY-MM-DD if possible, else as is)
    - gender (string: "Laki-laki" or "Perempuan")
    - address (string)
    - rt (string)
    - rw (string)
    - dusun (string, if mentioned)
    - occupation (string)
    
    If any field is missing, return null for that field. 
    Be as accurate as possible. Only return the JSON.
  `;

  const base64Content = arrayBufferToBase64(imageBuffer);

  const imagePart = {
    inlineData: {
      data: base64Content,
      mimeType,
    },
  };

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          parts: [
            { text: prompt },
            imagePart
          ]
        }
      ]
    });

    const text = response.text;
    if (!text) throw new Error("No text returned from Gemini");

    // Clean up potential markdown code blocks
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("Failed to parse JSON from Gemini response");
  } catch (error) {
    console.error("Gemini OCR Error:", error);
    throw error;
  }
}

export async function analyzeVillageData(stats: any) {
  const ai = getAi();
  const prompt = `
    Analyze this village demographic data for the village of Tarempa Selatan:
    ${JSON.stringify(stats)}
    
    Provide a brief strategic insight (max 3 sentences) on:
    1. Economic focus
    2. Social assistance needs
    3. Education levels
    
    Format as a structured summary.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text || "Analysis currently unavailable.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Analysis currently unavailable.";
  }
}
