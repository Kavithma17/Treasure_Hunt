import React, { useState } from "react";
import "./FillBlankQuestion.css"; // Use same styles as FillBlank for consistency

export default function PhotoQuestion({ question, sessionId, onAnswerResult }) {
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isCorrect, setIsCorrect] = useState(false);

  const photoCfg = question.photo || {};
  const imageUrl = photoCfg.imageUrl || "";

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

      if (onAnswerResult && correct) {
        onAnswerResult(question._id, correct, "photo", true);
      }
    } catch (err) {
      console.error(err);
      setFeedback("error");
    }
  };

  return (
    <div className="fillblank-container">
      {imageUrl && (
        <img src={imageUrl} alt="Task" style={{ maxWidth: "100%", borderRadius: 8, marginBottom: 12 }} />
      )}

      <h3 className="fillblank-question">{question.question}</h3>

      <input
        type="text"
        placeholder="Type your answer..."
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submitAnswer()}
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
