import React, { useState } from "react";
import './QRScanQuestion.css';

const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export default function QRScanQuestion({ question, sessionId, onAnswerResult }) {
  const [code, setCode] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isCorrect, setIsCorrect] = useState(false);

  const submitAnswer = async () => {
    if (!sessionId || isCorrect) return;

    try {
      const res = await fetch(`${baseUrl}/api/game/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          questionId: question._id,
          answer: code
        })
      });
      const data = await res.json();
      const correct = data.correct;
      setIsCorrect(correct);
      setFeedback(correct ? "correct" : "wrong");
      
      // Notify parent
      if (onAnswerResult && correct) {
        onAnswerResult(question._id, correct, 'scan_qr', true);
      }
    } catch (err) {
      console.error(err);
      setFeedback("error");
    }
  };

  return (
    <div className="qrscan-container">
      <h3 className="qrscan-question">{question.question}</h3>
      
      <div className="qrscan-frame">
        <div className="qrscan-corner-tl"></div>
        <div className="qrscan-corner-tr"></div>
        <div className="qrscan-corner-bl"></div>
        <div className="qrscan-corner-br"></div>
        <div className="qrscan-scanner-line"></div>
      </div>

      <p className="qrscan-hint">Scan or enter the QR code manually</p>

      <input
        type="text"
        placeholder="Enter QR code here..."
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="qrscan-input"
        disabled={isCorrect}
      />
      
      <button
        onClick={submitAnswer}
        disabled={!code || isCorrect}
        className="qrscan-submit-btn"
      >
        {isCorrect ? "Correct ✓" : "Submit Code"}
      </button>
      
      {feedback && (
        <div className={`qrscan-feedback ${feedback}`}>
          {feedback === "correct" && "Correct ✅"}
          {feedback === "wrong" && "Wrong ❌ Try again!"}
          {feedback === "error" && "Error submitting answer ⚠️"}
        </div>
      )}
    </div>
  );
}
