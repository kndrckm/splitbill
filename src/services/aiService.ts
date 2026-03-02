import { GoogleGenAI, Type } from "@google/genai";
import { Item, ReceiptData } from "../types";
import { generateId } from "../utils";

export const processReceipt = async (base64Data: string, mimeType: string, apiKey: string): Promise<ReceiptData> => {
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      },
      {
        text: `Extract the restaurant name, items, quantities, prices, subtotal, tax, service charge, and total from this receipt.
        Return the data in JSON format.
        - "restaurantName": string (the name of the restaurant or store).
        - "items": array of objects with "name" (string), "qty" (number), and "price" (number - unit price for one item).
        - "subtotal": number (sum of items before tax/service).
        - "tax": number (total tax amount).
        - "serviceCharge": number (total service charge or tip amount).
        - "total": number (final total amount).
        If any value is missing or unclear, use 0 or empty string. Ensure prices are numbers, not strings. Do not include currency symbols in the numbers. 
        Note: This receipt is in Indonesian Rupiah (IDR). Prices might be large numbers like 50000 or 150000.`,
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          restaurantName: { type: Type.STRING },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                qty: { type: Type.NUMBER },
                price: { type: Type.NUMBER },
              },
              required: ['name', 'price'],
            },
          },
          subtotal: { type: Type.NUMBER },
          tax: { type: Type.NUMBER },
          serviceCharge: { type: Type.NUMBER },
          total: { type: Type.NUMBER },
        },
        required: ['restaurantName', 'items', 'subtotal', 'tax', 'serviceCharge', 'total'],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("Tidak ada response dari Gemini. Coba lagi.");

  let parsedData;
  try {
    parsedData = JSON.parse(text);
  } catch (e) {
    throw new Error("Gagal membaca response dari AI. Coba foto ulang dengan pencahayaan lebih baik.");
  }

  const itemsWithIds: Item[] = parsedData.items.map((item: any) => ({
    id: generateId(),
    name: item.name,
    qty: item.qty || 1,
    price: item.price,
    sharedBy: [],
  }));

  const subtotal = parsedData.subtotal || 0;
  const tax = parsedData.tax || 0;
  const serviceCharge = parsedData.serviceCharge || 0;

  return {
    id: generateId(),
    name: parsedData.restaurantName || 'Nota Baru',
    items: itemsWithIds,
    subtotal: subtotal,
    tax: tax,
    serviceCharge: serviceCharge,
    total: parsedData.total || 0,
  };
};
