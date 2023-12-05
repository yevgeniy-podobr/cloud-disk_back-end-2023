const express = require("express")
require('dotenv').config()
const mongoose = require("mongoose")
const config = require("config")
const authRouters = require('./routes/authRouters')
const fileRouters = require('./routes/fileRouters')
const resetPasswordRouters = require('./routes/resetPasswordRouters')

const corsMiddleware = require('./middleware/corsMiddleware')

const app = express()
const PORT = process.env.PORT || config.get('serverPort')

app.use(corsMiddleware)
app.use(express.json())
app.use('/api/auth', authRouters)
app.use('/api/files', fileRouters)
app.use('/api/reset-password', resetPasswordRouters)

const start = async () => {
  try {
    await mongoose.connect(process.env.DB_URL).then(() => console.log('DB connected'))

    app.listen(PORT, () => {
      console.log(`Server start on port ${PORT}`)
    })

  } catch (error) {
    console.log(error)
  }
}

start()
