const Router = require('express')
require('dotenv').config()
const router = new Router()
const authMiddleware = require('../middleware/auth.middleware')
const fileController = require('../controllers/fileController')
const multer = require("multer")
const { GridFsStorage } = require("multer-gridfs-storage")
const MongoClient = require("mongodb").MongoClient
const GridFSBucket = require("mongodb").GridFSBucket

const mongoClient = new MongoClient(process.env.DB_URL)

const storage = new GridFsStorage({
  url: process.env.DB_URL,
  file: (req, file) => {
    console.log(req.user, 'storage')
    if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
      return {
        bucketName: "avatars",
        filename: `${Date.now()}_${file.originalname}`,
      }
    } else {
      return `${Date.now()}_${file.originalname}`
    }
  },
})

const upload = multer({ storage })

router.post('', authMiddleware, fileController.createDir)
router.get('', authMiddleware, fileController.getFiles)
router.post('/upload', authMiddleware, fileController.uploadFile)
router.get('/download', authMiddleware, fileController.downloadFile)
router.delete('/', authMiddleware, fileController.deleteFile)
router.get('/search', authMiddleware, fileController.searchFile)
router.post('/avatar', authMiddleware, upload.single("avatar"), fileController.uploadAvatar)
router.delete('/avatar', authMiddleware, fileController.deleteAvatar)

router.get("/avatar/:filename", authMiddleware, async (req, res) => {
  try {
    await mongoClient.connect()
    console.log(req.user, 'get avatar')
    const database = mongoClient.db("test")

    const imageBucket = new GridFSBucket(database, {
      bucketName: "avatars",
    })

    let downloadStream = imageBucket.openDownloadStreamByName(
      req.params.filename
    )

    downloadStream.on("data", function (data) {
      return res.status(200).write(data)
    })

    downloadStream.on("error", function (data) {
      return res.status(404).send({ error: "Image not found" })
    })

    downloadStream.on("end", () => {
      return res.end()
    })

  } catch (error) {
    console.log(error)
    res.status(500).send({
      message: "Error Something went wrong",
      error,
    })
  }
})

module.exports = router;