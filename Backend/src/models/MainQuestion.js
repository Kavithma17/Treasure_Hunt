import mongoose from 'mongoose';

const MainQuestionSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true, trim: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  clue: { type: String, default: '' },
  compulsory: { type: Boolean, default: false },
  tags: [{ type: String }],
  active: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  qrAssignment: {
    huntId: { type: String, default: '' },
    tokenCode: { type: String, default: '' },
    decoyCodes: [{ type: String }],
    assignedAt: { type: Date }
  }
}, { collection: 'mainquestions', timestamps: true });

MainQuestionSchema.index({ active: 1 });

export const MainQuestion = mongoose.model('MainQuestion', MainQuestionSchema);
