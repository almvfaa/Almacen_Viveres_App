
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Ensure API_KEY is available in the environment.
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.error("API_KEY for Gemini is not set in environment variables.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

export const queryDataWithGemini = async (
  query: string,
  contextData: object
): Promise<any> => {
  const model = "gemini-2.5-flash-preview-04-17";

  const prompt = `
    You are an expert data analyst for a government procurement system.
    Your task is to answer user questions by querying the provided JSON data.
    You MUST only return a valid JSON array of the results. Do not add any explanation or conversational text.
    If the user asks for a summary or calculation, return a JSON object with the answer.
    The data is in Spanish. The user queries will also be in Spanish.

    Data:
    ${JSON.stringify(contextData, null, 2)}

    User Query: "${query}"

    Result (JSON array or object only):
    `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0,
      },
    });
    
    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Error querying Gemini API:", error);
    throw new Error(
      "Failed to get a valid response from the AI. The AI may have returned a non-JSON response or an error occurred."
    );
  }
};
