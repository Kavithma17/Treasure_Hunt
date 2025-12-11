import React from "react";
import MCQQuestion from "./MCQQuestion";
import FillBlankQuestion from "./FillBlankQuestion";
import QRScanQuestion from "./QRScanQuestion";
import PhotoQuestion from "./PhotoQuestion";
import "./QuestionRenderer.css";

export default function QuestionRenderer({
  question,
  sessionId,
  onAnswerResult,
  allowRetry,
}) {
  if (!question) return <div>Loading question...</div>;

  const props = { question, sessionId, onAnswerResult, allowRetry };

  let content = null;

  // Match backend types
  switch (question.type) {
    case "mcq":
      content = <MCQQuestion {...props} />;
      break;

    case "fib":
    case "fill_blank":
      content = <FillBlankQuestion {...props} />;
      break;

    case "qr":
    case "scan_qr":
      content = <QRScanQuestion {...props} />;
      break;

    case "photo":
      content = <PhotoQuestion {...props} />;
      break;

    default:
      content = (
        <div style={{ color: "red" }}>
          Unknown question type: {String(question.type)}
        </div>
      );
  }

  return <div className="question-renderer">{content}</div>;
}
