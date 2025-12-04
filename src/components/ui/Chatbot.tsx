"use client";

import * as React from "react";
import { MessageCircle, Send, Settings2, Plus, Trash2, RefreshCw, ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { WorkspaceManager } from "@/components/ui/WorkspaceManager";

type Message = {
  role: "user" | "assistant";
  content: string;
  image?: string; // Base64 image for display
};

type HistoryItem = {
  type: string;
  content: string | null;
  name: string | null;
  arguments: string | null;
};

type Model = {
  id: string;
  name: string;
  pricing: {
    input: number;
    output: number;
    currency: string;
    unit: string;
  };
  contextSize: number;
  lastUpdated: string;
};

type Workspace = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  workspace_type: string;
};

type AgentStats = {
  healthy: boolean;
  stats: {
    active_streams: number;
    failed_requests: number;
    success_rate: number;
    successful_requests: number;
    total_requests: number;
    total_tokens_processed: number;
  };
};

// Code block component with syntax highlighting theme
const CodeBlock = ({ code, language }: { code: string; language: string }) => {
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-2 rounded-lg overflow-hidden bg-[#1e1e1e] border border-[#3c3c3c]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-[#3c3c3c]">
        <span className="text-xs text-[#858585] font-mono">{language || "code"}</span>
        <button
          onClick={copyToClipboard}
          className="text-xs text-[#858585] hover:text-white transition-colors"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      {/* Code content */}
      <pre className="p-4 overflow-x-auto text-sm font-mono leading-relaxed">
        <code className="text-[#d4d4d4]">
          {highlightCode(code, language)}
        </code>
      </pre>
    </div>
  );
};

