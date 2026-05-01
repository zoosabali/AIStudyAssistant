import { useState, useEffect, useRef } from "react";
//import { useState } from "react";
import "./App.css";

function App() {
  const API_BASE = "https://aistudyassistant-api-cggrd5gudtd4aedm.centralus-01.azurewebsites.net";
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const chatEndRef = useRef(null);
  const [mode, setMode] = useState("Normal");
  const [stage, setStage] = useState("idle");
  const [attempt, setAttempt] = useState("");
  const [notInNotes, setNotInNotes] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState("");

  const handleModeChange = (newMode) => {
  setMode(newMode);

  if(notInNotes) {
    setStage("final");
    return;
  }


  setAttempt(newMode);
  setNotInNotes(false);

  if (!currentQuestion) {
    setStage("idle");
    setLastResponse("");
    return;
  }

  // Smart re-entry logic
  if (newMode === "Normal") {
    setStage("final");   // show direct answer if exists
  }

  if(newMode === "Sinkin"){
    setAttempt("");
    setStage("attempt");
  }
};

  const [lastResponse, setLastResponse] = useState("");
  
  useEffect(() => {
  chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
}, [loading, lastResponse]);

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

//HANDLE ASK
const handleAsk = async () => {

  if (!question.trim()) return;

  setCurrentQuestion(question);
  setQuestion("");
  setAttempt("");
  setLastResponse("");
  setNotInNotes(false);

  try {
    setLoading(true);

    const res = await fetch(`${API_BASE}/documents/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ question })
    });

    const data = await res.json();

    const isNotInNotes =
      data.answer &&
      data.answer.toLowerCase().includes("i could not find this in your notes");

    if (isNotInNotes) {
      setNotInNotes(true);
      setLastResponse(data.answer);
      setStage("final");
      return;
    }

    // NORMAL MODE
    if (mode === "Normal") {
      setLastResponse(data.answer);
      setStage("final");
      return;
    }

    // SINKIN MODE
    if (mode === "Sinkin") {
      setLastResponse(data.answer);
      setStage("attempt");
      return;
    }

  } 
  
  catch (err) 
  {
    console.error(err);
    setLastResponse("Something went wrong. Please try again.");
    setStage("final")
  } finally {
    setLoading(false);
  }
};

const submitAttempt = async () => {
  setLoading(true);

  const res = await fetch(`${API_BASE}/documents/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      question: currentQuestion,
      mode,
      userAttempt: attempt,
      stageType: "Feedback"
    })
  });
  setStage("feedback");
  const data = await res.json();

  //setMessages(prev => [...prev, { role: "bot", text: data.answer }]);
  setLastResponse(data.answer);
  setStage("feedback");
  setLoading(false);
};

const step =
  stage === "attempt" ? 1 :
  stage === "feedback" ? 2 :
  stage === "explanation" ? 3 :
  stage === "final" ? 4 : 0;

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

<div className="mode-toggle">
  <label className="switch">
    <input
      type="checkbox"
      checked={mode === "Sinkin"}
      onChange={(e) =>
        handleModeChange(e.target.checked ? "Sinkin" : "Normal")
      }
    />
    <span className="slider"></span>
  </label>

  <span className="mode-label-text">
    {mode === "Sinkin" ? "Sinkin Mode" : "Normal Mode"}
  </span>
</div>
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

{mode === "Sinkin" && !notInNotes && (
  <>
  <div className="progress-container">
    <div
      className="progress-fill"
      style={{ width: `${(step / 4) * 100}%` }}
    />
  </div>

  <div className="progress-steps">
      <span className={step >= 1 ? "active" : ""}>Think</span>
      <span className={step === 2 ? "current" : step > 2 ? "done" : ""}>
        Refine
      </span>
      <span className={step >= 3 ? "active" : ""}>Understand</span>
      <span className={step >= 4 ? "active" : ""}>Master</span>
    </div>
  </>
)}


{currentQuestion && (
  <div className="question-card">
    {currentQuestion}
  </div>
)}

{mode === "Sinkin" && 
currentQuestion &&
!notInNotes &&
(stage === "attempt" || stage ==="idle") && (
  <div className="sinkin-card">
    <h3>Think first</h3>
      <p className="mode-label">
          🧠 Guided Mode — Think first, then refine
      </p>
<p className="hint-text">
  Don’t worry about being perfect — just think out loud.
</p>

    <textarea
      value={attempt}
      onChange={(e) => setAttempt(e.target.value)}
      onKeyDown={(e) => {
         if (e.key === "Enter" && !attempt.trim()) {
      e.preventDefault();
      }
    // e.target.style.height = "auto";
    // e.target.style.height = e.target.scrollHeight + "px";
  }}
      placeholder={`Explain in your own words...

Start simple:
• What is it?
• How does it work?`}
    />
<button
  className="submit-btn"
  onClick={submitAttempt}
  disabled={!attempt.trim()}
>
  Submit Attempt
</button>

{!attempt.trim() && (
  <div className="hint-text">
    Write your understanding to continue
  </div>
)}
   
     <span>{attempt.length} characters</span>
  </div>
)}

{stage === "explanation" && (
  <div className="sinkin-card">
    <h3>Understand the concept</h3>

    <pre>{lastResponse}</pre>

    <button onClick={async () => {
      setLoading(true);

      const res = await fetch(`${API_BASE}/documents/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question: currentQuestion,
          mode,
          userAttempt: attempt,
          stageType: "Final"
        })
      });

      const data = await res.json();

      setLastResponse(data.answer);
      setStage("final");
      setLoading(false);
    }}>
      Reveal Final Answer
    </button>
  </div>
)}

{stage === "feedback" && (
  <div className="sinkin-card">
    <h3>Refine your thinking</h3>

    <pre>{lastResponse}</pre>

    <button onClick={async () => {
      setLoading(true);

      const res = await fetch(`${API_BASE}/documents/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question: currentQuestion,
          mode,
          userAttempt: attempt,
          stageType: "Explanation"
        })
      });

      const data = await res.json();

      setLastResponse(data.answer);
      setStage("explanation");
      setLoading(false);
    }}>
      Continue to Explanation
    </button>
  </div>
)}

{/* { stage === "final" && (
  <div className="sinkin-card">
    <h3>Final Answer</h3>

    <pre>{lastResponse}</pre>
  </div>
)} */}

{stage === "final" && (
  <div className="sinkin-card">
    <h3>Final Answer</h3>

    <pre>
      {/* {mode === "Sinkin"
        ? lastResponse
        : messages[0]?.text} */}
        {lastResponse}
    </pre>
  </div>
)}



      {/* Chat */}
      <div className="chat-box">

        {/* {messages.map((msg, i) => (
          <div
            key={i}
            className={`message-row ${msg.role === "user" ? "user" : "bot"}`}
          >
            <div className="message-bubble">
              <p>{msg.text}</p>
            </div>
          </div>
        ))} */}

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
