import mongoose from 'mongoose';

const QuestionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['mcq', 'fill_blank', 'scan_qr'], required: true },
    question: { type: String, required: true },
    options: [{ type: String }], // Only used for mcq
    correctAnswer: { type: String, required: true }, // For mcq/fill_blank/scan_qr
    active: { type: Boolean, default: true }
  },
  { collection: 'questions' }
);

QuestionSchema.index({ active: 1 });

export const Question = mongoose.model('Question', QuestionSchema);
