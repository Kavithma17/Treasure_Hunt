import React, { useState } from "react";
import './FillBlankQuestion.css';

export default function FillBlankQuestion({ question, sessionId, onAnswerResult }) {
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isCorrect, setIsCorrect] = useState(false);

  const submitAnswer = async () => {
    if (!sessionId || isCorrect) return;

    try {
      const res = await fetch("http://localhost:4000/api/game/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          questionId: question._id,
          answer
        })
      });
      const data = await res.json();
      const correct = data.correct;
      setIsCorrect(correct);
      setFeedback(correct ? "correct" : "wrong");
      
      // Notify parent
      if (onAnswerResult && correct) {
        onAnswerResult(question._id, correct, 'fill_blank', true);
      }
    } catch (err) {
      console.error(err);
      setFeedback("error");
    }
  };

  return (
    <div className="fillblank-container">
      <h3 className="fillblank-question">{question.question}</h3>
      <input
        type="text"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Type your answer..."
        className="fillblank-input"
        disabled={isCorrect}
      />
      <button
        onClick={submitAnswer}
        disabled={!answer || isCorrect}
        className="fillblank-submit-btn"
      >
        {isCorrect ? "Correct ✓" : "Submit Answer"}
      </button>
      {feedback && (
        <div className={`fillblank-feedback ${feedback}`}>
          {feedback === "correct" && "Correct ✅"}
          {feedback === "wrong" && "Wrong ❌ Try again!"}
          {feedback === "error" && "Error submitting answer ⚠️"}
        </div>
      )}
    </div>
  );
}
