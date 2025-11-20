
import { GoogleGenAI, Type } from "@google/genai";
import { ReceiptData, Category } from '../types';

const parseReceiptImage = async (base64Image: string): Promise<ReceiptData> => {
  // The API key must be obtained exclusively from the environment variable process.env.API_KEY.
  // We cast it to string to satisfy TypeScript during the build command.
  const apiKey = process.env.API_KEY as string;

  if (!apiKey) {
    console.warn("API_KEY is missing. OCR features will fail.");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg', // Assuming JPEG for simplicity, can be dynamic
              data: base64Image,
            },
          },
          {
            text: `Analyze this receipt image and extract the following information into a JSON object:
            - merchant: The name of the store or merchant.
            - date: The date of purchase in YYYY-MM-DD format. If not found, use today's date.
            - total: The total amount paid.
            - category: One of the following: Food, Utilities, Transport, Entertainment, Home, Other.
            - items: A list of item names purchased.
            
            Ensure the response is valid JSON matching the schema.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            merchant: { type: Type.STRING },
            date: { type: Type.STRING },
            total: { type: Type.NUMBER },
            category: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["merchant", "total", "category"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No text returned from Gemini");
    
    return JSON.parse(text) as ReceiptData;
  } catch (error) {
    console.error("Error parsing receipt with Gemini:", error);
    throw error;
  }
};

export const geminiService = {
  parseReceiptImage,
};
