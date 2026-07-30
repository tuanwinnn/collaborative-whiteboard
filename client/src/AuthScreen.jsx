import React from 'react';

const AuthScreen = ({ mode, form, onChange, onSubmit, onToggleMode, error, loading }) => (
  <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
      <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
        Collaborative Whiteboard
      </h1>
      <p className="text-gray-600 text-center mb-8">
        {mode === 'login' ? 'Log in to continue' : 'Create an account'}
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
          <input
            type="text"
            value={form.username}
            onChange={(e) => onChange({ ...form, username: e.target.value })}
            placeholder="Enter your username"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => onChange({ ...form, password: e.target.value })}
            placeholder="Enter your password"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-colors"
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading || !form.username.trim() || !form.password}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
        >
          {loading ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Register'}
        </button>
      </form>

      <button
        onClick={onToggleMode}
        className="w-full text-center text-sm text-indigo-600 mt-4 hover:underline"
      >
        {mode === 'login' ? "Need an account? Register" : 'Already have an account? Log in'}
      </button>
    </div>
  </div>
);

export default AuthScreen;
