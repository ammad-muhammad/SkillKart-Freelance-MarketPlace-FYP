const express = require('express');
const app = express();
const cors = require('cors');
const Todo = require('./Model/Todo');   

const { connectDB } =  require('./Config/database');


app.use(express.json());
app.use(cors());

app.get('/api/todos', async (req, res) => {
  try {
    const todos = await Todo.find().sort({ createdAt: -1 });  // Latest first
    res.json(todos);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching todos', error });
  }
});

// 2️⃣ POST - Naya Todo Add Karo
app.post('/api/todos', async (req, res) => {
  try {
    const newTodo = new Todo({
      text: req.body.text,
      completed: false
    });
    
    const savedTodo = await newTodo.save();
    res.status(201).json(savedTodo);
  } catch (error) {
    res.status(500).json({ message: 'Error adding todo', error });
  }
});

// 3️⃣ PUT - Todo Update Karo (Edit)
app.put('/api/todos/:id', async (req, res) => {
  try {
    const updatedTodo = await Todo.findByIdAndUpdate(
      req.params.id,
      {
        text: req.body.text,
        completed: req.body.completed
      },
      { new: true }  // Updated document return karega
    );
    
    if (!updatedTodo) {
      return res.status(404).json({ message: 'Todo not found' });
    }
    
    res.json(updatedTodo);
  } catch (error) {
    res.status(500).json({ message: 'Error updating todo', error });
  }
});

// 4️⃣ DELETE - Todo Delete Karo
app.delete('/api/todos/:id', async (req, res) => {
  try {
    const deletedTodo = await Todo.findByIdAndDelete(req.params.id);
    
    if (!deletedTodo) {
      return res.status(404).json({ message: 'Todo not found' });
    }
    
    res.json({ message: 'Todo deleted successfully', deletedTodo });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting todo', error });
  }
});

// 5️⃣ PATCH - Sirf Completed Status Toggle Karo
app.patch('/api/todos/:id', async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id);
    
    if (!todo) {
      return res.status(404).json({ message: 'Todo not found' });
    }
    
    todo.completed = !todo.completed;
    const updatedTodo = await todo.save();
    res.json(updatedTodo);
  } catch (error) {
    res.status(500).json({ message: 'Error toggling todo', error });
  }
});

connectDB().then(() => {
    console.log('Connected to the Database !');

    app.listen(3000, () => {
        console.log('Server is running on port 3000')
    })
}).catch((error) => {
    console.log('Database not connected', error);
});