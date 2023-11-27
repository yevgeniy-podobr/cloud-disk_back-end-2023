const express = require("express")
require('dotenv').config()
const mongoose = require("mongoose")
const config = require("config")
const authRouter = require('./routes/auth.routers')
const fileRouter = require('./routes/file.routers')
const resetPasswordRouter = require('./routes/reset-password.router')

const corsMiddleware = require('./middleware/cors.middleware')

const app = express()
const PORT = process.env.PORT || config.get('serverPort')

app.use(corsMiddleware)
app.use(express.json())
app.use('/api/auth', authRouter)
app.use('/api/files', fileRouter)
app.use('/api/reset-password', resetPasswordRouter)

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
