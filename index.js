const express = require("express")
require('dotenv').config()
const mongoose = require("mongoose")
const config = require("config")
const fileUpload = require("express-fileupload")
const authRouter = require('./routes/auth-routers')
const fileRouter = require('./routes/file.routers')

const corsMiddleware = require('./middleware/cors.middleware')
const filePathMiddleware = require('./middleware/filePath.middleware')
const path = require("path")

const app = express()
const PORT = process.env.PORT || config.get('serverPort')

app.use(fileUpload({}))
app.use(corsMiddleware)
app.use(filePathMiddleware(path.resolve(__dirname, 'files')))
app.use(express.json())
app.use(express.static('static'))
app.use('/api/auth', authRouter)
app.use('/api/files', fileRouter)

const start = async () => {
  try {
    await mongoose.connect(process.env.DB_URL)
    app.listen(PORT, () => {
      console.log(`Server start on port ${PORT}`)
    })
  } catch (error) {
    console.log(error)
  }
}

start()
