import { ChangeEvent, DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AuthModal } from "./components/AuthModal";
import { Composer } from "./components/Composer";
import { LogoutConfirmModal } from "./components/LogoutConfirmModal";
import { MessageList } from "./components/MessageList";
import { ModelPanel } from "./components/ModelPanel";
import { SidePanel } from "./components/SidePanel";
import { TopBar } from "./components/TopBar";
import { modelOptions } from "./constants/models";
import { getSampleInput } from "./constants/samples";
import type { AuthMode, ChatMessage, DataType, ModelKey, PredictionMode, Theme, User } from "./types";
import { API_BASE_URL, parseApiResponse } from "./utils/api";
import { createId, getErrorMessage, prettyJson } from "./utils/common";
import {
  buildPredictionPayload,
  formatPredictionResult,
  getPredictionEndpoint,
} from "./utils/predictions";

function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    return localStorage.getItem("theme") === "dark" ? "dark" : "light";
  });
  const [user, setUser] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authUsername, setAuthUsername] = useState("");
  const [authFullName, setAuthFullName] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [mode, setMode] = useState<PredictionMode>("single");
  const [dataType, setDataType] = useState<DataType>("json");
  const [selectedModel, setSelectedModel] = useState<ModelKey>("default");
  const [modelPanelOpen, setModelPanelOpen] = useState(false);
  const [inputText, setInputText] = useState(getSampleInput("single", "json"));
  const [isDragging, setIsDragging] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: createId(),
      role: "assistant",
      title: "Prediction chat",
      body: "Paste JSON or CSV, or drag a .json/.csv file into the chat. Choose single or batch, then send it to the backend.",
    },
  ]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesRef = useRef<HTMLElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const endpoint = useMemo(() => {
    return getPredictionEndpoint(mode, selectedModel);
  }, [mode, selectedModel]);

  const selectedModelOption = useMemo(() => {
    return modelOptions.find((modelOption) => modelOption.key === selectedModel) ?? modelOptions[0];
  }, [selectedModel]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    void refreshMe();
  }, []);

  useEffect(() => {
    const messagesElement = messagesRef.current;
    if (messagesElement) {
      requestAnimationFrame(() => {
        messagesElement.scrollTo({
          top: messagesElement.scrollHeight,
          behavior: "smooth",
        });
      });
      return;
    }

    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const addMessage = (message: Omit<ChatMessage, "id">) => {
    setMessages((currentMessages) => [...currentMessages, { ...message, id: createId() }]);
  };

  const request = async (path: string, init?: RequestInit) => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
      ...init,
    });
    const body = await parseApiResponse(response);

    if (!response.ok) {
      const detail =
        typeof body === "object" && body !== null
          ? ((body as { message?: string; error?: string }).error ??
            (body as { message?: string; error?: string }).message)
          : String(body);
      throw new Error(detail || `Request failed with status ${response.status}`);
    }

    return body;
  };

  const refreshMe = async () => {
    try {
      const body = (await request("/auth/me")) as { user: User };
      setUser(body.user);
    } catch {
      setUser(null);
    }
  };

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthBusy(true);

    try {
      const payload =
        authMode === "login"
          ? { username: authUsername, password: authPassword }
          : { username: authUsername, fullName: authFullName, password: authPassword };
      await request(`/auth/${authMode}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (authMode === "signup") {
        await request("/auth/login", {
          method: "POST",
          body: JSON.stringify({ username: authUsername, password: authPassword }),
        });
      }

      await refreshMe();
      setAuthOpen(false);
      addMessage({
        role: "assistant",
        title: "Signed in",
        body: "You can now send prediction requests through the Node backend.",
      });
    } catch (error) {
      addMessage({
        role: "error",
        title: "Authentication failed",
        body: getErrorMessage(error),
      });
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      await request("/auth/logout", { method: "POST", body: "{}" });
    } catch {
      // The local state should still clear if the server cookie is already gone.
    }

    setUser(null);
    setLogoutConfirmOpen(false);
    addMessage({
      role: "assistant",
      title: "Signed out",
      body: "Prediction endpoints require login before sending requests.",
    });
  };

  const handleModeChange = (nextMode: PredictionMode) => {
    setMode(nextMode);
    setInputText(getSampleInput(nextMode, dataType));
  };

  const handleDataTypeChange = (nextDataType: DataType) => {
    setDataType(nextDataType);
    setInputText(getSampleInput(mode, nextDataType));
  };

  const submitPrediction = async () => {
    if (!user) {
      setAuthOpen(true);
      addMessage({
        role: "assistant",
        title: "Login required",
        body: "Sign in before sending predictions to the backend.",
      });
      return;
    }

    let payload: unknown;
    try {
      payload = buildPredictionPayload(inputText, mode, dataType);
    } catch (error) {
      addMessage({
        role: "error",
        title: dataType === "json" ? "Invalid JSON" : "Invalid CSV",
        body: getErrorMessage(error),
      });
      return;
    }

    setIsSending(true);
    addMessage({
      role: "user",
      title:
        mode === "single"
          ? `Single ${dataType.toUpperCase()} prediction request`
          : `Batch ${dataType.toUpperCase()} prediction request`,
      body: dataType === "json" ? prettyJson(payload) : inputText,
    });

    try {
      const requestInit =
        dataType === "csv"
          ? {
              method: "POST",
              headers: { "Content-Type": "text/csv" },
              body: inputText,
            }
          : {
              method: "POST",
              body: JSON.stringify(payload),
            };
      const result = await request(endpoint, {
        ...requestInit,
      });
      addMessage({
        role: "result",
        title: "Prediction result",
        body: formatPredictionResult(result, payload, dataType, mode),
      });
    } catch (error) {
      addMessage({
        role: "error",
        title: "Prediction failed",
        body: getErrorMessage(error),
      });
    } finally {
      setIsSending(false);
    }
  };

  const readFile = async (file: File) => {
    const text = await file.text();
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith(".csv")) {
      setDataType("csv");
    } else if (fileName.endsWith(".json")) {
      setDataType("json");
    }

    setInputText(text);
    addMessage({
      role: "assistant",
      title: `Loaded ${file.name}`,
      body: "The file was loaded into the editor and has not been sent yet.",
    });
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      await readFile(file);
    } catch (error) {
      addMessage({
        role: "error",
        title: "Could not read file",
        body: getErrorMessage(error),
      });
    } finally {
      event.target.value = "";
    }
  };

  const handleDrop = async (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (!file) {
      return;
    }

    try {
      await readFile(file);
    } catch (error) {
      addMessage({
        role: "error",
        title: "Could not read file",
        body: getErrorMessage(error),
      });
    }
  };

  return (
    <div className="app-shell">
      <SidePanel selectedModel={selectedModelOption} />

      <main
        className={`chat-panel ${isDragging ? "is-dragging" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <TopBar
          theme={theme}
          user={user}
          onOpenModels={() => setModelPanelOpen(true)}
          onToggleTheme={() => setTheme(theme === "light" ? "dark" : "light")}
          onOpenAuth={() => setAuthOpen(true)}
          onOpenLogoutConfirm={() => setLogoutConfirmOpen(true)}
        />

        <MessageList
          messages={messages}
          messagesRef={messagesRef}
          messagesEndRef={messagesEndRef}
        />

        <Composer
          mode={mode}
          dataType={dataType}
          inputText={inputText}
          isSending={isSending}
          fileInputRef={fileInputRef}
          onAddFile={() => fileInputRef.current?.click()}
          onModeChange={handleModeChange}
          onDataTypeChange={handleDataTypeChange}
          onInputTextChange={setInputText}
          onClearInput={() => setInputText("")}
          onSubmit={submitPrediction}
          onFileChange={handleFileChange}
        />
      </main>

      {authOpen && (
        <AuthModal
          authMode={authMode}
          username={authUsername}
          fullName={authFullName}
          password={authPassword}
          busy={authBusy}
          onClose={() => setAuthOpen(false)}
          onSubmit={handleAuthSubmit}
          onAuthModeChange={setAuthMode}
          onUsernameChange={setAuthUsername}
          onFullNameChange={setAuthFullName}
          onPasswordChange={setAuthPassword}
        />
      )}

      {logoutConfirmOpen && (
        <LogoutConfirmModal onCancel={() => setLogoutConfirmOpen(false)} onConfirm={handleLogout} />
      )}

      {modelPanelOpen && (
        <ModelPanel
          modelOptions={modelOptions}
          selectedModel={selectedModel}
          onClose={() => setModelPanelOpen(false)}
          onSelectModel={(model) => {
            setSelectedModel(model);
            setModelPanelOpen(false);
          }}
        />
      )}
    </div>
  );
}

export default App;
