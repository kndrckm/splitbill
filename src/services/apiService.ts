import { ReceiptData, Person, Payment } from "../types";

export const saveBill = async (bill: ReceiptData, people: Person[], payments: Payment[]) => {
  const response = await fetch("/api/bills", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: bill.id,
      name: bill.name,
      data: { bill, people, payments }
    })
  });
  return response.json();
};

export const getBills = async () => {
  const response = await fetch("/api/bills");
  return response.json();
};

export const deleteBill = async (id: string) => {
  const response = await fetch(`/api/bills/${id}`, { method: "DELETE" });
  return response.json();
};
