import mongoose from 'mongoose';

const OptionSchema = new mongoose.Schema({
  id: { type: String, required: true },   // e.g., A, B, C...
  text: { type: String, required: true },
}, { _id: false });

const SubQuestionSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true, trim: true },
  mainCode: { type: String, required: true, index: true },
  type: { type: String, enum: ['mcq','qr','fib','photo'], required: true },
  prompt: { type: String, required: true },
  clue: { type: String, default: '' },
  score: { type: Number, default: 1 },
  timeLimitSec: { type: Number, default: 0 },
  media: [{ type: String }],
  active: { type: Boolean, default: true },

  // MCQ
  options: [OptionSchema],
  correctOptionId: { type: String },

  // QR meta (token-based or literal)
  qr: {
    clue: { type: String, default: '' },
    payloadType: { type: String, enum: ['signedToken','literal'], default: 'signedToken' },
    answerHash: { type: String, default: '' },
    tokenVersion: { type: Number, default: 1 },
    lastGeneratedAt: { type: Date },
    lastHuntId: { type: String, default: '' },
  },

  // FIB (Fill in the Blanks)
  fib: {
    answers: [{ type: String }],
    caseSensitive: { type: Boolean, default: false },
    trimInput: { type: Boolean, default: true },
    acceptPartial: { type: Boolean, default: false },
  },

  // Photo Task
  photo: {
    imageUrl: { type: String, default: '' },
    expectedKey: { type: String, default: '' },
    caseSensitive: { type: Boolean, default: false },
    trimInput: { type: Boolean, default: true },
    acceptPartial: { type: Boolean, default: false },
  },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { collection: 'subquestions', timestamps: true });

SubQuestionSchema.index({ mainCode: 1, active: 1 });

export const SubQuestion = mongoose.model('SubQuestion', SubQuestionSchema);
