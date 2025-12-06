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

export async function apiParseBarcodeLLM(barcode: string) {
  const res = await fetch(`${API_BASE}/parse_barcode_llm/${barcode}`);
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

export async function apiDetectBarcode(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/detect_barcode`, {
    method: "POST",
    body: formData,
  });

  return handleResponse<{ barcode: string }>(res);
}

export async function apiAnalyzeWaste(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/analyze_waste`, {
    method: "POST",
    body: formData,
  });

  return handleResponse<unknown>(res);
}

export async function apiTranscribeAudio(audioBlob: Blob): Promise<{ text: string }> {
  const formData = new FormData();
  
  // Определяем расширение из mimeType
  let ext = "webm";
  if (audioBlob.type.includes("mp4")) ext = "mp4";
  else if (audioBlob.type.includes("ogg")) ext = "ogg";
  else if (audioBlob.type.includes("wav")) ext = "wav";
  
  formData.append("file", audioBlob, `audio.${ext}`);

  const res = await fetch(`${API_BASE}/voice_agent/transcribe`, {
    method: "POST",
    body: formData,
  });

  return handleResponse<{ text: string }>(res);
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function* apiVoiceAgentChatStream(
  messages: ChatMessage[]
): AsyncGenerator<string, void, unknown> {
  const res = await fetch(`${API_BASE}/voice_agent/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed with status ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.done) return;
          if (data.error) throw new Error(data.error);
          if (data.content) yield data.content;
        } catch {
          // Ignore parse errors for incomplete JSON
        }
      }
    }
  }
}

export { API_BASE };
