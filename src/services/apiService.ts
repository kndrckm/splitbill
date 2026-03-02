import { ReceiptData, Person, Payment } from "../types";

/**
 * Check if we're running on a static host (GitHub Pages) vs local dev server.
 * API calls only work on local dev server with server.ts running.
 */
const isStaticHost = (): boolean => {
  const hostname = window.location.hostname;
  return hostname.includes('github.io') || hostname.includes('netlify') || hostname.includes('vercel');
};

export const saveBill = async (bill: ReceiptData, people: Person[], payments: Payment[]) => {
  if (isStaticHost()) return { success: true, static: true };

  try {
    const response = await fetch("/api/bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: bill.id,
        name: bill.name,
        data: { bill, people, payments }
      })
    });
    if (!response.ok) {
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }
    return response.json();
  } catch (err) {
    console.warn('saveBill failed (backend not available):', err);
    return { success: false, error: err };
  }
};

export const getBills = async () => {
  if (isStaticHost()) return [];

  try {
    const response = await fetch("/api/bills");
    if (!response.ok) {
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }
    return response.json();
  } catch (err) {
    console.warn('getBills failed (backend not available):', err);
    return [];
  }
};

export const deleteBill = async (id: string) => {
  if (isStaticHost()) return { success: true, static: true };

  try {
    const response = await fetch(`/api/bills/${id}`, { method: "DELETE" });
    if (!response.ok) {
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }
    return response.json();
  } catch (err) {
    console.warn('deleteBill failed (backend not available):', err);
    return { success: false, error: err };
  }
};
