const Router = require('express')
require('dotenv').config()
const router = new Router()
const authMiddleware = require('../middleware/authMiddleware')
const fileController = require('../controllers/fileController')
const multer = require("multer")
const { GridFsStorage } = require("multer-gridfs-storage")
const uuid = require("uuid").v4

const storage = new GridFsStorage({
  url: process.env.DB_URL,
  file: (req, file) => {
    if (req.originalUrl.includes('/avatar') && (file.mimetype === "image/jpeg" || file.mimetype === "image/png")) {
      return {
        bucketName: "avatars_bucket",
        filename: `${uuid()}_${file.originalname}`,
      }
    } else {
      return {
        bucketName: "files_bucket",
        filename: `${uuid()}_${file.originalname}`,
      }
    }
  },
})

const upload = multer({ storage })

router.post('', authMiddleware, fileController.createFile)
router.get('', authMiddleware, fileController.getFiles)
router.post('/upload', authMiddleware, upload.single("file"), fileController.uploadFile)
router.get('/download', authMiddleware, fileController.downloadFile)
router.delete('/', authMiddleware, fileController.deleteFile)
router.get('/search', authMiddleware, fileController.searchFile)
router.post('/rename', authMiddleware, fileController.renameFile)
router.post('/avatar', authMiddleware, upload.single("avatar"), fileController.uploadAvatar)
router.delete('/avatar', authMiddleware, fileController.deleteAvatar)
router.get('/avatar/:filename', fileController.getAvatar)

module.exports = router;