# 🎨 Real-Time Collaborative Whiteboard

A real-time collaborative drawing application where multiple users can draw together on the same canvas simultaneously using WebSockets.

![Status](https://img.shields.io/badge/Status-Active-success)
![React](https://img.shields.io/badge/React-19-blue)
![Node.js](https://img.shields.io/badge/Node.js-16+-green)
![Socket.io](https://img.shields.io/badge/Socket.io-4.6-black)

## 🌐 Live Demo

**[View Live Application →](#)** *(Add your deployed URL here)*

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
- **User Presence** - See who's online in your room
- **Live Synchronization** - Changes appear instantly across all clients
- **User Cursors** - Track other users' movements in real-time

### 💾 Canvas Management
- **Undo** - Remove the last drawing action (affects all users)
- **Clear Canvas** - Start fresh (synced across all users)
- **Download** - Export your artwork as PNG
- **Persistent Rooms** - Drawings saved until all users leave

### 🎨 User Experience
- **Modern Dark UI** - Sleek interface with gradient backgrounds
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Smooth Animations** - Fluid drawing experience
- **Color-Coded Tools** - Visual feedback for selected tools

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
- In-memory storage

## 📁 Project Structure

```
collaborative-whiteboard/
├── client/                 # React frontend
│   ├── src/
│   │   ├── App.js         # Main app component
│   │   ├── Whiteboard.jsx # Canvas & drawing logic
│   │   └── index.css      # Tailwind styles
│   └── package.json
├── server/                 # Node.js backend
│   ├── server.js          # WebSocket server
│   └── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ installed
- npm or yarn

### Installation

**1. Clone the repository:**
```bash
git clone https://github.com/yourusername/collaborative-whiteboard.git
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

1. Open multiple browser windows
2. Join the **same room code** in each window
3. Draw in one window → See it appear in real-time in all other windows! ✨

## 📖 How to Use

### Creating/Joining a Room

1. Enter your display name
2. Enter a room code (create a new one or use an existing)
3. Click "Join Room"

### Drawing

1. **Select a Tool** - Click on Pen, Eraser, Line, Rectangle, or Circle
2. **Choose a Color** - Click any color from the palette
3. **Adjust Brush Size** - Use the slider (1-50px)
4. **Draw** - Click and drag on the canvas

### Collaboration

- **Real-time Sync** - All users see changes instantly
- **User List** - See who's in the room on the sidebar
- **Persistent Canvas** - Drawing saved until everyone leaves

### Canvas Actions

- **Undo** - Removes the last drawing action for all users
- **Clear All** - Erases everything (affects all users)
- **Download** - Saves the canvas as a PNG image to your device

## 🎯 Technical Highlights

### Real-Time Communication
- **WebSocket Protocol** - Bi-directional, low-latency communication
- **Socket.io** - Automatic reconnection, fallbacks, room management
- **Event-Driven Architecture** - Efficient message passing between clients

### State Management
- **In-Memory Storage** - Fast access to drawing data per room
- **Per-Room Isolation** - Each room has separate canvas state
- **Automatic Cleanup** - Empty rooms deleted to free memory

### Canvas Rendering
- **HTML5 Canvas API** - High-performance drawing
- **Smooth Line Rendering** - Using moveTo/lineTo for fluid strokes
- **Composite Operations** - Eraser uses destination-out blending mode

## 🌐 Deployment

### Deploy Backend (Render/Railway)

**Using Render:**
1. Push code to GitHub
2. Go to [render.com](https://render.com)
3. Create new Web Service
4. Connect your repository
5. Set start command: `node server/server.js`
6. Deploy!

### Deploy Frontend (Vercel/Netlify)

**Update Socket URL in `client/src/Whiteboard.jsx`:**
```javascript
const SOCKET_URL = 'https://your-backend-url.onrender.com';
```

**Using Vercel:**
```bash
cd client
npm run build
npx vercel --prod
```

## 🔧 Configuration

### Server Port
Default: `3001` (change in `server/server.js`)

### CORS Settings
Update in `server/server.js`:
```javascript
cors: {
  origin: "your-frontend-url.com",
  methods: ["GET", "POST"]
}
```

## 🐛 Troubleshooting

**Canvas not appearing?**
- Ensure server is running on port 3001
- Check browser console for errors
- Verify Socket.io connection

**Drawing not syncing?**
- Ensure both users are in the same room
- Check that server is running
- Look for connection errors in console

**"Cannot connect to server"?**
- Verify server is running: `node server.js`
- Check if port 3001 is available
- Try restarting both server and client

## 🚀 Future Enhancements

- [ ] Text tool for adding labels
- [ ] Fill tool for shapes
- [ ] Layers support
- [ ] Redo functionality
- [ ] Drawing history playback
- [ ] Export as SVG
- [ ] Copy/paste selections
- [ ] Keyboard shortcuts
- [ ] Touch device optimization
- [ ] User authentication
- [ ] Save drawings to database
- [ ] Drawing templates

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
- Lucide for the beautiful icons
- Tailwind CSS for rapid UI development

---

**Built with ❤️ and 🎨 for collaborative creativity**

*Bringing people together through real-time drawing since 2025*