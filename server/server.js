/**
 * Collaborative Whiteboard Server
 * 
 * WebSocket server using Socket.io for real-time drawing synchronization
 * Manages rooms, users, and drawing state across multiple clients
 * 
 * Features:
 * - Room-based sessions with unique codes
 * - Real-time drawing synchronization
 * - User presence tracking
 * - Drawing history persistence (in-memory)
 * - Undo functionality
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET is not set. Add it to server/.env (and to Render env vars).');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '7d';

const app = express();
const server = http.createServer(app);

const FRONTEND_URL = 'https://collaborative-whiteboard-front-end.onrender.com';

// Configure CORS for Express
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));

app.use(express.json({ limit: '50mb' })); // Increase payload limit for large drawings
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Configure Socket.io with CORS for cross-origin requests
const io = socketIo(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Reject socket connections without a valid JWT before they reach any event handler
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) return next(new Error('Invalid or expired token'));
    socket.user = { id: payload.id, username: payload.username };
    next();
  });
});

/**
 * In-memory storage for room data
 * Structure: Map<roomId, { drawingData: Array, users: Array }>
 * - drawingData: Array of all drawing actions in the room
 * - users: Array of connected user objects
 */
const rooms = new Map();

// Store user information per room (legacy, might remove)
const roomUsers = new Map();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 20 },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Drawing Schema
const drawingSchema = new mongoose.Schema({
  roomId: { type: String, required: true },
  title: { type: String, required: true },
  drawingData: { type: Array, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  thumbnail: String
});

const Drawing = mongoose.model('Drawing', drawingSchema);

function signToken(user) {
  return jwt.sign({ id: user._id.toString(), username: user.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = { id: payload.id, username: payload.username };
    next();
  });
}

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Per-connection state for decoding this socket's delta-encoded stroke points back to
  // absolute coordinates before they're persisted to room.drawingData. Fresh joiners
  // (load-drawing), undo (redraw), and Mongo save all replay that array independently
  // of any live stroke, so it must stay absolute regardless of the wire encoding.
  let lastAbsolutePoint = null; // { x, y }
  let activeStrokeId = null;
  let activeStrokeMeta = null; // { type, color, brushSize } carried forward from the stroke's keyframe

  // Join a room
  socket.on('join-room', ({ roomId }) => {
    socket.join(roomId);

    // Initialize room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        drawingData: [],
        users: []
      });
    }

    // Add user to room
    const room = rooms.get(roomId);
    const user = {
      id: socket.id,
      username: socket.user.username, // derived from the verified JWT, not client-supplied
      color: getRandomColor()
    };
    
    room.users.push(user);
    
    // Send existing drawing data to new user
    socket.emit('load-drawing', room.drawingData);
    
    // Notify all users in room about new user
    io.to(roomId).emit('user-joined', {
      user,
      users: room.users
    });

    console.log(`${user.username} joined room: ${roomId}`);
  });

  // Handle drawing events. Points arrive absolute (shapes, and a stroke's keyframes —
  // has x0/y0/x1/y1) or delta-encoded (s + dx/dy, relative to that stroke's last point).
  socket.on('draw', (data) => {
    const { roomId, s: strokeId, dx, dy, type, x0, y0, x1, y1, color, brushSize } = data;

    if (!rooms.has(roomId)) return;
    const room = rooms.get(roomId);

    let storedSegment;

    if (!strokeId) {
      // Shape tool: single-shot, always absolute
      storedSegment = { type, x0, y0, x1, y1, color, brushSize };
    } else if (dx !== undefined) {
      // Delta point within an ongoing stroke on this connection
      if (!lastAbsolutePoint || activeStrokeId !== strokeId) {
        // No known reference for this stroke - drop rather than store/broadcast a
        // point reconstructed from the wrong origin. Storage and broadcast must agree.
        return;
      }
      const nx1 = lastAbsolutePoint.x + dx;
      const ny1 = lastAbsolutePoint.y + dy;
      storedSegment = {
        type: activeStrokeMeta.type,
        x0: lastAbsolutePoint.x,
        y0: lastAbsolutePoint.y,
        x1: nx1,
        y1: ny1,
        color: activeStrokeMeta.color,
        brushSize: activeStrokeMeta.brushSize
      };
      lastAbsolutePoint = { x: nx1, y: ny1 };
    } else {
      // Keyframe: stroke start, periodic resync, or post-reconnect resume
      storedSegment = { type, x0, y0, x1, y1, color, brushSize };
      lastAbsolutePoint = { x: x1, y: y1 };
      activeStrokeId = strokeId;
      activeStrokeMeta = { type, color, brushSize };
    }

    room.drawingData.push(storedSegment);

    // Relay the original payload (still delta-encoded where applicable) to other clients.
    // userId lets receivers keep the sender's remote-cursor dot moving while they draw,
    // instead of only updating it from the separate (drawing-paused-only) cursor-move event.
    socket.to(roomId).emit('draw', { ...data, userId: socket.id });
  });

  // Handle cursor movement
  socket.on('cursor-move', (data) => {
    const { roomId, x, y } = data;
    socket.to(roomId).emit('cursor-move', {
      userId: socket.id,
      x,
      y
    });
  });

  // Handle clear canvas
  socket.on('clear-canvas', (roomId) => {
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      room.drawingData = [];
      io.to(roomId).emit('clear-canvas');
    }
  });

  // Handle undo
  socket.on('undo', (roomId) => {
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      if (room.drawingData.length > 0) {
        room.drawingData.pop();
        io.to(roomId).emit('redraw', room.drawingData);
      }
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);

    // Invalidate delta-decode state - a reconnect gets a fresh connection/closure anyway,
    // but clearing explicitly keeps the intent obvious rather than relying on that
    lastAbsolutePoint = null;
    activeStrokeId = null;
    activeStrokeMeta = null;

    // Remove user from all rooms
    rooms.forEach((room, roomId) => {
      const userIndex = room.users.findIndex(u => u.id === socket.id);
      if (userIndex !== -1) {
        const user = room.users[userIndex];
        room.users.splice(userIndex, 1);
        
        // Notify remaining users
        io.to(roomId).emit('user-left', {
          userId: socket.id,
          username: user.username,
          users: room.users
        });
        
        // Clean up empty rooms
        if (room.users.length === 0) {
          rooms.delete(roomId);
          console.log(`Room ${roomId} deleted (empty)`);
        }
      }
    });
  });
});

