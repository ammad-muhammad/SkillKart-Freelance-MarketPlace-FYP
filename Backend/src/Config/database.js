const mongoose = require('mongoose');

const uri = 'mongodb+srv://officialmuhammadammad:y0hKZnUmH8SefjPf@clustrer0.9whiqxj.mongodb.net/TodoApp';

async function connectDB(){
    await mongoose.connect(uri);
    console.log('Database connected successfully');
}


module.exports ={
    connectDB
}