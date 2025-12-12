import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import crypto from 'crypto';

import { Player } from './models/Player.js';
import { generateTwoWordKey } from './utils/keygen.js';
import { SubQuestion } from './models/SubQuestion.js';
import { MainQuestion } from './models/MainQuestion.js';
import leaderboardRoutes from "./routes/leaderboard.js";
import adminRoutes from "./routes/admin.js";

// -------------------------
// ADMIN GUARD
// -------------------------
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

function requireAdmin(req, res, next) {
  if (!ADMIN_TOKEN) {
    console.warn('[ADMIN] ADMIN_TOKEN not configured; refusing admin requests');
    return res.status(500).json({ error: 'ADMIN_TOKEN not configured on server' });
  }

  const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  const headerKey = req.headers['x-admin-key'];
  const provided = (headerKey || bearer || '').trim();

  if (!provided || provided !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return next();
}

// -------------------------
// EXPRESS APP
// -------------------------
const app = express();
app.use(express.json());

// -------------------------
// CORS CONFIG
// -------------------------
const explicitOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const devFallbackOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://cyberzone.eng.ruh.ac.lk',
  'https://cyberzone.eng.ruh.ac.lk',
];

const allowedOrigins = [...new Set([...explicitOrigins, ...(explicitOrigins.length === 0 ? devFallbackOrigins : [])])];
console.log('[CORS] Allow list:', allowedOrigins);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn(`[CORS] Blocked origin: ${origin}`);
    return callback(new Error('Not allowed by CORS: ' + origin));
  },
  credentials: true
}));

app.options('*', cors());

// -------------------------
// LOGGER
// -------------------------
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// -------------------------
// 🔐 SECURE GAME SESSION STORE
// -------------------------
const gameSessions = new Map();
const sessionLocks = new Map(); // Prevent race conditions

// Session structure with security tracking
function createSession(questionIds, playerKey = null) {
  const sessionId = crypto.randomUUID();
  gameSessions.set(sessionId, {
    questionIds,
    currentIndex: 0,
    correctAnswers: new Set(), // Track correct answers
    attemptLog: [], // Log all attempts with timestamps
    startTime: Date.now(),
    lastActivity: Date.now(),
    playerKey,
    completed: false
  });

  console.log(`[SESSION] Created ${sessionId} with ${questionIds.length} questions`);
  return sessionId;
}

function getSession(sessionId) {
  const session = gameSessions.get(sessionId);
  if (session) {
    session.lastActivity = Date.now(); // Update activity timestamp
  }
  return session;
}

// Update session activity timestamp
function touchSession(sessionId) {
  const session = gameSessions.get(sessionId);
  if (session) {
    session.lastActivity = Date.now();
  }
}

// Clean up expired sessions (runs every 10 minutes)
setInterval(() => {
  const now = Date.now();
  const EXPIRY_TIME = 2 * 60 * 60 * 1000; // 2 hours

  let cleaned = 0;
  for (const [sessionId, session] of gameSessions.entries()) {
    if (now - session.lastActivity > EXPIRY_TIME) {
      gameSessions.delete(sessionId);
      sessionLocks.delete(sessionId);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`[SESSION] Cleaned up ${cleaned} expired sessions`);
  }
}, 10 * 60 * 1000);

// -------------------------
// HELPER FUNCTIONS
// -------------------------

// Fetch a question by index from the session's questionId list (SECURE)
async function getQuestionByIndex(sessionId, index) {
  const session = getSession(sessionId);
  if (!session) {
    console.warn(`[SECURITY] Invalid session: ${sessionId}`);
    return null;
  }

  const idx = Number(index);

  // 🔐 SECURITY: Can only access current question
  if (idx !== session.currentIndex) {
    console.warn(`[SECURITY] Attempted to access question ${idx} but current is ${session.currentIndex}`);
    return null;
  }

  if (Number.isNaN(idx) || idx < 0 || idx >= session.questionIds.length) {
    return null;
  }

  const qid = session.questionIds[idx];
  const doc = await SubQuestion.findById(qid).lean();
  if (!doc) return null;

  touchSession(sessionId);
  return toSafeQuestion(doc, idx + 1);
}

