import mongoose from 'mongoose';

const PlayerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    // unique enforced here; no need to declare index again below
    nameLower: { type: String, required: true, unique: true },
    key: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now }
  },
  { collection: 'players' }
);

// Ensure lowercase name is always set
PlayerSchema.pre('validate', function(next) {
  if (this.name) {
    this.nameLower = this.name.trim().toLowerCase();
  }
  next();
});

// Removed duplicate manual indexes; unique constraints handled via field definitions.

export const Player = mongoose.model('Player', PlayerSchema);
