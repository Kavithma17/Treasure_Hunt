import React, { useState, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";
import './QRScanQuestion.css';

const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export default function QRScanQuestion({ question, sessionId, onAnswerResult }) {
  const [code, setCode] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isCorrect, setIsCorrect] = useState(false);
  const [scanError, setScanError] = useState("");

  const submitAnswer = async (answerValue) => {
    const finalAnswer = answerValue || code;
    if (!sessionId || isCorrect || !finalAnswer) return;

    try {
      const res = await fetch(`${baseUrl}/api/game/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          questionId: question._id,
          answer: finalAnswer
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

  useEffect(() => {
    let html5QrCode;

    const startScanner = async () => {
      try {
        html5QrCode = new Html5Qrcode("reader");
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        
        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            // Success callback
            if (decodedText) {
              setCode(decodedText);
              submitAnswer(decodedText);
              html5QrCode.stop().catch(err => console.error("Failed to stop scanner", err));
            }
          },
          (errorMessage) => {
            // Error callback (scanning failure, common)
            // console.log(errorMessage); 
          }
        );
      } catch (err) {
        console.error("Error starting scanner:", err);
        setScanError("Camera access failed or not available");
      }
    };

    if (!isCorrect) {
      // Small delay to ensure DOM is ready
      setTimeout(startScanner, 100);
    }

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(err => console.error("Failed to stop scanner on cleanup", err));
        html5QrCode.clear();
      }
    };
  }, [isCorrect]);

  return (
    <div className="qrscan-container">
      <h3 className="qrscan-question">{question.question}</h3>
      
      <div className="qrscan-frame">
        {/* Scanner container */}
        <div id="reader" style={{ width: "100%", height: "100%" }}></div>

        {/* Decorative elements - Only show if not scanning or as overlay? 
            The scanner will fill the div. We can keep corners on top if z-index is handled 
            but standard reader might cover them. Let's keep them and see.
        */}
        <div className="qrscan-corner-tl"></div>
        <div className="qrscan-corner-tr"></div>
        <div className="qrscan-corner-bl"></div>
        <div className="qrscan-corner-br"></div>
        <div className="qrscan-scanner-line"></div>
      </div>

      <p className="qrscan-hint">
        {scanError ? "Camera unavailable. Enter code manually:" : "Scan or enter the QR code manually"}
      </p>

      <input
        type="text"
        placeholder="Enter QR code here..."
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="qrscan-input"
        disabled={isCorrect}
      />
      
      <button
        onClick={() => submitAnswer()}
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