// Verify answer correctness (server-side only)
async function verifyAnswer(sessionId, questionId, questionIndex, userAnswer) {
  const session = getSession(sessionId);
  if (!session) return { valid: false, error: 'Invalid session' };

  const idx = Number(questionIndex);

  // 🔐 SECURITY: Verify it's the current question
  if (idx !== session.currentIndex) {
    console.warn(`[SECURITY] Answer attempt for wrong question index`);
    return { valid: false, error: 'Invalid question index' };
  }

  // 🔐 SECURITY: Check if already answered correctly
  if (session.correctAnswers.has(idx)) {
    console.warn(`[SECURITY] Attempted to re-answer question ${idx}`);
    return { valid: false, error: 'Question already answered correctly' };
  }

  const doc = await SubQuestion.findById(questionId).lean();
  if (!doc) return { valid: false, error: 'Question not found' };

  const isCorrect = computeCorrect(doc, userAnswer);

  // Log the attempt
  session.attemptLog.push({
    questionIndex: idx,
    questionId,
    userAnswer,
    correct: isCorrect,
    timestamp: Date.now()
  });

  // If correct, mark as complete and allow progression
  if (isCorrect) {
    session.correctAnswers.add(idx);
    session.currentIndex = idx + 1;

    // Check if game completed
    if (session.currentIndex >= session.questionIds.length) {
      session.completed = true;
      session.completionTime = Date.now() - session.startTime;
    }
  }

  touchSession(sessionId);

  return {
    valid: true,
    correct: isCorrect,
    canProgress: isCorrect,
    completed: session.completed,
    completionTime: session.completed ? session.completionTime : null
  };
}

// Compute correctness for different question types
function computeCorrect(doc, answer) {
  const normalize = s => String(s || '').trim().toLowerCase();
  const user = normalize(answer);

  if (!doc) return false;

  if (doc.type === 'photo') {
    return user === normalize(doc.photo?.expectedKey);
  }

  if (doc.type === 'mcq') {
    const opts = Array.isArray(doc.options) ? doc.options : [];
    const matched = opts.find(o => normalize(o.id) === user || normalize(o.text) === user);
    return matched ? normalize(matched.id) === normalize(doc.correctOptionId) : false;
  }

  if (doc.type === 'fib') {
    const answers = Array.isArray(doc.fib?.answers) ? doc.fib.answers : [];
    const cs = Boolean(doc.fib?.caseSensitive);
    const norm = cs ? (v => String(v || '').trim()) : normalize;
    return answers.some(a => norm(a) === norm(answer));
  }

  if (doc.type === 'qr') {
    return user === normalize(doc.qr?.answerHash);
  }

  return false;
}

// Map question types for frontend
function mapTypeForFrontend(t) {
  switch (t) {
    case 'fib':
      return 'fill_blank';
    case 'qr':
      return 'scan_qr';
    case 'mcq':
      return 'mcq';
    case 'photo':
      return 'photo';
    default:
      return t || 'mcq';
  }
}

function mapOptionsForFrontend(options) {
  if (!Array.isArray(options)) return [];
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  return options
    .map((o, idx) => {
      if (o && typeof o === 'object') {
        const id = o.id || letters[idx] || String(idx + 1);
        const text = o.text ?? '';
        return text ? { id, text } : null;
      }
      const id = letters[idx] || String(idx + 1);
      const text = typeof o === 'string' ? o : '';
      return text ? { id, text } : null;
    })
    .filter(Boolean);
}

// Convert DB question to SAFE frontend object (no answers exposed)
function toSafeQuestion(doc, indexBaseOne) {
  const safeQuestion = {
    _id: doc._id,
    mainCode: doc.mainCode,
    code: doc.code,
    type: mapTypeForFrontend(doc.type),
    question: doc.prompt,
    clue: doc.clue,
    displayId: typeof indexBaseOne === 'number' ? indexBaseOne : undefined
  };

  // Add type-specific safe data
  if (doc.type === 'mcq') {
    // Return options WITHOUT marking which is correct
    safeQuestion.options = mapOptionsForFrontend(doc.options);
  }

  if (doc.type === 'photo' && doc.photo) {
    // Return image URL but NOT the expected key
    safeQuestion.photo = {
      imageUrl: doc.photo.imageUrl
      // expectedKey is NOT sent to client
    };
  }

  // For fib and qr, don't send any answer data

  return safeQuestion;
}

