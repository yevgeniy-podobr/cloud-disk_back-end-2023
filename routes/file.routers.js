const Router = require('express')
require('dotenv').config()
const router = new Router()
const authMiddleware = require('../middleware/auth.middleware')
const fileController = require('../controllers/fileController')
const multer = require("multer")
const { GridFsStorage } = require("multer-gridfs-storage")

const storage = new GridFsStorage({
  url: process.env.DB_URL,
  file: (req, file) => {

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

module.exports = router;