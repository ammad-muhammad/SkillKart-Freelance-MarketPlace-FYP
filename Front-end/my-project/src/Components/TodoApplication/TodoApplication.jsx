import React, { useState, useEffect } from 'react';
import './TodoApplication.css';

const API_URL = 'http://localhost:3000/api/todos';

function App() {
  const [todos, setTodos] = useState([]);
  const [input, setInput] = useState('');
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    fetchTodos();
  }, []);


  const fetchTodos = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      setTodos(data);
    } catch (error) {
      console.error('Error fetching todos:', error);
      alert('Failed to fetch todos!');
    }
    setLoading(false);
  };


  const addTodo = async () => {
    if (input.trim() === '') return;

    try {
      if (editId) {
 
        const response = await fetch(`${API_URL}/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            text: input,
            completed: todos.find(t => t._id === editId)?.completed || false
          })
        });
        const updatedTodo = await response.json();
        
        setTodos(todos.map(todo => 
          todo._id === editId ? updatedTodo : todo
        ));
        setEditId(null);
      } else {
   
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: input })
        });
        const newTodo = await response.json();
        setTodos([newTodo, ...todos]);
      }
      setInput('');
    } catch (error) {
      console.error('Error adding/updating todo:', error);
      alert('Failed to save todo!');
    }
  };


  const deleteTodo = async (id) => {
    try {
      await fetch(`${API_URL}/${id}`, {
        method: 'DELETE'
      });
      setTodos(todos.filter(todo => todo._id !== id));
    } catch (error) {
      console.error('Error deleting todo:', error);
      alert('Failed to delete todo!');
    }
  };


  const editTodo = (todo) => {
    setInput(todo.text);
    setEditId(todo._id);
  };

  const toggleComplete = async (id) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'PATCH'
      });
      const updatedTodo = await response.json();
      
      setTodos(todos.map(todo =>
        todo._id === id ? updatedTodo : todo
      ));
    } catch (error) {
      console.error('Error toggling todo:', error);
      alert('Failed to update todo!');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        

        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-5xl font-bold text-white mb-2 drop-shadow-lg">
            📝 My Todo App
          </h1>
          <p className="text-white text-lg">Organize your day, the easy way!</p>
          <p className="text-white text-sm mt-2">
            {loading ? '🔄 Loading...' : '✅ Connected to Database'}
          </p>
        </div>

   
        <div className="bg-white rounded-2xl shadow-2xl p-6 mb-8 transform hover:scale-105 transition-transform duration-300">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTodo()}
              placeholder="What needs to be done?"
              className="flex-1 px-4 py-3 border-2 border-purple-300 rounded-xl focus:outline-none focus:border-purple-500 text-gray-700 text-lg"
            />
            <button
              onClick={addTodo}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-3 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transform hover:scale-105 transition-all duration-200 shadow-lg"
            >
              {editId ? '✏️ Update' : '➕ Add'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white bg-opacity-90 rounded-xl p-4 text-center shadow-lg">
            <p className="text-3xl font-bold text-purple-600">{todos.length}</p>
            <p className="text-gray-600">Total</p>
          </div>
          <div className="bg-white bg-opacity-90 rounded-xl p-4 text-center shadow-lg">
            <p className="text-3xl font-bold text-green-600">
              {todos.filter(t => t.completed).length}
            </p>
            <p className="text-gray-600">Completed</p>
          </div>
          <div className="bg-white bg-opacity-90 rounded-xl p-4 text-center shadow-lg">
            <p className="text-3xl font-bold text-orange-600">
              {todos.filter(t => !t.completed).length}
            </p>
            <p className="text-gray-600">Pending</p>
          </div>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="bg-white bg-opacity-90 rounded-xl p-12 text-center">
              <p className="text-gray-400 text-xl">⏳ Loading todos...</p>
            </div>
          ) : todos.length === 0 ? (
            <div className="bg-white bg-opacity-90 rounded-xl p-12 text-center">
              <p className="text-gray-400 text-xl">🎉 No todos yet! Add one to get started.</p>
            </div>
          ) : (
            todos.map((todo, index) => (
              <div
                key={todo._id}
                className="bg-white rounded-xl p-4 shadow-lg transform hover:scale-102 transition-all duration-200 animate-slide-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-center gap-4">
                
                  <button
                    onClick={() => toggleComplete(todo._id)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                      todo.completed
                        ? 'bg-green-500 border-green-500'
                        : 'border-gray-300 hover:border-green-500'
                    }`}
                  >
                    {todo.completed && <span className="text-white text-sm">✓</span>}
                  </button>

                  <p
                    className={`flex-1 text-lg ${
                      todo.completed
                        ? 'line-through text-gray-400'
                        : 'text-gray-700'
                    }`}
                  >
                    {todo.text}
                  </p>

                  <button
                    onClick={() => editTodo(todo)}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors duration-200"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => deleteTodo(todo._id)}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors duration-200"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default App;