// Helper function to generate random colors for users
function getRandomColor() {
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', 
    '#84cc16', '#22c55e', '#10b981', '#14b8a6',
    '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
    '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    rooms: rooms.size,
    connections: io.engine.clientsCount 
  });
});

// Get room info
app.get('/room/:roomId', (req, res) => {
  const { roomId } = req.params;
  if (rooms.has(roomId)) {
    const room = rooms.get(roomId);
    res.json({
      exists: true,
      users: room.users.length,
      drawingDataCount: room.drawingData.length
    });
  } else {
    res.json({ exists: false });
  }
});

const PORT = process.env.PORT || 3001;

// Register a new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const trimmed = (username || '').trim();

    if (trimmed.length < 3 || trimmed.length > 20) {
      return res.status(400).json({ error: 'Username must be 3-20 characters' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await User.findOne({ username: trimmed });
    if (existing) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({ username: trimmed, passwordHash });
    await user.save();

    const token = signToken(user);
    res.status(201).json({ success: true, token, username: user.username });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Log in an existing user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username: (username || '').trim() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = signToken(user);
    res.json({ success: true, token, username: user.username });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save drawing endpoint
app.post('/api/drawings/save', authenticateToken, async (req, res) => {
  try {
    const { roomId, title, drawingData, thumbnail } = req.body;

    const drawing = new Drawing({
      roomId,
      title,
      drawingData,
      userId: req.user.id,
      createdBy: req.user.username,
      thumbnail
    });

    await drawing.save();

    res.json({ success: true, id: drawing._id });
  } catch (error) {
    console.error('Error saving drawing:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all drawings
app.get('/api/drawings', authenticateToken, async (req, res) => {
  try {
    const drawings = await Drawing.find().sort({ createdAt: -1 });
    res.json(drawings);
  } catch (error) {
    console.error('Error fetching drawings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single drawing
app.get('/api/drawings/:id', authenticateToken, async (req, res) => {
  try {
    const drawing = await Drawing.findById(req.params.id);
    res.json(drawing);
  } catch (error) {
    console.error('Error fetching drawing:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current room drawing data
app.get('/api/room/:roomId/data', authenticateToken, (req, res) => {
  const { roomId } = req.params;
  if (rooms.has(roomId)) {
    const room = rooms.get(roomId);
    res.json({ drawingData: room.drawingData });
  } else {
    res.json({ drawingData: [] });
  }
});

// Delete drawing endpoint
app.delete('/api/drawings/:id', authenticateToken, async (req, res) => {
  try {
    const drawing = await Drawing.findById(req.params.id);
    if (!drawing) {
      return res.status(404).json({ error: 'Drawing not found' });
    }
    if (!drawing.userId || drawing.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own drawings' });
    }

    await Drawing.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting drawing:', error);
    res.status(500).json({ error: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`🎨 Whiteboard server running on port ${PORT}`);
});

