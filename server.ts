import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Database from 'better-sqlite3';

const PORT = 3000;

const db = new Database('aqbohub.db');

// Setup DB
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    username TEXT,
    password TEXT,
    role TEXT DEFAULT 'student',
    rating REAL DEFAULT 0,
    coins INTEGER DEFAULT 250,
    isPro INTEGER DEFAULT 0,
    bio TEXT,
    class TEXT,
    strongSubjects TEXT,
    weakSubjects TEXT,
    subjectPercentages TEXT,
    onboarded INTEGER DEFAULT 0,
    iin TEXT
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    subject TEXT,
    authorId TEXT,
    tutorId TEXT,
    status TEXT DEFAULT 'open',
    coins INTEGER DEFAULT 0,
    createdAt INTEGER
  );

  CREATE TABLE IF NOT EXISTS slots (
    id TEXT PRIMARY KEY,
    userId TEXT,
    day TEXT,
    time TEXT,
    isAvailable INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    senderId TEXT,
    receiverId TEXT,
    text TEXT,
    createdAt INTEGER,
    status TEXT DEFAULT 'sent'
  );

  CREATE TABLE IF NOT EXISTS modules (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    content TEXT,
    subject TEXT,
    authorId TEXT,
    likes INTEGER DEFAULT 0,
    createdAt INTEGER
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    tutorId TEXT,
    authorId TEXT,
    authorName TEXT,
    rating INTEGER,
    text TEXT,
    createdAt INTEGER
  );