// Simple syntax highlighting
const highlightCode = (code: string, language: string): React.ReactNode[] => {
  const lines = code.split("\n");
  
  return lines.map((line, lineIndex) => {
    const tokens: React.ReactNode[] = [];
    let remaining = line;
    let tokenIndex = 0;

    // Patterns for syntax highlighting
    const patterns: { regex: RegExp; className: string }[] = [
      // Comments
      { regex: /^(\/\/.*)$/, className: "text-[#6a9955]" },
      { regex: /^(#.*)$/, className: "text-[#6a9955]" },
      // Strings
      { regex: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/, className: "text-[#ce9178]" },
      // Keywords (JS/TS/Python)
      { regex: /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|try|catch|throw|new|this|super|extends|implements|interface|type|enum|def|print|elif|except|finally|with|as|lambda|yield|pass|break|continue|in|is|not|and|or|True|False|None)\b/, className: "text-[#569cd6]" },
      // Built-in functions/objects
      { regex: /\b(console|document|window|alert|parseInt|parseFloat|Math|Array|Object|String|Number|Boolean|JSON|Promise|fetch|setTimeout|setInterval|getElementById|innerHTML|querySelector|addEventListener)\b/, className: "text-[#dcdcaa]" },
      // Numbers
      { regex: /\b(\d+\.?\d*)\b/, className: "text-[#b5cea8]" },
      // Operators
      { regex: /(===|!==|==|!=|<=|>=|&&|\|\||[+\-*/%=<>!&|^~])/, className: "text-[#d4d4d4]" },
      // Brackets
      { regex: /([{}[\]().,;:])/, className: "text-[#ffd700]" },
    ];

    // Simple tokenization
    while (remaining.length > 0) {
      let matched = false;

      for (const pattern of patterns) {
        const match = remaining.match(pattern.regex);
        if (match && match.index === 0) {
          tokens.push(
            <span key={`${lineIndex}-${tokenIndex++}`} className={pattern.className}>
              {match[0]}
            </span>
          );
          remaining = remaining.slice(match[0].length);
          matched = true;
          break;
        }
      }

      if (!matched) {
        // Check if next char is part of a word
        const wordMatch = remaining.match(/^(\w+)/);
        if (wordMatch) {
          tokens.push(
            <span key={`${lineIndex}-${tokenIndex++}`} className="text-[#9cdcfe]">
              {wordMatch[0]}
            </span>
          );
          remaining = remaining.slice(wordMatch[0].length);
        } else {
          tokens.push(remaining[0]);
          remaining = remaining.slice(1);
        }
      }
    }

    return (
      <React.Fragment key={lineIndex}>
        {tokens}
        {lineIndex < lines.length - 1 && "\n"}
      </React.Fragment>
    );
  });
};

// Parse inline code
const parseInlineCode = (text: string, keyPrefix: string): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  const regex = /`([^`]+)`/g;
  let lastIndex = 0;
  let match;
  let keyCounter = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <code
        key={`${keyPrefix}-inline-${keyCounter++}`}
        className="px-1.5 py-0.5 rounded bg-[#1e1e1e] text-[#ce9178] font-mono text-xs border border-[#3c3c3c]"
      >
        {match[1]}
      </code>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
};

// Parse bold text
const parseBold = (nodes: React.ReactNode[], keyPrefix: string): React.ReactNode[] => {
  const result: React.ReactNode[] = [];
  let keyCounter = 0;

  nodes.forEach((node, nodeIndex) => {
    if (typeof node !== "string") {
      result.push(node);
      return;
    }

    const regex = /\*\*(.*?)\*\*/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(node)) !== null) {
      if (match.index > lastIndex) {
        result.push(node.slice(lastIndex, match.index));
      }
      result.push(
        <strong key={`${keyPrefix}-bold-${nodeIndex}-${keyCounter++}`} className="font-semibold">
          {match[1]}
        </strong>
      );
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < node.length) {
      result.push(node.slice(lastIndex));
    }
  });

  return result;
};

// Parse headers (## Header)
const parseHeaders = (nodes: React.ReactNode[], keyPrefix: string): React.ReactNode[] => {
  const result: React.ReactNode[] = [];
  let keyCounter = 0;

  nodes.forEach((node, nodeIndex) => {
    if (typeof node !== "string") {
      result.push(node);
      return;
    }

    const lines = node.split("\n");
    lines.forEach((line, lineIndex) => {
      const h2Match = line.match(/^## (.+)$/);
      const h3Match = line.match(/^### (.+)$/);

      if (h3Match) {
        result.push(
          <span key={`${keyPrefix}-h3-${nodeIndex}-${keyCounter++}`} className="font-semibold text-sm block mt-2">
            {h3Match[1]}
          </span>
        );
      } else if (h2Match) {
        result.push(
          <span key={`${keyPrefix}-h2-${nodeIndex}-${keyCounter++}`} className="font-bold text-base block mt-3 mb-1">
            {h2Match[1]}
          </span>
        );
      } else {
        result.push(line);
      }

      if (lineIndex < lines.length - 1) {
        result.push("\n");
      }
    });
  });

  return result;
};

// Main markdown parser
const parseMarkdown = (text: string): React.ReactNode[] => {
  const result: React.ReactNode[] = [];
  
  // First, extract code blocks
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  let blockIndex = 0;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Process text before code block
    if (match.index > lastIndex) {
      const textBefore = text.slice(lastIndex, match.index);
      let parsed = parseInlineCode(textBefore, `pre-${blockIndex}`);
      parsed = parseBold(parsed, `pre-${blockIndex}`);
      parsed = parseHeaders(parsed, `pre-${blockIndex}`);
      result.push(...parsed);
    }

    // Add code block
    result.push(
      <CodeBlock
        key={`codeblock-${blockIndex}`}
        code={match[2].trim()}
        language={match[1] || "plaintext"}
      />
    );

    lastIndex = codeBlockRegex.lastIndex;
    blockIndex++;
  }

  // Process remaining text
  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex);
    let parsed = parseInlineCode(remaining, `post-${blockIndex}`);
    parsed = parseBold(parsed, `post-${blockIndex}`);
    parsed = parseHeaders(parsed, `post-${blockIndex}`);
    result.push(...parsed);
  }

  return result.length > 0 ? result : [text];
};

// Supported image types
const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/bmp"];

// Available tools for the agent
const AVAILABLE_TOOLS = [
  { id: "web_search", name: "Web Search", description: "Search the web" },
  { id: "code_interpreter", name: "Code Interpreter", description: "Execute code" },
  { id: "file_browser", name: "File Browser", description: "Browse files" },
];

export function Chatbot() {
  const [open, setOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm your AI Agent. Select a workspace and tools to get started!",
    },
  ]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [isTyping, setIsTyping] = React.useState(false);
  const [isAtBottom, setIsAtBottom] = React.useState(true);
  
  // Models
  const [models, setModels] = React.useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = React.useState<string>(
    "meta-llama/llama-4-maverick-17b-128e-instruct"
  );
  
  // Workspaces
  const [workspaces, setWorkspaces] = React.useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = React.useState<string>("");
  const [newWorkspaceName, setNewWorkspaceName] = React.useState("");
  const [creatingWorkspace, setCreatingWorkspace] = React.useState(false);
  
  // Tools
  const [selectedTools, setSelectedTools] = React.useState<string[]>([]);
  const [availableTools, setAvailableTools] = React.useState<string[]>([]);
  
  // Agent Stats
  const [agentStats, setAgentStats] = React.useState<AgentStats | null>(null);
  
  // Chat History for Agent
  const [chatHistory, setChatHistory] = React.useState<HistoryItem[]>([]);
  
  // Mode: chat, agent, detect, or ocr
  const [mode, setMode] = React.useState<"chat" | "agent" | "detect" | "ocr">("chat");
  
  // Image upload
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [imageError, setImageError] = React.useState<string | null>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  
  // Image focus dialog
  const [focusedImage, setFocusedImage] = React.useState<string | null>(null);
  
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const messagesContainerRef = React.useRef<HTMLDivElement>(null);

  const checkIfAtBottom = React.useCallback(() => {
    if (!messagesContainerRef.current) return false;
    const container = messagesContainerRef.current;
    const threshold = 100;
    const isBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      threshold;
    return isBottom;
  }, []);

  const handleScroll = React.useCallback(() => {
    setIsAtBottom(checkIfAtBottom());
  }, [checkIfAtBottom]);

  // Fetch models when dialog opens
  React.useEffect(() => {
    if (open && models.length === 0) {
      fetch("/api/model")
        .then((res) => res.json())
        .then((data) => {
          if (data.models && Array.isArray(data.models)) {
            setModels(data.models);
            if (!selectedModel && data.models.length > 0) {
              setSelectedModel(data.models[0].id);
            }
          }
        })
        .catch((error) => {
          console.error("Failed to fetch models:", error);
        });
    }
  }, [open, models.length, selectedModel]);

  // Fetch workspaces when dialog opens
  React.useEffect(() => {
    if (open && workspaces.length === 0) {
      fetchWorkspaces();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, workspaces.length]);

  // Fetch agent tools when dialog opens
  React.useEffect(() => {
    if (open) {
      fetch("/api/agent?action=tools")
        .then((res) => res.json())
        .then((data) => {
          if (data.tools && Array.isArray(data.tools)) {
            setAvailableTools(data.tools);
          }
        })
        .catch((error) => {
          console.error("Failed to fetch tools:", error);
        });
    }
  }, [open]);

  // Fetch agent stats
  React.useEffect(() => {
    if (open) {
      fetch("/api/agent?action=stats")
        .then((res) => res.json())
        .then((data) => {
          setAgentStats(data);
        })
        .catch((error) => {
          console.error("Failed to fetch agent stats:", error);
        });
    }
  }, [open]);

  // Reset scroll position when dialog opens
  React.useEffect(() => {
    if (open) {
      setIsAtBottom(true);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 1);
    }
  }, [open]);

  const fetchWorkspaces = async () => {
    try {
      const res = await fetch("/api/workspace?action=list");
      const data = await res.json();
      if (data.workspaces && Array.isArray(data.workspaces)) {
        setWorkspaces(data.workspaces);
        if (!selectedWorkspace && data.workspaces.length > 0) {
          setSelectedWorkspace(data.workspaces[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch workspaces:", error);
    }
  };

  const createWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;
    
    setCreatingWorkspace(true);
    try {
      const res = await fetch("/api/workspace?action=create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newWorkspaceName.trim(),
          workspace_type: "personal",
        }),
      });
      const data = await res.json();
      if (data.workspace) {
        setWorkspaces((prev) => [...prev, data.workspace]);
        setSelectedWorkspace(data.workspace.id);
        setNewWorkspaceName("");
      }
    } catch (error) {
      console.error("Failed to create workspace:", error);
    } finally {
      setCreatingWorkspace(false);
    }
  };

  const deleteWorkspace = async (workspaceId: string) => {
    try {
      await fetch(`/api/workspace?action=delete&workspace_id=${workspaceId}`, {
        method: "DELETE",
      });
      setWorkspaces((prev) => prev.filter((w) => w.id !== workspaceId));
      if (selectedWorkspace === workspaceId) {
        setSelectedWorkspace(workspaces[0]?.id || "");
      }
    } catch (error) {
      console.error("Failed to delete workspace:", error);
    }
  };

  const toggleTool = (toolId: string) => {
    setSelectedTools((prev) =>
      prev.includes(toolId)
        ? prev.filter((t) => t !== toolId)
        : [...prev, toolId]
    );
  };

  // Process image file (shared between file input and paste)
  const processImageFile = React.useCallback((file: File) => {
    setImageError(null);
    
    // Validate file type
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      setImageError("Invalid file type. Supported: jpeg, png, webp, bmp");
      return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setImageError("File too large. Maximum size: 10MB");
      return;
    }
    
    // Convert to base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setSelectedImage(base64);
      setImagePreview(base64);
    };
    reader.readAsDataURL(file);
  }, []);

  // Handle image selection from file input
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(file);
  };

  // Handle paste from clipboard
  const handlePaste = React.useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          processImageFile(file);
        }
        break;
      }
    }
  }, [processImageFile]);

  // Add paste event listener when dialog is open
  React.useEffect(() => {
    if (open) {
      document.addEventListener("paste", handlePaste);
      return () => {
        document.removeEventListener("paste", handlePaste);
      };
    }
  }, [open, handlePaste]);

  // Remove selected image
  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setImageError(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  // Fungsi untuk menampilkan respon secara bertahap (lebih cepat dengan chunk-based)
  const display = async (text: string, messageIndex: number) => {
    setIsTyping(true);
    const chunkSize = 10; // Render 10 karakter sekaligus untuk lebih cepat
    
    for (let i = 0; i < text.length; i += chunkSize) {
      const chunk = text.slice(i, i + chunkSize);
      setMessages((prevMessages) => {
        const newMessages = [...prevMessages];
        newMessages[messageIndex] = {
          ...newMessages[messageIndex],
          content: newMessages[messageIndex].content + chunk,
        };
        return newMessages;
      });
      
      // Gunakan requestAnimationFrame untuk batch update yang lebih efisien
      // Ini akan sync dengan browser refresh rate (~60fps) untuk performa optimal
      if (i + chunkSize < text.length) {
        await new Promise((resolve) => {
          requestAnimationFrame(resolve);
        });
      }
      
      // Auto-scroll jika user di bottom
      if (checkIfAtBottom()) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
    setIsTyping(false);
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || loading) return;

    // Store image for API call and display before clearing
    const imageToSend = selectedImage;
    const imageForDisplay = imagePreview; // Keep full data URL for display

    // Create message with optional image
    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      image: imageForDisplay || undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    removeImage(); // Clear image after sending
    setLoading(true);
    setIsAtBottom(true);
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);

    try {
      let fullContent = "";

      // Handle different modes
      if (mode === "detect" && imageToSend) {
        // Object Detection mode
        let base64Image = imageToSend;
        if (imageToSend.includes(",")) {
          base64Image = imageToSend.split(",")[1];
        }
        
        const detectResponse = await fetch("/api/detect?action=segment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: base64Image,
            prompts: input.trim() ? input.trim().split(",").map(p => p.trim()) : [],
            return_annotated: true,
            return_masks: true,
            threshold: 0.5,
          }),
        });

        const detectData = await detectResponse.json();
        
        let annotatedImage: string | undefined;
        if (detectData.annotated_image) {
          annotatedImage = `data:image/png;base64,${detectData.annotated_image}`;
        }
        
        if (detectData.error) {
          fullContent = `**Error:** ${detectData.detail || detectData.error}`;
        } else if (detectData.results && detectData.results.length > 0) {
          const objectCounts: Record<string, number> = {};
          detectData.results.forEach((result: { name: string }) => {
            objectCounts[result.name] = (objectCounts[result.name] || 0) + 1;
          });
          const summary = Object.entries(objectCounts)
            .map(([name, count]) => `${count} ${name}${count > 1 ? 's' : ''}`)
            .join(', ');
          fullContent = `✅ Detected: ${summary}`;
        } else {
          fullContent = `No objects detected.`;
          if (input.trim()) {
            fullContent += ` Searched for: ${input.trim()}`;
          }
        }

        const assistantMessage: Message = {
          role: "assistant",
          content: fullContent,
          image: annotatedImage,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setLoading(false);
        return;
      } else if (mode === "ocr" && imageToSend) {
        // OCR mode - Extract text from image using multipart/form-data
        const ocrResponse = await fetch("/api/ocr?action=form", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_data: imageToSend, // Send full data URL including prefix
            language: "auto",
            invoice: false,
          }),
        });

        const ocrData = await ocrResponse.json();
        console.log("OCR Response:", ocrData);
        
        if (ocrData.error) {
          const errorDetail = ocrData.details?.message || ocrData.details?.error || ocrData.error;
          fullContent = `**Error:** ${errorDetail}`;
        } else if (ocrData.text || ocrData.extracted_text || ocrData.result || ocrData.content) {
          const extractedText = ocrData.text || ocrData.extracted_text || ocrData.result || ocrData.content || "";
          fullContent = `📝 **Extracted Text:**\n\n${extractedText}`;
        } else if (ocrData.blocks || ocrData.lines || ocrData.paragraphs) {
          // Handle structured OCR response
          const items = ocrData.blocks || ocrData.lines || ocrData.paragraphs || [];
          const text = items.map((b: { text?: string; content?: string; value?: string }) => 
            b.text || b.content || b.value || ""
          ).join("\n");
          fullContent = `📝 **Extracted Text:**\n\n${text || "No text found in image."}`;
        } else if (typeof ocrData === "object" && Object.keys(ocrData).length > 0) {
          // Try to extract any text-like field from the response
          const possibleTextFields = ["text", "content", "result", "extracted_text", "ocr_text", "data"];
          let foundText = "";
          for (const field of possibleTextFields) {
            if (ocrData[field] && typeof ocrData[field] === "string") {
              foundText = ocrData[field];
              break;
            }
          }
          if (foundText) {
            fullContent = `📝 **Extracted Text:**\n\n${foundText}`;
          } else {
            fullContent = `📝 **OCR Result:**\n\n\`\`\`json\n${JSON.stringify(ocrData, null, 2)}\n\`\`\``;
          }
        } else {
          fullContent = `📝 No text found in the image.`;
        }

        const assistantMessage: Message = {
          role: "assistant",
          content: fullContent,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setLoading(false);
        return;
      } else if (mode === "agent" && selectedWorkspace) {
        // Use Agent API
        const response = await fetch("/api/agent?action=generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: input.trim(),
            model: selectedModel,
            workspace_id: selectedWorkspace,
            tools: selectedTools,
            history: chatHistory,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to get response");
        }

        const data = await response.json();
        fullContent = data.output || "Sorry, I couldn't process that.";

        // Update chat history
        setChatHistory((prev) => [
          ...prev,
          { type: "user", content: input.trim(), name: null, arguments: null },
          { type: "assistant", content: fullContent, name: null, arguments: null },
        ]);
      } else {
        // Use Chat API
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((msg) => ({
              role: msg.role,
              content: msg.content,
            })),
            model: selectedModel,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to get response");
        }

        const data = await response.json();
        fullContent = data.choices[0]?.message?.content || "Sorry, I couldn't process that.";
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: "",
      };

      let messageIndex = 0;
      setMessages((prev) => {
        const newMessages = [...prev, assistantMessage];
        messageIndex = newMessages.length - 1;
        return newMessages;
      });
      setLoading(false);

      await display(fullContent, messageIndex);
    } catch (error) {
      console.error("Chat error:", error);
      const errorContent = "Sorry, there was an error. Please try again.";
      const errorMessage: Message = {
        role: "assistant",
        content: "",
      };

      let errorMessageIndex = 0;
      setMessages((prev) => {
        const newMessages = [...prev, errorMessage];
        errorMessageIndex = newMessages.length - 1;
        return newMessages;
      });
      setLoading(false);

      await display(errorContent, errorMessageIndex);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content: "Chat cleared! How can I help you?",
      },
    ]);
    setChatHistory([]);
    removeImage();
  };

  return (
    <>
      {/* Floating Chat Button */}
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
        <span className="sr-only">Open chat</span>
      </Button>

      {/* Chat Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex flex-col h-[700px] max-w-lg p-0">
          <DialogHeader className="px-4 pt-4 pb-3 border-b space-y-3">
            {/* Title Row */}
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="flex items-center gap-2 text-base">
                <MessageCircle className="h-5 w-5" />
                AI Agent
              </DialogTitle>
              <div className="flex items-center gap-1">
                <WorkspaceManager
                  selectedWorkspace={selectedWorkspace}
                  onWorkspaceSelect={setSelectedWorkspace}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSettingsOpen(!settingsOpen)}
                  className="h-8 w-8"
                  title="Settings"
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearChat}
                  className="h-8 w-8"
                  title="Clear chat"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Settings Panel */}
            {settingsOpen && (
              <div className="space-y-3 pt-2 border-t">
                {/* Mode Selection */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-16">Mode:</span>
                  <Select value={mode} onValueChange={(v: "chat" | "agent" | "detect" | "ocr") => setMode(v)}>
                    <SelectTrigger className="flex-1 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chat">💬 Chat</SelectItem>
                      <SelectItem value="agent">🤖 Agent</SelectItem>
                      <SelectItem value="detect">🔍 Object Detection</SelectItem>
                      <SelectItem value="ocr">📝 OCR (Text Extract)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Model Selection */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-16">Model:</span>
                  {models.length > 0 && (
                    <Select
                      value={selectedModel}
                      onValueChange={setSelectedModel}
                      disabled={loading || isTyping}
                    >
                      <SelectTrigger className="flex-1 h-8 text-xs">
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        {models.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Workspace Selection (Agent mode only) */}
                {mode === "agent" && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-16">Workspace:</span>
                      <Select
                        value={selectedWorkspace}
                        onValueChange={setSelectedWorkspace}
                        disabled={loading || isTyping}
                      >
                        <SelectTrigger className="flex-1 h-8 text-xs">
                          <SelectValue placeholder="Select workspace" />
                        </SelectTrigger>
                        <SelectContent>
                          {workspaces.map((ws) => (
                            <SelectItem key={ws.id} value={ws.id}>
                              {ws.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Create Workspace */}
                    <div className="flex items-center gap-2">
                      <Input
                        value={newWorkspaceName}
                        onChange={(e) => setNewWorkspaceName(e.target.value)}
                        placeholder="New workspace name..."
                        className="flex-1 h-8 text-xs"
                        disabled={creatingWorkspace}
                      />
                      <Button
                        onClick={createWorkspace}
                        disabled={!newWorkspaceName.trim() || creatingWorkspace}
                        size="icon"
                        className="h-8 w-8"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      {selectedWorkspace && (
                        <Button
                          onClick={() => deleteWorkspace(selectedWorkspace)}
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Tools Selection (Agent mode only) */}
                {mode === "agent" && (
                  <div className="space-y-2">
                    <span className="text-xs text-muted-foreground">Tools:</span>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_TOOLS.map((tool) => (
                        <Button
                          key={tool.id}
                          variant={selectedTools.includes(tool.id) ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleTool(tool.id)}
                          className="h-7 text-xs"
                          disabled={loading || isTyping}
                        >
                          {tool.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Agent Stats */}
                {mode === "agent" && agentStats && (
                  <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                    <span className={agentStats.healthy ? "text-green-500" : "text-red-500"}>
                      ● {agentStats.healthy ? "Healthy" : "Unhealthy"}
                    </span>
                    {" | "}
                    Requests: {agentStats.stats.total_requests}
                    {" | "}
                    Success: {(agentStats.stats.success_rate * 100).toFixed(0)}%
                  </div>
                )}
              </div>
            )}
          </DialogHeader>

          {/* Messages Area */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
          >
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-4 py-2",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  {/* Show image if present - clickable to focus */}
                  {message.image && (
                    <div className="mb-2">
                      <img
                        src={message.image}
                        alt="Attached"
                        className="max-w-full max-h-48 rounded-lg object-contain cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setFocusedImage(message.image!)}
                      />
                    </div>
                  )}
                  {/* Show text content */}
                  {message.content && (
                    <p className="text-sm whitespace-pre-wrap">
                      {parseMarkdown(message.content)}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-2">
                  <div className="flex gap-1">
                    <div className="h-2 w-2 bg-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="h-2 w-2 bg-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="h-2 w-2 bg-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="px-4 pb-4 pt-3 border-t space-y-2">
            {/* Image Preview */}
            {imagePreview && (
              <div className="relative inline-block">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-20 w-20 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setFocusedImage(imagePreview)}
                />
                <button
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            
            {/* Image Error */}
            {imageError && (
              <p className="text-xs text-destructive">{imageError}</p>
            )}
            
            <div className="flex gap-2">
              {/* Hidden file input */}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/bmp"
                onChange={handleImageSelect}
                className="hidden"
              />
              
              {/* Image upload button */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => imageInputRef.current?.click()}
                disabled={loading || isTyping}
                title="Upload image"
              >
                <ImageIcon className="h-4 w-4" />
                <span className="sr-only">Upload image</span>
              </Button>
              
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  mode === "detect" 
                    ? "Objects to detect (comma-separated)..." 
                    : mode === "ocr" 
                      ? "Upload image to extract text" 
                      : mode === "agent" 
                        ? "Ask the agent..." 
                        : "Type your message..."
                }
                disabled={loading || isTyping}
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={loading || isTyping || (!input.trim() && !selectedImage)}
                size="icon"
              >
                <Send className="h-4 w-4" />
                <span className="sr-only">Send message</span>
              </Button>
            </div>
            {mode === "agent" && !selectedWorkspace && !selectedImage && (
              <p className="text-xs text-muted-foreground">
                ⚠️ Please select or create a workspace first
              </p>
            )}
            {mode === "detect" && !selectedImage && (
              <p className="text-xs text-muted-foreground">
                🔍 Upload an image to detect objects
              </p>
            )}
            {mode === "ocr" && !selectedImage && (
              <p className="text-xs text-muted-foreground">
                📝 Upload an image to extract text (OCR)
              </p>
            )}
            {selectedImage && mode === "detect" && (
              <p className="text-xs text-muted-foreground">
                📷 Image attached. Add object names (comma-separated) or leave empty for auto-detection.
              </p>
            )}
            {selectedImage && mode === "ocr" && (
              <p className="text-xs text-muted-foreground">
                📷 Image attached. Click send to extract text.
              </p>
            )}
            {selectedImage && (mode === "chat" || mode === "agent") && (
              <p className="text-xs text-muted-foreground">
                📷 Image attached. Switch to Detect or OCR mode to analyze the image.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Focus Dialog */}
      <Dialog open={!!focusedImage} onOpenChange={() => setFocusedImage(null)}>
        <DialogContent className="max-w-[95vw] w-fit max-h-[95vh]">
          <DialogTitle className="sr-only">Image Preview</DialogTitle>
          {focusedImage && (
            <div className="relative flex items-center justify-center">
              <img
                src={focusedImage}
                alt="Focused"
                className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
