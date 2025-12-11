import express from 'express';
import { MainQuestion } from '../models/MainQuestion.js';
import { SubQuestion } from '../models/SubQuestion.js';

const router = express.Router();

function requireAdmin(req, res, next) {
  if (req.method === 'OPTIONS') return next();
  const configured = process.env.ADMIN_TOKEN;
  const provided = req.headers['x-admin-token'];
  if (configured && provided !== configured) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

router.use(requireAdmin);

// ---- Main questions ----
router.get('/main', async (_req, res) => {
  const mains = await MainQuestion.find().sort({ code: 1 }).lean();
  res.json(mains);
});

router.post('/main', async (req, res) => {
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

    const saved = await MainQuestion.findOneAndUpdate(
      { code: payload.code },
      { $set: payload },
      { upsert: true, new: true, runValidators: true }
    );

    res.json(saved);
  } catch (err) {
    console.error('Admin main save error:', err);
    res.status(500).json({ error: 'Failed to save main question' });
  }
});

router.delete('/main/:code', async (req, res) => {
  const result = await MainQuestion.deleteOne({ code: req.params.code });
  res.json({ deleted: result.deletedCount });
});

// ---- Sub questions ----
function parseOptions(optionsInput) {
  if (!optionsInput) return [];
  if (Array.isArray(optionsInput)) {
    return optionsInput
      .map((o, idx) => {
        if (!o) return null;
        const id = String(o.id || String.fromCharCode(65 + idx)).trim();
        const text = String(o.text || '').trim();
        if (!id || !text) return null;
        return { id, text };
      })
      .filter(Boolean);
  }
  // allow string with lines "A|Answer"
  return String(optionsInput)
    .split('\n')
    .map(line => {
      const [idRaw, ...rest] = line.split('|');
      const id = (idRaw || '').trim();
      const text = (rest.join('|') || '').trim();
      if (!id || !text) return null;
      return { id, text };
    })
    .filter(Boolean);
}

function parseAnswers(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input.map(a => String(a).trim()).filter(Boolean);
  return String(input)
    .split(',')
    .map(a => a.trim())
    .filter(Boolean);
}

router.get('/sub', async (req, res) => {
  const filter = {};
  if (req.query.mainCode) filter.mainCode = req.query.mainCode;
  const subs = await SubQuestion.find(filter).sort({ code: 1 }).lean();
  res.json(subs);
});

router.post('/sub', async (req, res) => {
  try {
    const {
      code,
      mainCode,
      type,
      prompt,
      clue = '',
      score = 1,
      timeLimitSec = 0,
      options,
      correctOptionId,
      fibAnswers,
      fibCaseSensitive = false,
      fibTrimInput = true,
      fibAcceptPartial = false,
      qrClue = '',
      qrAnswer = '',
      photoImageUrl = '',
      photoExpectedKey = '',
      photoCaseSensitive = false,
      photoTrimInput = true,
      photoAcceptPartial = false,
      active = true
    } = req.body || {};

    if (!code || !mainCode || !type || !prompt) {
      return res.status(400).json({ error: 'code, mainCode, type, prompt are required' });
    }

    const base = {
      code: String(code).trim(),
      mainCode: String(mainCode).trim(),
      type: String(type).trim(),
      prompt: String(prompt).trim(),
      clue: String(clue || ''),
      score: Number(score) || 0,
      timeLimitSec: Number(timeLimitSec) || 0,
      active: Boolean(active)
    };

    const payload = { ...base };

    if (payload.type === 'mcq') {
      const opts = parseOptions(options);
      if (!opts.length) return res.status(400).json({ error: 'MCQ options are required' });
      const correctId = String(correctOptionId || '').trim();
      if (!correctId || !opts.some(o => o.id === correctId)) {
        return res.status(400).json({ error: 'correctOptionId must match one of the options' });
      }
      payload.options = opts;
      payload.correctOptionId = correctId;
    }

    if (payload.type === 'fib') {
      const answers = parseAnswers(fibAnswers);
      if (!answers.length) return res.status(400).json({ error: 'At least one FIB answer is required' });
      payload.fib = {
        answers,
        caseSensitive: Boolean(fibCaseSensitive),
        trimInput: Boolean(fibTrimInput),
        acceptPartial: Boolean(fibAcceptPartial)
      };
    }

    if (payload.type === 'qr') {
      payload.qr = {
        clue: String(qrClue || ''),
        payloadType: 'literal',
        answerHash: String(qrAnswer || '').trim(),
        tokenVersion: 1,
        lastGeneratedAt: new Date()
      };
    }

    if (payload.type === 'photo') {
      payload.photo = {
        imageUrl: String(photoImageUrl || ''),
        expectedKey: String(photoExpectedKey || ''),
        caseSensitive: Boolean(photoCaseSensitive),
        trimInput: Boolean(photoTrimInput),
        acceptPartial: Boolean(photoAcceptPartial)
      };
    }

    const saved = await SubQuestion.findOneAndUpdate(
      { code: payload.code },
      { $set: payload },
      { upsert: true, new: true, runValidators: true }
    );

    res.json(saved);
  } catch (err) {
    console.error('Admin sub save error:', err);
    res.status(500).json({ error: 'Failed to save sub question' });
  }
});

router.delete('/sub/:code', async (req, res) => {
  const result = await SubQuestion.deleteOne({ code: req.params.code });
  res.json({ deleted: result.deletedCount });
});

export default router;
