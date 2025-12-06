const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function apiParseBarcode(barcode: string) {
  const res = await fetch(`${API_BASE}/parse_barcode/${barcode}`);
  return handleResponse<unknown>(res);
}

export async function apiParseWaste(productDesc: string) {
  const res = await fetch(`${API_BASE}/parse_waste`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product_desc: productDesc }),
  });
  return handleResponse<unknown>(res);
}

export async function apiDisposalInstructions(name: string, params: Record<string, string>) {
  const res = await fetch(`${API_BASE}/disposal_instructions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, params }),
  });
  return handleResponse<Record<string, string | unknown>>(res);
}

export { API_BASE };
