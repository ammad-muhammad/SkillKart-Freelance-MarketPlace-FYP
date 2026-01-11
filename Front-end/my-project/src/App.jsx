import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import TodoApplication from './Components/TodoApplication/TodoApplication'

function App() {
  const [count, setCount] = useState(0)

  return (
  <>
  <TodoApplication />
   
  </>
  )
}

export default App
