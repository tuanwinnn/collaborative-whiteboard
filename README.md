# 🎨 Real-Time Collaborative Whiteboard

A real-time collaborative drawing application where multiple users can draw together on the same canvas simultaneously using WebSockets.

![Status](https://img.shields.io/badge/Status-Live-success)
![React](https://img.shields.io/badge/React-19-blue)
![Node.js](https://img.shields.io/badge/Node.js-16+-green)
![Socket.io](https://img.shields.io/badge/Socket.io-4.6-black)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)

## 🌐 Live Demo

**[🎨 Try it Live →](https://collaborative-whiteboard-front-end.onrender.com)**

*Note: Render free tier may take 30-60 seconds to wake up on first visit*

## ✨ Features

### 🖌️ Drawing Tools
- **Pen Tool** - Freehand drawing with adjustable brush size
- **Eraser** - Remove unwanted strokes
- **Line Tool** - Draw straight lines
- **Rectangle Tool** - Create rectangles
- **Circle Tool** - Draw perfect circles
- **Color Palette** - 15 vibrant colors to choose from
- **Brush Size Control** - Adjustable from 1-50px

### 👥 Real-Time Collaboration
- **Multi-User Support** - Unlimited concurrent users per room
- **Room Codes** - Create or join private drawing sessions
- **User Presence** - See who's online in your room with color-coded avatars
- **Live Synchronization** - Changes appear instantly across all clients
- **Live Cursors** - Track other users' movements in real-time with colored cursors

### 💾 Canvas Management
- **Save Drawings** - Store your artwork to MongoDB with thumbnails
- **Load Drawings** - Browse and load previously saved drawings
- **Gallery View** - Visual preview of all saved drawings
- **Undo** - Remove the last drawing action (affects all users)
- **Clear Canvas** - Start fresh (synced across all users)
- **Download** - Export your artwork as PNG
- **Persistent Rooms** - Drawings saved until all users leave

### 🎨 User Experience
- **Modern Dark UI** - Sleek interface with gradient backgrounds
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Smooth Animations** - Fluid drawing experience
- **Color-Coded Tools** - Visual feedback for selected tools
- **Real-time User Avatars** - See who's drawing with you

## 🛠️ Tech Stack

**Frontend:**
- React 19
- Socket.io-client (WebSocket client)
- HTML5 Canvas API
- Tailwind CSS
- Lucide React (icons)

**Backend:**
- Node.js
- Express
- Socket.io (WebSocket server)
- MongoDB Atlas (database)
- Mongoose (ODM)

**Deployment:**
- Frontend: Render
- Backend: Render
- Database: MongoDB Atlas

## 📁 Project Structure

```
collaborative-whiteboard/
├── client/                 # React frontend
│   ├── src/
│   │   ├── App.js         # Main app component
│   │   ├── Whiteboard.jsx # Canvas & drawing logic (800+ lines)
│   │   └── index.css      # Tailwind styles
│   └── package.json
├── server/                 # Node.js backend
│   ├── server.js          # WebSocket server & API routes
│   └── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ installed
- npm or yarn
- MongoDB Atlas account (for save/load features)

### Installation

**1. Clone the repository:**
```bash
git clone https://github.com/tuanwinnn/collaborative-whiteboard.git
cd collaborative-whiteboard
```

**2. Install server dependencies:**
```bash
cd server
npm install
```

**3. Install client dependencies:**
```bash
cd ../client
npm install
```

**4. Configure environment variables:**

Create `server/.env`:
```env
MONGODB_URI=your_mongodb_connection_string
PORT=3001
```

### Running Locally

**Terminal 1 - Start the server:**
```bash
cd server
node server.js
```
Server runs on `http://localhost:3001`

**Terminal 2 - Start the client:**
```bash
cd client
npm start
```
Client runs on `http://localhost:3000`

**Open your browser:**
1. Go to `http://localhost:3000`
2. Enter your name and a room code
3. Click "Join Room"
4. Start drawing!

### Testing Multi-User Feature

1. Open multiple browser windows/tabs
2. Join the **same room code** in each window
3. Draw in one window → See it appear in real-time in all other windows! ✨
4. Watch the live cursors move as others draw!

## 📖 How to Use

### Creating/Joining a Room

1. Enter your display name
2. Enter a room code (create a new one or use an existing)
3. Click "Join Room"
4. Share the room code with others to collaborate!

### Drawing

1. **Select a Tool** - Click on Pen, Eraser, Line, Rectangle, or Circle
2. **Choose a Color** - Click any color from the palette
3. **Adjust Brush Size** - Use the slider (1-50px)
4. **Draw** - Click and drag on the canvas
5. **Watch others** - See their colored cursors move in real-time!

### Saving & Loading

- **Save Drawing** - Click "Save Drawing" button, enter a title
- **Load Drawing** - Click "Load Drawing" to browse gallery
- **View Thumbnails** - Preview all saved drawings
- **Delete Drawings** - Click trash icon on any saved drawing

### Collaboration Features

- **Real-time Sync** - All users see changes instantly
- **User List** - See who's in the room on the sidebar
- **Color-Coded Users** - Each user has a unique color
- **Live Cursors** - Watch where others are drawing

### Canvas Actions

- **Undo** - Removes the last drawing action for all users
- **Clear All** - Erases everything (affects all users)
- **Save Drawing** - Stores to MongoDB with thumbnail
- **Download** - Saves the canvas as a PNG image to your device

## 🎯 Technical Highlights

### Real-Time Communication
- **WebSocket Protocol** - Bi-directional, low-latency communication
- **Socket.io** - Automatic reconnection, fallbacks, room management
- **Event-Driven Architecture** - Efficient message passing between clients
- **Cursor Broadcasting** - Real-time position updates for collaborative awareness

### State Management
- **In-Memory Storage** - Fast access to drawing data per room
- **MongoDB Persistence** - Permanent storage for saved drawings
- **Per-Room Isolation** - Each room has separate canvas state
- **Automatic Cleanup** - Empty rooms deleted to free memory

### Canvas Rendering
- **HTML5 Canvas API** - High-performance drawing
- **Smooth Line Rendering** - Using moveTo/lineTo for fluid strokes
- **Composite Operations** - Eraser uses destination-out blending mode
- **Base64 Thumbnails** - Efficient preview generation

### API Endpoints

```
POST   /api/drawings/save        # Save a drawing
GET    /api/drawings             # Get all saved drawings
GET    /api/drawings/:id         # Get specific drawing
DELETE /api/drawings/:id         # Delete a drawing
GET    /api/room/:roomId/data    # Get current room data
GET    /health                   # Health check
```

## 🌐 Deployment

### Current Deployment

**Backend:** https://collaborative-whiteboard-qg0f.onrender.com  
**Frontend:** https://collaborative-whiteboard-front-end.onrender.com  
**Database:** MongoDB Atlas

### Deploy Your Own

**Backend (Render):**
1. Push code to GitHub
2. Create new Web Service on Render
3. Set Root Directory: `server`
4. Build Command: `npm install`
5. Start Command: `node server.js`
6. Add environment variable: `MONGODB_URI`
7. Deploy!

**Frontend (Render):**
1. Create new Web Service
2. Set Root Directory: `client`
3. Build Command: `npm install && npm run build`
4. Start Command: `npx serve -s build -l 3000`
5. Update `SOCKET_URL` in `Whiteboard.jsx` to your backend URL
6. Deploy!

## 🔧 Configuration

### Update Backend URL

In `client/src/Whiteboard.jsx`, line 20:
```javascript
const SOCKET_URL = 'https://your-backend-url.onrender.com';
```

### CORS Settings

In `server/server.js`:
```javascript
app.use(cors({
  origin: 'https://your-frontend-url.onrender.com',
  credentials: true
}));

const io = socketIo(server, {
  cors: {
    origin: 'https://your-frontend-url.onrender.com',
    methods: ["GET", "POST"],
    credentials: true
  }
});
```

## 🐛 Troubleshooting

**Canvas not appearing?**
- Ensure server is running and accessible
- Check browser console for errors
- Verify Socket.io connection in Network tab

**Drawing not syncing?**
- Ensure both users are in the same room code
- Check that backend is awake (Render free tier sleeps after inactivity)
- Look for connection errors in browser console

**"Cannot connect to server" / 503 errors?**
- Backend may be sleeping - wait 30-60 seconds
- Verify CORS settings match your frontend URL
- Check Render logs for backend errors

**Save/Load not working?**
- Verify MongoDB connection in backend logs
- Check that MONGODB_URI environment variable is set
- Ensure payload size isn't exceeding limits

## 🎓 Learning Outcomes

This project demonstrates:
- **WebSocket implementation** with Socket.io
- **Real-time state synchronization** across multiple clients
- **Canvas API mastery** for drawing applications
- **Full-stack deployment** on modern platforms
- **MongoDB integration** with Mongoose
- **CORS configuration** for cross-origin requests
- **Event-driven architecture** patterns
- **Room-based session management**

## 💡 Potential Extensions

*This project is feature-complete and fully functional. Below are additional features that could be added to expand its capabilities:*

Drawing Enhancements:

Text tool for adding labels and annotations
Fill tool for coloring shapes
Layers support for complex compositions
Redo functionality to complement undo

Collaboration Features:

User authentication & persistent profiles
Private rooms with password protection
In-app chat alongside drawing
Drawing permissions (view-only, edit, admin)

Export & Sharing:

Export as SVG for scalability
Share drawings via public links
Drawing templates library


## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - feel free to use it for your portfolio!

## 👨‍💻 Author

**Tuan Nguyen**
- GitHub: [@tuanwinnn](https://github.com/tuanwinnn)
- LinkedIn: [Tuan Nguyen](https://www.linkedin.com/in/tuan-nguyen-237656326/)

## 🙏 Acknowledgments

- Socket.io team for the excellent WebSocket library
- React team for the amazing framework
- MongoDB Atlas for reliable database hosting
- Render for seamless deployment
- Lucide for the beautiful icons
- Tailwind CSS for rapid UI development

---

**Built with ❤️ and 🎨 for collaborative creativity**