// Legacy converter (keep for backward compatibility with /api/game/start)
function toFrontendQuestion(doc, indexBaseOne) {
  return {
    _id: doc._id,
    mainCode: doc.mainCode,
    code: doc.code,
    type: mapTypeForFrontend(doc.type),
    question: doc.prompt,
    options: mapOptionsForFrontend(doc.options),
    clue: doc.clue,
    photo: doc.photo,
    displayId: typeof indexBaseOne === 'number' ? indexBaseOne : undefined
  };
}

// -------------------------
// 🔐 SECURE GAME ROUTES
// -------------------------

// 🔐 NEW: Get single question by index (SECURE - Progressive reveal)
app.post('/api/game/question/:index', async (req, res) => {
  try {
    const index = parseInt(req.params.index);
    const { sessionId } = req.body || {};

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    if (isNaN(index) || index < 0) {
      return res.status(400).json({ error: 'Invalid question index' });
    }

    const question = await getQuestionByIndex(sessionId, index);

    if (!question) {
      return res.status(403).json({
        error: 'Cannot access this question',
        message: 'Complete the current question first or invalid session'
      });
    }

    const session = getSession(sessionId);
    const totalQuestions = session?.questionIds?.length || 10;

    res.json({
      question,
      sessionId,
      totalQuestions,
      currentIndex: index,
      completed: session?.correctAnswers?.size || 0
    });
  } catch (err) {
    console.error('[ERROR] Question fetch:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 🔐 NEW: Verify answer server-side (SECURE)
app.post('/api/game/verify', async (req, res) => {
  try {
    const { sessionId, questionId, questionIndex, answer } = req.body || {};

    if (!sessionId || !questionId || questionIndex === undefined || !answer) {
      return res.status(400).json({
        valid: false,
        error: 'Missing required fields'
      });
    }

    const result = await verifyAnswer(sessionId, questionId, questionIndex, answer);

    res.json(result);
  } catch (err) {
    console.error('[ERROR] Answer verification:', err);
    res.status(500).json({
      valid: false,
      error: 'Server error'
    });
  }
});

// 🔐 NEW: Resume session (SECURE)
app.post('/api/game/resume', async (req, res) => {
  try {
    const { sessionId } = req.body || {};

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    const session = getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }

    touchSession(sessionId);

    res.json({
      sessionId,
      totalQuestions: session.questionIds.length,
      currentIndex: session.currentIndex,
      completed: session.correctAnswers.size || 0,
      gameCompleted: session.completed,
      startTime: session.startTime
    });
  } catch (err) {
    console.error('[ERROR] Resume session:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 🔐 UPDATED: Get alternate question (SECURE)
app.post('/api/game/alternate/:questionId', async (req, res) => {
  try {
    const { questionId } = req.params;
    const { sessionId, questionIndex } = req.body || {};

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    const session = getSession(sessionId);
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Verify accessing current question
    if (Number(questionIndex) !== session.currentIndex) {
      return res.status(403).json({ error: 'Cannot get alternate for this question' });
    }

    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({ error: 'Invalid question ID' });
    }

    const currentQuestion = await SubQuestion.findById(questionId).lean();
    if (!currentQuestion) {
      return res.status(404).json({ error: 'Current question not found' });
    }

    // Determine target type: if MCQ, switch to FIB; otherwise keep same type
    const targetType = currentQuestion.type === 'mcq' ? 'fib' : currentQuestion.type;

    // Find alternate of target type, not already used
    const usedIds = session.questionIds.map(id => new mongoose.Types.ObjectId(id));

    const alternate = await SubQuestion.findOne({
      _id: { $nin: usedIds },
      type: targetType,
      active: true
    }).lean();

    if (!alternate) {
      // Fallback: if no FIB found, try same type (or just fail if none)
      if (targetType !== currentQuestion.type) {
        const fallback = await SubQuestion.findOne({
          _id: { $nin: usedIds },
          type: currentQuestion.type,
          active: true
        }).lean();

        if (!fallback) return res.status(404).json({ error: 'No alternate question available' });

        // Use fallback
        session.questionIds[questionIndex] = fallback._id.toString();
        touchSession(sessionId);
        const safeQuestion = toSafeQuestion(fallback, questionIndex + 1);
        return res.json({ question: safeQuestion });
      }

      return res.status(404).json({ error: 'No alternate question available' });
    }

    // Update session with new question ID
    session.questionIds[questionIndex] = alternate._id.toString();
    touchSession(sessionId);

    const safeQuestion = toSafeQuestion(alternate, questionIndex + 1);

    res.json({ question: safeQuestion });
  } catch (err) {
    console.error('[ERROR] Alternate question:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Game start (creates session with question IDs only)
app.post('/api/game/start', async (req, res) => {
  try {
    const { playerKey } = req.body || {};

    // Get active main questions
    let mains = await MainQuestion.find({ active: true })
      .select('code title description clue compulsory')
      .lean();

    mains.sort((a, b) => String(a.code).localeCompare(String(b.code)));
    mains = mains.slice(0, 10);

    const finalQuestions = [];

    // Select one random sub-question per main question
    for (const main of mains) {
      const subs = await SubQuestion.find({
        active: true,
        mainCode: main.code
      }).lean();

      if (subs.length === 0) continue;

      const chosen = subs[Math.floor(Math.random() * subs.length)];
      finalQuestions.push(chosen);
    }

    if (finalQuestions.length === 0) {
      return res.status(500).json({ error: 'No questions available' });
    }

    finalQuestions.sort((a, b) => String(a.code).localeCompare(String(b.code)));

    // Create session with question IDs only
    const questionIds = finalQuestions.map(q => q._id.toString());
    const sessionId = createSession(questionIds, playerKey);

    res.json({
      sessionId,
      totalQuestions: questionIds.length,
      message: 'Game session started. Fetch questions one at a time.'
    });
  } catch (err) {
    console.error('[ERROR] Game start:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Legacy answer submission (keep for backward compatibility)
app.post('/api/game/answer', async (req, res) => {
  try {
    const { sessionId, questionId, answer } = req.body;

    const session = getSession(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const q = await SubQuestion.findById(questionId).lean();
    if (!q) return res.status(404).json({ error: 'Question not found' });

    const correct = computeCorrect(q, answer);

    if (correct) {
      session.correctAnswers.add(session.currentIndex);
      session.currentIndex++;
    }

    touchSession(sessionId);

    const done = session.currentIndex >= session.questionIds.length;

    let nextQuestion = null;

    if (correct && !done) {
      const nextId = session.questionIds[session.currentIndex];
      const nq = await SubQuestion.findById(nextId).lean();
      nextQuestion = toFrontendQuestion(nq, session.currentIndex + 1);
    }

    return res.json({
      correct,
      done,
      nextQuestion
    });

  } catch (err) {
    console.error('[ERROR] Answer submission:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// -------------------------
// ADMIN ROUTES (unchanged)
// -------------------------

app.post('/api/admin/main-questions', requireAdmin, async (req, res) => {
  try {
    const { code, title, description = '', clue = '', compulsory = false, tags = [], active = true } = req.body || {};

    if (!code || !title) {
      return res.status(400).json({ error: 'code and title are required' });
    }

    const payload = {
      code: String(code).trim(),
      title: String(title).trim(),
      description: String(description || ''),
      clue: String(clue || ''),
      compulsory: Boolean(compulsory),
      active: Boolean(active),
      tags: Array.isArray(tags)
        ? tags.map(t => String(t).trim()).filter(Boolean)
        : String(tags || '')
          .split(',')
          .map(t => t.trim())
          .filter(Boolean)
    };

    const existing = await MainQuestion.findOne({ code: payload.code }).lean();
    if (existing) return res.status(409).json({ error: 'Main question code already exists' });

    const created = await MainQuestion.create(payload);
    return res.json({ mainQuestion: created });
  } catch (err) {
    console.error('[ERROR] Admin create main:', err);
    if (err?.code === 11000) {
      return res.status(409).json({ error: 'Duplicate code' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/admin/sub-questions', requireAdmin, async (req, res) => {
  try {
    const {
      code,
      mainCode,
      type,
      prompt,
      clue = '',
      active = true,
      options = [],
      correctOptionId,
      fibAnswers = [],
      fibCaseSensitive = false,
      fibTrimInput = true,
      fibAcceptPartial = false,
      qrAnswer = '',
      qrClue = '',
      photoExpectedKey = '',
      photoImageUrl = '',
      photoCaseSensitive = false,
      photoTrimInput = true,
      photoAcceptPartial = false,
    } = req.body || {};

    if (!code || !mainCode || !type || !prompt) {
      return res.status(400).json({ error: 'code, mainCode, type, and prompt are required' });
    }

    const cleanType = String(type).toLowerCase();
    if (!['mcq', 'qr', 'fib', 'photo'].includes(cleanType)) {
      return res.status(400).json({ error: 'Invalid type' });
    }

    const payload = {
      code: String(code).trim(),
      mainCode: String(mainCode).trim(),
      type: cleanType,
      prompt: String(prompt).trim(),
      clue: String(clue || ''),
      active: Boolean(active),
    };

    if (payload.type === 'mcq') {
      const cleanOptions = (Array.isArray(options) ? options : [])
        .map(o => ({ id: String(o.id || '').trim(), text: String(o.text || '').trim() }))
        .filter(o => o.id && o.text);

      if (cleanOptions.length < 2) {
        return res.status(400).json({ error: 'MCQ requires at least two options with id and text' });
      }

      if (!correctOptionId || !cleanOptions.some(o => o.id === correctOptionId)) {
        return res.status(400).json({ error: 'correctOptionId must match one of the options' });
      }

      payload.options = cleanOptions;
      payload.correctOptionId = String(correctOptionId).trim();
    }

    if (payload.type === 'fib') {
      const answers = (Array.isArray(fibAnswers) ? fibAnswers : String(fibAnswers || '').split(','))
        .map(a => String(a).trim())
        .filter(Boolean);

      if (answers.length === 0) {
        return res.status(400).json({ error: 'FIB requires at least one answer' });
      }

      payload.fib = {
        answers,
        caseSensitive: Boolean(fibCaseSensitive),
        trimInput: Boolean(fibTrimInput),
        acceptPartial: Boolean(fibAcceptPartial),
      };
    }

    if (payload.type === 'qr') {
      const answer = String(qrAnswer || '').trim();
      if (!answer) {
        return res.status(400).json({ error: 'QR question requires qrAnswer' });
      }

      payload.qr = {
        clue: String(qrClue || ''),
        payloadType: 'literal',
        answerHash: answer,
        tokenVersion: 1,
        lastGeneratedAt: new Date(),
      };
    }

    if (payload.type === 'photo') {
      const expectedKey = String(photoExpectedKey || '').trim();
      if (!expectedKey) {
        return res.status(400).json({ error: 'Photo question requires photoExpectedKey' });
      }

      payload.photo = {
        imageUrl: String(photoImageUrl || ''),
        expectedKey,
        caseSensitive: Boolean(photoCaseSensitive),
        trimInput: Boolean(photoTrimInput),
        acceptPartial: Boolean(photoAcceptPartial),
      };
    }

    const existing = await SubQuestion.findOne({ code: payload.code }).lean();
    if (existing) return res.status(409).json({ error: 'Sub question code already exists' });

    const created = await SubQuestion.create(payload);
    return res.json({ subQuestion: created });
  } catch (err) {
    console.error('[ERROR] Admin create sub:', err);
    if (err?.code === 11000) {
      return res.status(409).json({ error: 'Duplicate code' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// -------------------------
// PLAYER ROUTES
// -------------------------

app.post('/api/register', async (req, res) => {
  try {
    const rawName = req.body?.name;
    if (!rawName || typeof rawName !== 'string') {
      return res.status(400).json({ error: 'Name is required' });
    }

    const name = rawName.trim();
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const nameLower = name.toLowerCase();

    const existing = await Player.findOne({ nameLower }).lean();
    if (existing) {
      return res.status(409).json({ error: 'Player name already registered' });
    }

    const key = await generateTwoWordKey(async candidate => {
      const taken = await Player.exists({ key: candidate });
      return Boolean(taken);
    });

    const player = await Player.create({ name, nameLower, key });
    return res.json({ name: player.name, key: player.key });
  } catch (err) {
    console.error('[ERROR] Register:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { name, key } = req.body || {};
    if (!name || !key) {
      return res.status(400).json({ error: 'Name and key are required' });
    }

    const nameLower = String(name).trim().toLowerCase();
    const providedKey = String(key).trim();

    const player = await Player.findOne({ nameLower }).lean();
    if (!player || player.key !== providedKey) {
      return res.status(401).json({ error: 'Invalid name or key' });
    }

    return res.json({ name: player.name, key: player.key });
  } catch (err) {
    console.error('[ERROR] Login:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    time: new Date().toISOString(),
    activeSessions: gameSessions.size
  });
});

// Mount additional routes
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/admin", adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// -------------------------
// DB + START SERVER
// -------------------------
const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB || "Treasure_Hunt"
    });

    console.log("✅ MongoDB connected!");

    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (err) {
    console.error('[FATAL] Startup error:', err);
    process.exit(1);
  }
}

start();

export { app };
