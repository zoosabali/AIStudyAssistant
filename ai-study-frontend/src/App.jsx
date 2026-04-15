import { useState, useEffect, useRef } from "react";
//import { useState } from "react";
import "./App.css";

function App() {
  const API_BASE = "https://aistudyassistant-api-cggrd5gudtd4aedm.centralus-01.azurewebsites.net";
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([]);
  const [fileName, setFileName] = useState("");
  const chatEndRef = useRef(null);
  useEffect(() => {
  chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
}, [messages, loading]);
  const handleFileUpload = async (e) => {
  const file = e.target.files[0];
  setFileName(file.name);
    if (!file) return;
  const text = await file.text();
  const lines = text.split("\n");
  const documents = lines
    .filter(line => line.trim() !== "")
    .map(line => ({
      title: line.substring(0, 30),
      content: line
    }));

    try {
      await fetch(`${API_BASE}/documents/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(documents)
      });

    alert("✅ Notes uploaded!");
  } catch (err) {
    console.error(err);
    alert("❌ Upload failed");
  }
};
  const handleAsk = async () => {
    if (!question.trim()) return;

  const userMessage = { role: "user", text: question };

  setMessages(prev => [...prev, userMessage]);
  setQuestion("");

  try {
    setLoading(true);

    const res = await fetch(`${API_BASE}/documents/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ question: userMessage.text })
    });

    if (!res.ok) {
  throw new Error(`Server error: ${res.status}`);
}

const data = await res.json();

    const botMessage = {
      role: "bot",
      text: data.answer,
      confidence: data.confidence?.label,
      sources: data.sources
    };

    setMessages(prev => [...prev, botMessage]);

  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
};

  return (
  <div className="app-container">
    <div className="chat-wrapper">
      <h1 className="title">AI Study Assistant</h1>

    <div className="upload-section">
  <label className="upload-box">
    <div className="upload-label">
      📄 Upload Notes / PDF
    </div>

    {fileName && (
      <div className="file-name">
        Uploaded: {fileName}
      </div>
    )}

    <input
      type="file"
      onChange={handleFileUpload}
      hidden
    />
  </label>
</div>

      {/* Input */}
      <div className="input-section">
        <input
  className="question-input"
  value={question}
  onChange={(e) => setQuestion(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === "Enter") {
      handleAsk();
    }
  }}
  placeholder="Ask something..."
/>

        <button
          className="ask-btn"
          onClick={handleAsk}
          disabled={loading}
        >
          {loading ? "Thinking..." : "Ask"}
        </button>
      </div>

      {/* Chat */}
      <div className="chat-box">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`message-row ${msg.role === "user" ? "user" : "bot"}`}
          >
            <div className="message-bubble">
              <p>{msg.text}</p>

              {/* {msg.role === "bot" && (
                <>
                  {msg.confidence && (
                    <p>
                      <strong>Confidence:</strong> {msg.confidence}
                    </p>
                  )}
                </>
              )} */}
            </div>
          </div>
        ))}

        {loading && (
          <div className="message-row bot">
            <div className="message-bubble thinking">
              🤖 Thinking<span className = "dots"></span>
            </div>
          </div>
        )}

        <div ref={chatEndRef}></div>
      </div>
    </div>
  </div>
);}

export default App;
