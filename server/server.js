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

const app = express();
const server = http.createServer(app);

// Configure Socket.io with CORS for cross-origin requests
const io = socketIo(server, {
  cors: {
    origin: "*", // Allow all origins (restrict in production)
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

/**
 * In-memory storage for room data
 * Structure: Map<roomId, { drawingData: Array, users: Array }>
 * - drawingData: Array of all drawing actions in the room
 * - users: Array of connected user objects
 */
const rooms = new Map();

// Store user information per room (legacy, might remove)
const roomUsers = new Map();

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Join a room
  socket.on('join-room', ({ roomId, username }) => {
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
      username: username || `User ${socket.id.slice(0, 4)}`,
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

  // Handle drawing events
  socket.on('draw', (data) => {
    const { roomId, ...drawData } = data;
    
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      room.drawingData.push(drawData);
      
      // Broadcast to all other users in the room
      socket.to(roomId).emit('draw', drawData);
    }
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

server.listen(PORT, () => {
  console.log(`🎨 Whiteboard server running on port ${PORT}`);
});

