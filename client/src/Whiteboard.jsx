/**
 * Collaborative Whiteboard Component
 * 
 * Real-time collaborative drawing application using WebSockets (Socket.io)
 * Supports multiple users drawing simultaneously on the same canvas
 * 
 * Features:
 * - Multiple drawing tools (pen, eraser, shapes)
 * - Real-time synchronization across all connected users
 * - Room-based sessions with unique codes
 * - Canvas export and undo functionality
 */

import React, { useEffect, useRef, useState } from 'react';
import { Pencil, Eraser, Circle, Square, Minus, Download, Trash2, Undo, Users } from 'lucide-react';
import io from 'socket.io-client';

// WebSocket server URL - change this when deploying to production
const SOCKET_URL = 'http://localhost:3001';

const CollaborativeWhiteboard = () => {
  // Canvas reference for direct DOM manipulation
  const canvasRef = useRef(null);
  
  // Socket.io reference for WebSocket connection
  const socketRef = useRef(null);
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [tool, setTool] = useState('pen'); // Current selected tool
  
  // Room and user state
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [joined, setJoined] = useState(false);
  const [users, setUsers] = useState([]); // List of users in current room
  
  // Real-time cursor tracking for other users
  const [remoteCursors, setRemoteCursors] = useState({});
  
  // Starting position for shape tools (line, rectangle, circle)
  const [startPos, setStartPos] = useState(null);

  // Available color palette
  const colors = [
    '#000000', '#ef4444', '#f97316', '#f59e0b', '#eab308',
    '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
    '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7'
  ];

  /**
   * Initialize canvas and handle window resize
   * Sets up canvas dimensions and context settings
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    // Smooth line rendering
    context.lineCap = 'round';
    context.lineJoin = 'round';

    // Set initial canvas size based on window dimensions
    canvas.width = window.innerWidth - 300; // Account for sidebar
    canvas.height = window.innerHeight - 100;

    /**
     * Handle window resize while preserving drawing
     * Creates temporary canvas to store current drawing, then redraws
     */
    const handleResize = () => {
      // Save current drawing to temporary canvas
      const tempCanvas = document.createElement('canvas');
      const tempContext = tempCanvas.getContext('2d');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      tempContext.drawImage(canvas, 0, 0);

      // Resize main canvas
      canvas.width = window.innerWidth - 300;
      canvas.height = window.innerHeight - 100;
      
      // Restore drawing from temporary canvas
      context.drawImage(tempCanvas, 0, 0);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [joined]);

  /**
   * WebSocket connection and event listeners
   * Handles real-time communication between users
   */
  useEffect(() => {
    if (!joined) return;

    // Establish WebSocket connection
    socketRef.current = io(SOCKET_URL);

    // Join the specified room with username
    socketRef.current.emit('join-room', { roomId, username });

    /**
     * Load existing drawing data when joining room
     * Server sends all previous drawing actions to sync new user
     */
    socketRef.current.on('load-drawing', (drawingData) => {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      context.clearRect(0, 0, canvas.width, canvas.height);

      // Replay all drawing actions
      drawingData.forEach(data => {
        drawOnCanvas(context, data);
      });
    });

    /**
     * Receive drawing data from other users
     * Renders their strokes on local canvas
     */
    socketRef.current.on('draw', (data) => {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      drawOnCanvas(context, data);
    });

    /**
     * Handle user join events
     * Updates user list when someone joins the room
     */
    socketRef.current.on('user-joined', ({ user, users: updatedUsers }) => {
      setUsers(updatedUsers);
    });

    /**
     * Handle user leave events
     * Updates user list and removes their cursor
     */
    socketRef.current.on('user-left', ({ userId, username: leftUsername, users: updatedUsers }) => {
      setUsers(updatedUsers);
      setRemoteCursors(prev => {
        const newCursors = { ...prev };
        delete newCursors[userId];
        return newCursors;
      });
    });

    /**
     * Track cursor movements of other users
     * Displays their cursor position in real-time
     */
    socketRef.current.on('cursor-move', ({ userId, x, y }) => {
      setRemoteCursors(prev => ({
        ...prev,
        [userId]: { x, y }
      }));
    });

    /**
     * Clear canvas event from server
     * Triggered when any user clears the canvas
     */
    socketRef.current.on('clear-canvas', () => {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      context.clearRect(0, 0, canvas.width, canvas.height);
    });

    /**
     * Redraw entire canvas from server state
     * Used for undo operations
     */
    socketRef.current.on('redraw', (drawingData) => {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      context.clearRect(0, 0, canvas.width, canvas.height);

      drawingData.forEach(data => {
        drawOnCanvas(context, data);
      });
    });

    // Cleanup: disconnect socket when component unmounts or user leaves
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [joined, roomId, username]);

  /**
   * Render drawing data on canvas
   * Handles all drawing types: pen, eraser, line, rectangle, circle
   * 
   * @param {CanvasRenderingContext2D} context - Canvas 2D context
   * @param {Object} data - Drawing data from socket event
   */
  const drawOnCanvas = (context, data) => {
    const { type, x0, y0, x1, y1, color: drawColor, brushSize: size } = data;

    context.strokeStyle = drawColor;
    context.lineWidth = size;

    // Handle pen and eraser tools
    if (type === 'pen' || type === 'eraser') {
      if (type === 'eraser') {
        // Eraser removes pixels instead of adding them
        context.globalCompositeOperation = 'destination-out';
      } else {
        // Normal drawing mode
        context.globalCompositeOperation = 'source-over';
      }

      // Draw line from previous point to current point
      context.beginPath();
      context.moveTo(x0, y0);
      context.lineTo(x1, y1);
      context.stroke();
    } 
    // Handle straight line tool
    else if (type === 'line') {
      context.globalCompositeOperation = 'source-over';
      context.beginPath();
      context.moveTo(x0, y0);
      context.lineTo(x1, y1);
      context.stroke();
    } 
    // Handle rectangle tool
    else if (type === 'rectangle') {
      context.globalCompositeOperation = 'source-over';
      context.strokeRect(x0, y0, x1 - x0, y1 - y0);
    } 
    // Handle circle tool
    else if (type === 'circle') {
      context.globalCompositeOperation = 'source-over';
      // Calculate radius from start point to end point
      const radius = Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2));
      context.beginPath();
      context.arc(x0, y0, radius, 0, 2 * Math.PI);
      context.stroke();
    }
  };

  /**
   * Handle mouse down event - start drawing
   * Records starting position for all tools
   */
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    // Convert mouse coordinates to canvas coordinates
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setStartPos({ x, y });
  };

  /**
   * Handle mouse move event - continue drawing
   * For pen/eraser: draws continuously
   * For shapes: just tracks cursor position
   */
  const draw = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Always emit cursor position for other users to see
    if (socketRef.current && !isDrawing) {
      socketRef.current.emit('cursor-move', { roomId, x, y });
    }

    if (!isDrawing) return;

    const context = canvas.getContext('2d');

    // Pen and eraser draw continuously (every mouse move)
    if (tool === 'pen' || tool === 'eraser') {
      const drawData = {
        roomId,
        type: tool,
        x0: startPos.x,
        y0: startPos.y,
        x1: x,
        y1: y,
        color,
        brushSize
      };

      // Draw locally for immediate feedback
      drawOnCanvas(context, drawData);

      // Send to server to broadcast to other users
      if (socketRef.current) {
        socketRef.current.emit('draw', drawData);
      }

      // Update start position for next segment
      setStartPos({ x, y });
    }
  };

  /**
   * Handle mouse up event - finish drawing
   * For shapes: draws the final shape from start to end point
   */
  const stopDrawing = (e) => {
    if (!isDrawing) return;

    // For shape tools, draw the final shape on mouse up
    if (tool !== 'pen' && tool !== 'eraser') {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const drawData = {
        roomId,
        type: tool,
        x0: startPos.x,
        y0: startPos.y,
        x1: x,
        y1: y,
        color,
        brushSize
      };

      drawOnCanvas(context, drawData);

      if (socketRef.current) {
        socketRef.current.emit('draw', drawData);
      }
    }

    setIsDrawing(false);
    setStartPos(null);
  };

  /**
   * Clear the entire canvas for all users
   * Emits event to server which broadcasts to all clients
   */
  const clearCanvas = () => {
    if (socketRef.current) {
      socketRef.current.emit('clear-canvas', roomId);
    }
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
  };

  /**
   * Undo last drawing action
   * Server removes last stroke and broadcasts redraw event
   */
  const undo = () => {
    if (socketRef.current) {
      socketRef.current.emit('undo', roomId);
    }
  };

  /**
   * Export canvas as PNG image
   * Downloads to user's device with timestamp
   */
  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `whiteboard-${roomId}-${Date.now()}.png`;
    link.href = url;
    link.click();
  };

  /**
   * Join a room with username
   * Validates inputs before connecting
   */
  const joinRoom = () => {
    if (roomId.trim() && username.trim()) {
      setJoined(true);
    }
  };

  // Render join screen if not yet joined
  if (!joined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Collaborative Whiteboard
          </h1>
          <p className="text-gray-600 text-center mb-8">Draw together in real-time</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-colors"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Room Code
              </label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Enter or create room code"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-colors"
              />
              <p className="text-xs text-gray-500 mt-2">
                Use the same code to join the same room
              </p>
            </div>
            
            <button
              onClick={joinRoom}
              disabled={!roomId.trim() || !username.trim()}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
            >
              Join Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex">
      {/* Sidebar */}
      <div className="w-72 bg-gray-800 p-6 flex flex-col space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">🎨 Whiteboard</h2>
          <p className="text-gray-400 text-sm">Room: <span className="text-indigo-400 font-mono">{roomId}</span></p>
        </div>

        {/* Tools */}
        <div>
          <h3 className="text-white font-semibold mb-3">Tools</h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { name: 'pen', icon: Pencil, label: 'Pen' },
              { name: 'eraser', icon: Eraser, label: 'Eraser' },
              { name: 'line', icon: Minus, label: 'Line' },
              { name: 'rectangle', icon: Square, label: 'Rectangle' },
              { name: 'circle', icon: Circle, label: 'Circle' },
            ].map(({ name, icon: Icon, label }) => (
              <button
                key={name}
                onClick={() => setTool(name)}
                className={`p-3 rounded-lg transition-all ${
                  tool === name
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                title={label}
              >
                <Icon className="w-5 h-5 mx-auto" />
              </button>
            ))}
          </div>
        </div>

        {/* Colors */}
        <div>
          <h3 className="text-white font-semibold mb-3">Colors</h3>
          <div className="grid grid-cols-5 gap-2">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-10 h-10 rounded-lg transition-transform ${
                  color === c ? 'ring-2 ring-white scale-110' : ''
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Brush Size */}
        <div>
          <h3 className="text-white font-semibold mb-3">Brush Size: {brushSize}px</h3>
          <input
            type="range"
            min="1"
            max="50"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={undo}
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <Undo className="w-4 h-4" />
            Undo
          </button>
          <button
            onClick={clearCanvas}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </button>
          <button
            onClick={downloadCanvas}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>

        {/* Users */}
        <div className="flex-1 overflow-hidden">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Online ({users.length})
          </h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-2 text-gray-300 text-sm"
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: user.color }}
                />
                {user.username}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative bg-white">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="cursor-crosshair"
        />
        
        {/* Remote Cursors */}
        {Object.entries(remoteCursors).map(([userId, pos]) => {
          // Find the user info to get their color and username
          const user = users.find(u => u.id === userId);
          const userColor = user?.color || '#ef4444';
          const userName = user?.username || 'User';
          
          console.log('Rendering cursor for:', userName, 'at', pos); // DEBUG
          
          return (
            <div
              key={userId}
              className="absolute pointer-events-none z-50"
              style={{
                left: pos.x,
                top: pos.y,
                transform: 'translate(-2px, -2px)'
              }}
            >
              {/* Cursor Icon */}
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
              >
                <path
                  d="M5 3L19 12L12 13L9 19L5 3Z"
                  fill={userColor}
                  stroke="white"
                  strokeWidth="1.5"
                />
              </svg>
              
              {/* Username Label */}
              <div
                className="absolute top-6 left-2 px-2 py-1 rounded text-xs font-medium whitespace-nowrap"
                style={{
                  backgroundColor: userColor,
                  color: 'white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
              >
                {userName}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CollaborativeWhiteboard;