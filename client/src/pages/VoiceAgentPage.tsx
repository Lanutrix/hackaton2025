import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiTranscribeAudio, apiVoiceAgentChatStream, type ChatMessage } from "../api";
import Button from "../components/Button";

type ChatState = "idle" | "recording" | "transcribing" | "responding";

interface ParsedResult {
  params: Record<string, string>;
  steps: Record<string, string>;
}

const MAX_RECORDING_TIME = 55000; // 55 секунд

const VoiceAgentPage = () => {
  const navigate = useNavigate();
  const [chatState, setChatState] = useState<ChatState>("idle");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentResponse, setCurrentResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [parsedResult, setParsedResult] = useState<ParsedResult | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<ChatMessage[]>([]);

  // Синхронизируем ref с состоянием
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Авто-скролл при новых сообщениях
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, currentResponse]);

  // Извлечение JSON из ответа
  const extractJsonFromResponse = useCallback((text: string): ParsedResult | null => {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]) as ParsedResult;
      } catch {
        return null;
      }
    }
    // Попытка найти JSON без блока кода
    const rawJsonMatch = text.match(/\{[\s\S]*"params"[\s\S]*"steps"[\s\S]*\}/);
    if (rawJsonMatch) {
      try {
        return JSON.parse(rawJsonMatch[0]) as ParsedResult;
      } catch {
        return null;
      }
    }
    return null;
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Выбираем поддерживаемый формат
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        setRecordingTime(0);

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        
        // Проверка минимального размера записи
        if (audioBlob.size < 1000) {
          setError("Запись слишком короткая. Попробуйте говорить дольше.");
          setChatState("idle");
          return;
        }
        
        console.log(`Audio recorded: ${audioBlob.size} bytes, type: ${audioBlob.type}`);
        await processAudio(audioBlob);
      };

      // Запускаем запись с интервалом 500ms для получения данных
      mediaRecorder.start(500);
      setChatState("recording");

      // Таймер записи
      const startTime = Date.now();
      recordingTimerRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startTime;
        setRecordingTime(Math.floor(elapsed / 1000));
        if (elapsed >= MAX_RECORDING_TIME) {
          stopRecording();
        }
      }, 100);
    } catch (err) {
      setError("Не удалось получить доступ к микрофону");
      console.error(err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const processAudio = async (audioBlob: Blob) => {
    setChatState("transcribing");
    try {
      // Транскрибация
      const { text } = await apiTranscribeAudio(audioBlob);
      if (!text.trim()) {
        setError("Не удалось распознать речь");
        setChatState("idle");
        return;
      }

      // Добавляем сообщение пользователя (используем ref для актуальных сообщений)
      const userMessage: ChatMessage = { role: "user", content: text };
      const newMessages = [...messagesRef.current, userMessage];
      setMessages(newMessages);

      // Получаем ответ от AI
      setChatState("responding");
      setCurrentResponse("");

      let fullResponse = "";
      for await (const chunk of apiVoiceAgentChatStream(newMessages)) {
        fullResponse += chunk;
        setCurrentResponse(fullResponse);
      }

      // Добавляем ответ ассистента
      const assistantMessage: ChatMessage = { role: "assistant", content: fullResponse };
      setMessages([...newMessages, assistantMessage]);
      setCurrentResponse("");

      // Проверяем, есть ли JSON в ответе
      const result = extractJsonFromResponse(fullResponse);
      if (result) {
        setParsedResult(result);
      }

      setChatState("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка обработки");
      setChatState("idle");
    }
  };

  const handleStartButton = () => {
    if (chatState === "idle") {
      startRecording();
    } else if (chatState === "recording") {
      stopRecording();
    }
  };

  const resetChat = () => {
    setMessages([]);
    setParsedResult(null);
    setError(null);
    setChatState("idle");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Удаляем JSON блок из текста для отображения
  const cleanMessageText = (text: string) => {
    return text.replace(/```json[\s\S]*?```/g, "").trim();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50 to-white text-gray-900 flex flex-col font-display">
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <Button
          className="h-12 w-12 bg-gray-100 hover:bg-gray-200 text-gray-700"
          onClick={() => navigate(-1)}
          size="icon"
          variant="ghost"
          aria-label="Назад"
        >
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Голосовой помощник</h1>
        <Button
          className="h-12 w-12 bg-gray-100 hover:bg-gray-200 text-gray-700"
          onClick={() => navigate("/landing-forest")}
          size="icon"
          variant="ghost"
          aria-label="На главную"
        >
          <span className="material-symbols-outlined text-xl">home</span>
        </Button>
      </header>

      {/* Chat Area */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
      >
        {messages.length === 0 && chatState === "idle" && !parsedResult && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            {/* Robot Character */}
            <div className="relative w-64 h-80 bg-gradient-to-b from-[#f0f4f1] to-[#dcece2] dark:from-[#2a3c2e] dark:to-[#1a2c1e] rounded-t-[4rem] rounded-b-[2rem] shadow-2xl border-4 border-white dark:border-[#3a4c3e] flex flex-col items-center pt-12 overflow-hidden mb-6">
              {/* Lid Detail */}
              <div className="absolute top-0 w-40 h-4 bg-emerald-500/20 rounded-b-xl"></div>
              
              {/* Face Screen */}
              <div className="w-48 h-32 bg-[#111813] rounded-2xl flex flex-col items-center justify-center gap-4 shadow-inner border border-white/10 relative">
                {/* Eyes with blinking animation */}
                <div className="flex gap-8">
                  <div className="w-8 h-8 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(19,236,73,0.6)] relative overflow-hidden animate-blink">
                    <div className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full opacity-80"></div>
                  </div>
                  <div className="w-8 h-8 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(19,236,73,0.6)] relative overflow-hidden animate-blink" style={{ animationDelay: "0.1s" }}>
                    <div className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full opacity-80"></div>
                  </div>
                </div>
                
                {/* Mouth */}
                <div className="w-10 h-4 border-b-4 border-emerald-500 rounded-full"></div>
              </div>
              
              {/* Body Details */}
              <div className="mt-8 flex flex-col gap-2 w-full px-8 opacity-50">
                <div className="h-2 w-full bg-black/5 dark:bg-white/5 rounded-full"></div>
                <div className="h-2 w-2/3 bg-black/5 dark:bg-white/5 rounded-full mx-auto"></div>
              </div>
              
              {/* Recycle Icon Badge */}
              <div className="absolute bottom-6 w-12 h-12 bg-white dark:bg-[#2a3c2e] rounded-full flex items-center justify-center shadow-lg">
                <span className="material-symbols-outlined text-emerald-500 text-2xl">recycling</span>
              </div>
            </div>
            
            <h2 className="text-3xl font-bold mb-3 text-gray-900">Привет!</h2>
            <p className="text-lg text-gray-600 max-w-md leading-relaxed">
              Я помогу разобраться, как правильно отсортировать и подготовить мусор к переработке. 
              Нажми кнопку и расскажи, что хочешь выбросить.
            </p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-5 py-4 ${
                msg.role === "user"
                  ? "bg-emerald-600 text-white rounded-br-md"
                  : "bg-white text-gray-900 rounded-bl-md shadow-md border border-gray-100"
              }`}
            >
              <p className="text-base leading-relaxed whitespace-pre-wrap">
                {cleanMessageText(msg.content)}
              </p>
            </div>
          </div>
        ))}

        {/* Current streaming response */}
        {currentResponse && (
          <div className="flex justify-start">
            <div className="max-w-[85%] sm:max-w-[70%] rounded-2xl rounded-bl-md px-5 py-4 bg-white text-gray-900 shadow-md border border-gray-100">
              <p className="text-base leading-relaxed whitespace-pre-wrap">
                {cleanMessageText(currentResponse)}
              </p>
              <span className="inline-block w-2 h-4 bg-emerald-500 animate-pulse ml-1" />
            </div>
          </div>
        )}

        {/* Status indicators */}
        {chatState === "transcribing" && (
          <div className="flex justify-center">
            <div className="bg-white shadow-md rounded-full px-6 py-3 flex items-center gap-3 border border-gray-100">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span className="text-base text-gray-600">Распознаю речь...</span>
            </div>
          </div>
        )}

        {/* Parsed Result Card */}
        {parsedResult && (
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6 mt-6 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-emerald-600 text-2xl">check_circle</span>
              <h3 className="font-bold text-xl text-gray-900">Инструкция готова!</h3>
            </div>

            {/* Params */}
            <div className="mb-5">
              <h4 className="text-base font-semibold text-gray-500 uppercase tracking-wide mb-3">Параметры</h4>
              <div className="grid gap-2">
                {Object.entries(parsedResult.params).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-gray-100">
                    <span className="text-gray-600 text-base">{key}</span>
                    <span className="text-emerald-600 font-medium text-base">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Steps */}
            <div>
              <h4 className="text-base font-semibold text-gray-500 uppercase tracking-wide mb-3">Шаги</h4>
              <ol className="space-y-3">
                {Object.entries(parsedResult.steps).map(([step, instruction]) => (
                  <li key={step} className="flex gap-3 bg-white rounded-lg px-4 py-3 border border-gray-100">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-sm font-bold text-white">
                      {step}
                    </span>
                    <span className="text-base leading-relaxed text-gray-800">{instruction}</span>
                  </li>
                ))}
              </ol>
            </div>

            <Button
              onClick={resetChat}
              className="mt-6 w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-lg"
              size="xl"
            >
              Начать заново
            </Button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex justify-center">
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-base shadow-sm">
              {error}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Control */}
      <div className="border-t border-gray-200 px-4 py-6 bg-white/80 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
          {/* Recording timer */}
          {chatState === "recording" && (
            <div className="flex items-center gap-2 text-red-500">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="font-mono text-xl">{formatTime(recordingTime)}</span>
              <span className="text-base text-gray-400">/ 0:55</span>
            </div>
          )}

          {/* Main button */}
          <Button
            onClick={handleStartButton}
            disabled={chatState === "transcribing" || chatState === "responding"}
            className={`relative w-24 h-24 transition-all duration-300 ${
              chatState === "recording"
                ? "bg-red-500 hover:bg-red-400 scale-110 text-white"
                : chatState === "transcribing" || chatState === "responding"
                ? "bg-gray-200 cursor-not-allowed text-gray-400"
                : "bg-gradient-to-br from-emerald-400 to-teal-600 hover:from-emerald-300 hover:to-teal-500 shadow-lg shadow-emerald-500/30 text-white"
            }`}
            size="icon"
            variant="ghost"
            shape="circle"
            iconOnly
            aria-label="Управление записью"
          >
            {chatState === "recording" ? (
              <span className="material-symbols-outlined text-5xl">stop</span>
            ) : chatState === "transcribing" || chatState === "responding" ? (
              <div className="w-10 h-10 border-3 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-5xl">mic</span>
            )}
          </Button>

          {/* Hint */}
          <p className="text-base text-gray-500 text-center">
            {chatState === "idle" && "Нажми для записи"}
            {chatState === "recording" && "Нажми для остановки"}
            {chatState === "transcribing" && "Обрабатываю..."}
            {chatState === "responding" && "Думаю..."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default VoiceAgentPage;

