Backend (MongoDB Atlas + Express)

Setup
- Copy `.env.example` to `.env` and fill `MONGODB_URI` with your Atlas connection string.
- Optionally set `MONGODB_DB` (defaults to the DB in your URI, e.g., `Treasure_Hunt`).
- Ensure `ALLOWED_ORIGINS` contains your frontend dev URL (e.g., http://localhost:5173).

MongoDB Atlas essentials
- Network Access: Allow your machine’s IP (or 0.0.0.0/0 for quick dev, remove later).
- Database Access: Create a database user (username/password) and use it in the URI.
- Connection string (Node.js SRV):
	`mongodb+srv://kavithma:<password>@<cluster>.mongodb.net/Treasure_Hunt?retryWrites=true&w=majority&appName=<appName>`

Common Errors
- Missing MONGODB_URI: Ensure you created `Backend/.env` (NOT just `.env.example`) and set `MONGODB_URI=...`.
- URI undefined: Exact same cause as above; server now exits early instead of half-starting.
- Duplicate index warnings: Removed by updating `Player` model (no duplicate manual index declarations).
- Buffering timed out: Usually connection failed (bad password / IP not whitelisted). Recheck Atlas IP allowlist and credentials.

Recommended .env example
```
PORT=4000
MONGODB_URI=mongodb+srv://kavithma:<password>@<cluster>.mongodb.net/Treasure_Hunt?retryWrites=true&w=majority&appName=TreasureHuntExpo
MONGODB_DB=Treasure_Hunt
ALLOWED_ORIGINS=http://localhost:5173
```


Install & Run
```powershell
cd e:\Treasure_Hunt\Backend
npm install
npm run dev
```

API
- `GET /api/health` → basic health.
- `POST /api/register` { name } → creates player, returns { name, key }.
- `POST /api/login` { name, key } → verifies credentials.
- `GET /api/game/start` → returns { sessionId, questions[10] } (no answers included).
- `POST /api/game/answer` { sessionId, questionId, answer } → returns { correct, done, nextQuestion?, progress }.

Notes
- Names are unique case-insensitively.
- Keys are two words (e.g., MIGHTY-MANGO) and unique globally.
- Game sessions are stored in-memory; restarting the backend clears progress.
- Answers are validated server-side; client only receives next question when correct.

Seeding Questions
```powershell
cd e:\Treasure_Hunt\Backend
npm run seed:questions
```
Only seeds if fewer than 10 questions exist.
