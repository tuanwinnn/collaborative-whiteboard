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
import { Pencil, Eraser, Circle, Square, Minus, Download, Trash2, Undo, Users, LogOut } from 'lucide-react';
import io from 'socket.io-client';
import AuthScreen from './AuthScreen';

// WebSocket server URL - change this when deploying to production
const SOCKET_URL = 'https://collaborative-whiteboard-qg0f.onrender.com';

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
  
  // Auth state
  const [token, setToken] = useState(null);
  const [authUsername, setAuthUsername] = useState(null);
  const [authChecked, setAuthChecked] = useState(false); // avoids a login-screen flash while localStorage is checked
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Room and user state
  const [roomId, setRoomId] = useState('');
  const [joined, setJoined] = useState(false);
  const [users, setUsers] = useState([]); // List of users in current room
  
  // Real-time cursor tracking for other users
  const [remoteCursors, setRemoteCursors] = useState({});
  
  // Starting position for shape tools (line, rectangle, circle)
  const [startPos, setStartPos] = useState(null);

  const [showGallery, setShowGallery] = useState(false);
  const [savedDrawings, setSavedDrawings] = useState([]);
  const [saveTitle, setSaveTitle] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Available color palette
  const colors = [
    '#000000', '#ef4444', '#f97316', '#f59e0b', '#eab308',
    '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
    '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7'
  ];

  /**
   * Restore session from localStorage on load
   * Decodes the JWT payload locally to check expiry, avoiding an extra network round trip
   */
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUsername = localStorage.getItem('username');

    if (storedToken && storedUsername) {
      try {
        const payload = JSON.parse(atob(storedToken.split('.')[1]));
        if (payload.exp && payload.exp * 1000 > Date.now()) {
          setToken(storedToken);
          setAuthUsername(storedUsername);
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('username');
        }
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
      }
    }

    setAuthChecked(true);
  }, []);

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

    // Establish WebSocket connection, authenticated via JWT
    socketRef.current = io(SOCKET_URL, { auth: { token } });

    // Join the specified room; server derives the username from the token
    socketRef.current.emit('join-room', { roomId });

    /**
     * Connection rejected (missing/invalid/expired token)
     * Bounce back to the login screen
     */
    socketRef.current.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      alert('Your session is invalid or expired. Please log in again.');
      handleLogout();
    });

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
  }, [joined, roomId, token]);

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
   * Join a room
   * Identity comes from the authenticated account; only the room code needs validating
   */
  const joinRoom = () => {
    if (roomId.trim()) {
      setJoined(true);
    }
  };

  /**
   * Handle login/register form submission
   */
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';

    try {
      const response = await fetch(`${SOCKET_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });

      const data = await response.json();

      if (!response.ok) {
        setAuthError(data.error || 'Authentication failed');
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      setToken(data.token);
      setAuthUsername(data.username);
    } catch (error) {
      setAuthError('Network error, please try again');
    } finally {
      setAuthLoading(false);
    }
  };

  /**
   * Clear session and return to the login screen
   */
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken(null);
    setAuthUsername(null);
    setJoined(false);
  };

  /**
 * Save current drawing to MongoDB
 */
const saveDrawing = async () => {
  if (!saveTitle.trim()) {
    alert('Please enter a title for your drawing');
    return;
  }

  try {
    const canvas = canvasRef.current;
    const thumbnail = canvas.toDataURL('image/png');

    // Get current room's drawing data from server
    const roomDataResponse = await fetch(`${SOCKET_URL}/api/room/${roomId}/data`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (roomDataResponse.status === 401 || roomDataResponse.status === 403) {
      alert('Session expired, please log in again.');
      handleLogout();
      return;
    }
    if (!roomDataResponse.ok) {
      throw new Error('Failed to get room data');
    }

    const roomData = await roomDataResponse.json();

    const savePayload = {
      roomId: `saved-${Date.now()}`,
      title: saveTitle,
      drawingData: roomData.drawingData,
      thumbnail
    };

    const response = await fetch(`${SOCKET_URL}/api/drawings/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(savePayload)
    });

    if (response.status === 401 || response.status === 403) {
      alert('Session expired, please log in again.');
      handleLogout();
      return;
    }

    const data = await response.json();

    if (data.success) {
      alert('Drawing saved successfully!');
      setSaveTitle('');
      setShowSaveModal(false);
    } else {
      alert('Save failed: ' + (data.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error saving drawing:', error);
    alert('Failed to save drawing: ' + error.message);
  }
};

/**
 * Load saved drawings from MongoDB
 */
const loadDrawings = async () => {
  try {
    const response = await fetch(`${SOCKET_URL}/api/drawings`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const drawings = await response.json();
    setSavedDrawings(drawings);
    setShowGallery(true);
  } catch (error) {
    console.error('Error loading drawings:', error);
    alert('Failed to load drawings');
  }
};

/**
 * Load a specific drawing onto the canvas
 */
const loadDrawing = async (drawingId) => {
  try {
    const response = await fetch(`${SOCKET_URL}/api/drawings/${drawingId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const drawing = await response.json();

    // Clear current canvas
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Redraw loaded drawing
    drawing.drawingData.forEach(data => {
      drawOnCanvas(context, data);
    });
    
    setShowGallery(false);
    alert('Drawing loaded!');
  } catch (error) {
    console.error('Error loading drawing:', error);
    alert('Failed to load drawing');
  }
};

/**
 * Delete a saved drawing
 */
const deleteDrawing = async (drawingId, e) => {
  e.stopPropagation(); // Prevent loading the drawing when clicking delete

  if (!window.confirm('Are you sure you want to delete this drawing?')) {
    return;
  }

  try {
    const response = await fetch(`${SOCKET_URL}/api/drawings/${drawingId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.status === 403) {
      alert('You can only delete your own drawings');
      return;
    }

    if (response.ok) {
      // Refresh the gallery
      const updatedDrawings = savedDrawings.filter(d => d._id !== drawingId);
      setSavedDrawings(updatedDrawings);
      alert('Drawing deleted!');
    }
  } catch (error) {
    console.error('Error deleting drawing:', error);
    alert('Failed to delete drawing');
  }
};

  // Avoid a login-screen flash while localStorage session restore is in progress
  if (!authChecked) {
    return null;
  }

  // Require login before anything else
  if (!token) {
    return (
      <AuthScreen
        mode={authMode}
        form={authForm}
        onChange={setAuthForm}
        onSubmit={handleAuthSubmit}
        onToggleMode={() => {
          setAuthMode((m) => (m === 'login' ? 'register' : 'login'));
          setAuthError('');
        }}
        error={authError}
        loading={authLoading}
      />
    );
  }

  // Render join screen if not yet joined
  if (!joined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Collaborative Whiteboard
          </h1>
          <p className="text-gray-600 text-center mb-8">Draw together in real-time</p>

          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              Logged in as <span className="font-semibold text-gray-800">{authUsername}</span>
            </p>
            <button onClick={handleLogout} className="text-sm text-red-600 hover:underline">
              Log out
            </button>
          </div>

          <div className="space-y-4">
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
              disabled={!roomId.trim()}
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
            onClick={() => setShowSaveModal(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            Save Drawing
          </button>
          <button
            onClick={loadDrawings}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            📂 Load Drawing
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
          <button
            onClick={handleLogout}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Log Out
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
        
         {/* Save Drawing Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Save Drawing</h2>
            <input
              type="text"
              value={saveTitle}
              onChange={(e) => setSaveTitle(e.target.value)}
              placeholder="Enter drawing title..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg mb-4 text-gray-800"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={saveDrawing}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gallery Modal */}
      {showGallery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Saved Drawings</h2>
              <button
                onClick={() => setShowGallery(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            {savedDrawings.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No saved drawings yet</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                 {savedDrawings.map((drawing) => (
                  <div
                    key={drawing._id}
                    className="border-2 border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-500 transition-colors relative"
                  >
                    <div onClick={() => loadDrawing(drawing._id)}>
                      <img
                        src={drawing.thumbnail}
                        alt={drawing.title}
                        className="w-full h-48 object-cover rounded mb-3"
                      />
                      <h3 className="font-semibold text-gray-800">{drawing.title}</h3>
                      <p className="text-sm text-gray-500">By {drawing.createdBy}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(drawing.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    
                    {/* Delete Button */}
                    <button
                      onClick={(e) => deleteDrawing(drawing._id, e)}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-colors"
                      title="Delete drawing"
                    >
                      🗑️
                    </button>
                  </div>
                ))}

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CollaborativeWhiteboard;