import React, { useState } from "react";
import './MCQQuestion.css';

const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export default function MCQQuestion({ question, sessionId, onAnswerResult }) {
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const submitAnswer = async (option) => {
    if (attempted || isProcessing) return; // Only one attempt
    
    setSelected(option);
    setAttempted(true);
    setIsProcessing(true);

    if (!sessionId) return;

    try {
      const res = await fetch(`${baseUrl}/api/game/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          questionId: question._id,
          answer: option.id
        })
      });
      const data = await res.json();
      const isCorrect = data.correct;
      setFeedback(isCorrect ? "correct" : "wrong");
      
      if (!isCorrect) {
        setTimeout(() => {
          setIsProcessing(false);
          if (onAnswerResult) {
            onAnswerResult(question._id, isCorrect, 'mcq', true);
          }
        }, 5000);
      } else {
        setIsProcessing(false);
        if (onAnswerResult) {
          onAnswerResult(question._id, isCorrect, 'mcq', true);
        }
      }
    } catch (err) {
      console.error(err);
      setFeedback("wrong");
      setTimeout(() => {
        setIsProcessing(false);
        if (onAnswerResult) {
          onAnswerResult(question._id, false, 'mcq', true);
        }
      }, 2000);
    }
  };

  return (
    <div className="mcq-treasure-container">
      <h3 className="mcq-treasure-question">{question.question}</h3>
      <div className="mcq-treasure-options">
        {question.options.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => submitAnswer(opt)}
            disabled={attempted}
            className={`mcq-treasure-option-btn ${selected === opt ? 'selected' : ''}`}
          >
            <strong>{opt.id}.</strong> {opt.text}
          </button>
        ))}
      </div>

      {feedback && (
        <div className={`mcq-treasure-feedback ${feedback}`}>
          {feedback === "correct" && "Correct ✅"}
          {feedback === "wrong" && isProcessing && (
            <>
              Wrong ❌
              <div className="alternate-loading">
                Loading alternate challenge...
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