`);

try {
  db.exec('ALTER TABLE tasks ADD COLUMN subject TEXT;');
} catch (e) {
  // Column might already exist
}

try {
  db.exec('ALTER TABLE tasks ADD COLUMN dueDate TEXT;');
} catch (e) {
  // Column might already exist
}

try {
  db.exec('ALTER TABLE messages ADD COLUMN status TEXT DEFAULT "sent";');
} catch (e) {
  // Column might already exist
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*' }
  });

  app.use(express.json());

  // Helper to parse JSON fields from DB
  const parseUser = (user: any) => {
    if (!user) return user;
    
    const safeParse = (str: any, fallback: any) => {
      if (!str) return fallback;
      try {
        return JSON.parse(str);
      } catch (e) {
        console.error('Failed to parse JSON for user field:', str);
        return fallback;
      }
    };

    return {
      ...user,
      strongSubjects: safeParse(user.strongSubjects, []),
      weakSubjects: safeParse(user.weakSubjects, []),
      subjectPercentages: safeParse(user.subjectPercentages, {}),
      isPro: user.isPro === 1,
      onboarded: user.onboarded === 1
    };
  };

  // API Routes
  app.post('/api/auth/register', async (req, res) => {
    const { id, email, username, password, role, iin } = req.body;
    try {
      if (iin) {
        const { checkIIN } = await import('./src/services/gemini');
        const isValid = await checkIIN(iin);
        if (!isValid) {
          return res.status(400).json({ error: 'Invalid IIN' });
        }
      }

      const stmt = db.prepare('INSERT INTO users (id, email, username, password, role, iin, coins) VALUES (?, ?, ?, ?, ?, ?, 250)');
      stmt.run(id, email, username, password, role || 'student', iin || null);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post('/api/auth/login', (req, res) => {
    const { id, email, password } = req.body;
    let user = null;
    
    if (id) {
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    }
    
    if (!user && email) {
      // Fallback for old users or when Firebase is not configured
      user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      
      // If we found a user by email but didn't use Firebase ID, verify password
      if (user && !id && password && user.password !== password) {
        return res.status(401).json({ error: 'Invalid password' });
      }
    }
    
    if (user) {
      res.json({ success: true, user: parseUser(user) });
    } else {
      res.status(401).json({ error: 'User not found or invalid credentials' });
    }
  });

  app.post('/api/users/:id/onboard', (req, res) => {
    const { id } = req.params;
    const { class: userClass, strongSubjects, weakSubjects, subjectPercentages, bio, rating } = req.body;
    db.prepare(`
      UPDATE users 
      SET class = ?, strongSubjects = ?, weakSubjects = ?, subjectPercentages = ?, bio = ?, rating = ?, onboarded = 1
      WHERE id = ?
    `).run(
      userClass ?? null, 
      strongSubjects ? JSON.stringify(strongSubjects) : null, 
      weakSubjects ? JSON.stringify(weakSubjects) : null, 
      subjectPercentages ? JSON.stringify(subjectPercentages) : null, 
      bio ?? null, 
      rating ?? null, 
      id
    );
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    res.json({ success: true, user: parseUser(user) });
  });

  app.post('/api/users/:id/profile', (req, res) => {
    const { id } = req.params;
    const { bio, strongSubjects, weakSubjects } = req.body;
    db.prepare(`
      UPDATE users 
      SET bio = ?, strongSubjects = ?, weakSubjects = ?
      WHERE id = ?
    `).run(
      bio ?? null, 
      strongSubjects ? JSON.stringify(strongSubjects) : null, 
      weakSubjects ? JSON.stringify(weakSubjects) : null, 
      id
    );
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    res.json({ success: true, user: parseUser(user) });
  });

  app.get('/api/users', (req, res) => {
    const users = db.prepare('SELECT * FROM users').all();
    res.json(users.map(parseUser));
  });

  app.get('/api/users/:id', (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    res.json(parseUser(user));
  });

  app.get('/api/users/:id/reviews', (req, res) => {
    const reviews = db.prepare('SELECT * FROM reviews WHERE tutorId = ? ORDER BY createdAt DESC').all(req.params.id);
    res.json(reviews);
  });

  app.post('/api/users/:id/coins', (req, res) => {
    const { amount } = req.body;
    db.prepare('UPDATE users SET coins = coins + ? WHERE id = ?').run(amount ?? 0, req.params.id);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    res.json({ success: true, user: parseUser(user) });
  });

  app.post('/api/users/:id/pro', (req, res) => {
    db.prepare('UPDATE users SET isPro = 1 WHERE id = ?').run(req.params.id);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    res.json({ success: true, user: parseUser(user) });
  });

  app.get('/api/tasks', (req, res) => {
    const tasks = db.prepare('SELECT * FROM tasks').all();
    res.json(tasks);
  });

  app.post('/api/tasks', (req, res) => {
    const { id, title, description, subject, authorId, coins, dueDate } = req.body;
    
    // Check if user has enough coins
    const user = db.prepare('SELECT coins FROM users WHERE id = ?').get(authorId) as any;
    if (!user || user.coins < coins) {
      return res.status(400).json({ error: 'Not enough coins' });
    }

    // Deduct coins
    db.prepare('UPDATE users SET coins = coins - ? WHERE id = ?').run(coins ?? 0, authorId);

    // Create task
    db.prepare('INSERT INTO tasks (id, title, description, subject, authorId, coins, dueDate, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, title ?? null, description ?? null, subject ?? null, authorId, coins ?? 0, dueDate ?? null, Date.now());
      
    // Notify users interested in this subject
    const allUsers = db.prepare('SELECT * FROM users WHERE id != ?').all(authorId);
    allUsers.forEach((u: any) => {
      const parsed = parseUser(u);
      if (parsed.strongSubjects?.includes(subject) || parsed.weakSubjects?.includes(subject)) {
        io.to(parsed.id).emit('pushNotification', `Новая задача по предмету ${subject}: ${title}`);
      }
    });

    // Return updated user
    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(authorId);
    res.json({ success: true, user: parseUser(updatedUser) });
  });

  app.post('/api/tasks/:id/take', (req, res) => {
    const { tutorId } = req.body;
    db.prepare('UPDATE tasks SET tutorId = ?, status = "in_progress" WHERE id = ?').run(tutorId, req.params.id);
    res.json({ success: true });
  });

  app.post('/api/tasks/:id/complete', (req, res) => {
    const { ratingIncrease, tutorId, review } = req.body;
    db.prepare('UPDATE tasks SET status = "completed" WHERE id = ?').run(req.params.id);
    db.prepare('UPDATE users SET rating = MIN(rating + ?, 5.0) WHERE id = ?').run(ratingIncrease ?? 0, tutorId);
    
    if (review) {
      db.prepare('INSERT INTO reviews (id, tutorId, authorId, authorName, rating, text, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(Math.random().toString(36).substring(7), tutorId, review.authorId ?? null, review.authorName ?? null, review.rating ?? 5, review.text ?? null, Date.now());
    }
    
    res.json({ success: true });
  });

  app.delete('/api/tasks/:id', (req, res) => {
    db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.get('/api/modules', (req, res) => {
    const modules = db.prepare('SELECT * FROM modules ORDER BY createdAt DESC').all();
    res.json(modules);
  });

  app.post('/api/modules', (req, res) => {
    const { id, title, description, content, subject, authorId } = req.body;
    db.prepare('INSERT INTO modules (id, title, description, content, subject, authorId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, title ?? null, description ?? null, content ?? null, subject ?? null, authorId, Date.now());
    
    // Reward author with 50 coins for creating a module
    db.prepare('UPDATE users SET coins = coins + 50 WHERE id = ?').run(authorId);
    
    // Notify users interested in this subject
    const allUsers = db.prepare('SELECT * FROM users WHERE id != ?').all(authorId);
    allUsers.forEach((u: any) => {
      const parsed = parseUser(u);
      if (parsed.strongSubjects?.includes(subject) || parsed.weakSubjects?.includes(subject)) {
        io.to(parsed.id).emit('pushNotification', `Новый модуль по предмету ${subject}: ${title}. Изучите его в разделе "Модули знаний"!`);
      }
    });

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(authorId);
    res.json({ success: true, user: parseUser(updatedUser) });
  });

  app.post('/api/modules/:id/like', (req, res) => {
    db.prepare('UPDATE modules SET likes = likes + 1 WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.get('/api/slots', (req, res) => {
    const slots = db.prepare('SELECT * FROM slots').all();
    res.json(slots);
  });

  app.post('/api/slots', (req, res) => {
    const { id, userId, day, time, isAvailable } = req.body;
    const existing = db.prepare('SELECT * FROM slots WHERE userId = ? AND day = ? AND time = ?').get(userId, day, time);
    if (existing) {
      db.prepare('UPDATE slots SET isAvailable = ? WHERE id = ?').run(isAvailable ?? 1, (existing as any).id);
    } else {
      db.prepare('INSERT INTO slots (id, userId, day, time, isAvailable) VALUES (?, ?, ?, ?, ?)')
        .run(id, userId, day, time, isAvailable ?? 1);
    }
    res.json({ success: true });
  });

  app.get('/api/messages/:userId/:otherId', (req, res) => {
    const { userId, otherId } = req.params;
    const messages = db.prepare('SELECT * FROM messages WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?) ORDER BY createdAt ASC')
      .all(userId, otherId, otherId, userId);
    res.json(messages);
  });

  app.post('/api/gemini/chat', async (req, res) => {
    const { message, history } = req.body;
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
      const chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction: 'You are an AI Assistant for AqboHub, a knowledge economy platform for Aqbobek Lyceum. Help students with their studies, answer questions clearly and concisely. Be encouraging and helpful.',
        },
      });
      
      const context = history.map((h: any) => `${h.sender}: ${h.text}`).join('\n');
      const fullMessage = context ? `History:\n${context}\n\nUser: ${message}` : message;
      
      const response = await chat.sendMessage({ message: fullMessage });
      res.json({ text: response.text || 'I could not generate a response.' });
    } catch (e: any) {
      console.error('Gemini error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // Socket.io
  io.on('connection', (socket) => {
    socket.on('join', (userId) => {
      socket.join(userId);
    });

    socket.on('sendMessage', (msg) => {
      msg.status = 'sent';
      db.prepare('INSERT INTO messages (id, senderId, receiverId, text, createdAt, status) VALUES (?, ?, ?, ?, ?, ?)')
        .run(msg.id, msg.senderId, msg.receiverId, msg.text, msg.createdAt, msg.status);
      io.to(msg.receiverId).emit('newMessage', msg);
      io.to(msg.senderId).emit('newMessage', msg);
    });

    socket.on('markMessagesRead', ({ messageIds, userId, senderId }) => {
      if (!messageIds || messageIds.length === 0) return;
      const placeholders = messageIds.map(() => '?').join(',');
      db.prepare(`UPDATE messages SET status = 'read' WHERE id IN (${placeholders})`).run(...messageIds);
      io.to(senderId).emit('messagesRead', messageIds);
    });

    socket.on('classControlAlert', (data) => {
      const msg = {
        id: Math.random().toString(36).substring(7),
        senderId: 'bot',
        receiverId: data.userId,
        text: data.message,
        createdAt: Date.now()
      };
      db.prepare('INSERT INTO messages (id, senderId, receiverId, text, createdAt) VALUES (?, ?, ?, ?, ?)')
        .run(msg.id, msg.senderId, msg.receiverId, msg.text, msg.createdAt);
      io.to(data.userId).emit('newMessage', msg);
      io.to(data.userId).emit('pushNotification', data.message);
    });
  });

  // Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
