# ZYSCOPE 🌍🎮

ZYSCOPE is a full-stack web app with a retro-style platformer mini-game called **“ZAIN’S TRAVEL HOP”**. Explore countries, track visits, write reviews, and play a Scottish-themed adventure game. Built with **React, Vite, Express, SQLite, and Phaser 3**.

---

## Features

- **Backend:** Express API + SQLite database for users, visits, reviews  
- **Frontend:** React 18 + React Router, responsive, persistent state, audio system  
- **Mini Game:** 10 themed levels, Scottish hero, power-ups, collectibles, enemies, parallax backgrounds  
- **Pages:** Landing, Login, Dashboard, Compare, Explore, City, Reviews, Leaderboard, Profile, Help, Mini Game  

---

## Setup

1. **Clone repo:**  
```bash
git clone https://github.com/ZainMohammed15/ZYSCOPE.git
cd ZYSCOPE
```

2. **Install dependencies:**  
```bash
npm install
```

3. **Create `.env`** (example):  
```env
NODE_ENV=development
PORT=3000
DATABASE_PATH=./zyscope.sqlite
CORS_ORIGIN=http://localhost:5173
```

---

## Run Locally

- **Backend:** `node server.js`  
- **Frontend:** `npm run dev` → [http://localhost:5173](http://localhost:5173)

---

## Deployment (Live)

- Backend: Railway  
- Frontend: Vercel  
- Update `src/utils/api.js` with Railway backend URL before deploying frontend

---

## Mini-Game Controls

- Move: Arrow keys  
- Jump: Space  
- Collect power-ups (Wing, Spring)  
- Goal: reach the Scottish flag to finish each level  

---

## License

Open source. Feel free to fork and share with attribution.

