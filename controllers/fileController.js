const fileService = require('../services/fileService')
require('dotenv').config()
const fs = require('fs')
const User = require('../models/User')
const File = require('../models/File')
const MongoClient = require("mongodb").MongoClient
const GridFSBucket = require("mongodb").GridFSBucket
const mongoose = require("mongoose")

const mongoClient = new MongoClient(process.env.DB_URL)

class FileController {
  async createDir(req, res) {
    try {
      const {name, type, parent} = req.body
      const file = new File({name, type, parent, user: req.user.id})
      const parentFile = await File.findOne({_id: parent})
      if(!parentFile) {
        file.path = name
      } else {
        file.path = `${parentFile.path}/${file.name}`
        parentFile.childs.push(file._id)
        await parentFile.save()
      }
      await file.save()
      return res.json(file)

    } catch (error) {
      return res.status(400).json(error)
    }
  }

  async getFiles(req, res) {
    try {
      const {sort} = req.query
      let files = ''
      switch (sort) {
        case 'name':
          files = await File.find({ user: req.user.id, parent: req.query.parent }).sort({name: 1})
          break;
        case 'type':
          files = await File.find({ user: req.user.id, parent: req.query.parent }).sort({type: 1})
        break;
        case 'date':
          files = await File.find({ user: req.user.id, parent: req.query.parent }).sort({date: 1})
        break;
      
        default:
          files = await File.find({ user: req.user.id, parent: req.query.parent })
          break;
      }
      return res.json(files)
    } catch (error) {
      console.log(error)
      return res.status(500).json({ message: 'Can not get files'})
    }
  }

  async uploadFile(req, res) {
    try {
      const file = req.file

      const parent = await File.findOne({ user: req.user.id, _id: req.body.parent })
      const user = await User.findOne({ _id: req.user.id })

      if (user.usedSpace + file.size + file.chunkSize > user.diskSpace) {
        return res.status(400).json({ message: 'There no space on the disk'})
      }
      user.usedSpace = file.size + file.chunkSize + user.usedSpace

      let filePath = file.originalname

      if (parent) {
        filePath = parent.path + '/' + file.originalname
      }

      const dbFile = new File({
        name: file.originalname,
        type: file.contentType,
        size: file.size + file.chunkSize,
        path: filePath,
        parent: parent ? parent?._id : null,
        user: user._id,
        fileId: file.id,
      })

      await dbFile.save()
      await user.save()

      return res.json(dbFile)

    } catch (error) {
      console.log(error)
      return res.status(500).json({ message: 'Upload error'})
    }
  }

  async downloadFile(req, res) {
    try {
      const file = await File.findOne({ _id: req.query.id, user: req.user.id });
      const path = fileService.getPath(req, file)

      if(fs.existsSync(path)) {
        return res.download(path, file.name)
      }

      return res.status(400).json({ message: 'Download error'})
    } catch (error) {
      console.log(error)
      return res.status(500).json({ message: 'Download error'})
    }
  }

  async deleteFile(req, res) {
    try {
      const file = await File.findOne({ _id: req.query.id, user: req.user.id });
      if (!file) {
        return res.status(400).json({ message: 'File not found'})
      }

      if (file.type !== 'dir') {
        await mongoClient.connect()
        const database = mongoClient.db("test")
        const filesBucket = new GridFSBucket(database, {
          bucketName: "files_bucket",
        })
  
        const fileObjId = new mongoose.Types.ObjectId(file.fileId);
        await filesBucket.delete(fileObjId)
      }

      await file.deleteOne()

      return res.json({ message: "File was deleted" })
    } catch (error) {
      console.log(error)
      return res.status(400).json({ message: 'Dir is not empty'})
    }
  }

  async searchFile(req, res) {
    try {
      const searchName = req.query.search
      let files = await File.find({user: req.user.id})
      files = files.filter(file => file.name.includes(searchName))
      return res.json(files)
    } catch (error) {
      console.log(error)
      return res.status(400).json({ message: 'Search error'})
    }
  }

  async uploadAvatar(req, res) {
    try {
      const user = await User.findById(req.user.id)

      if (user.avatarId) {
        await mongoClient.connect()
        const database = mongoClient.db("test")
        const avatarsBucket = new GridFSBucket(database, {
          bucketName: "avatars_bucket",
        })

        const avatarObjId = new mongoose.Types.ObjectId(user.avatarId);
        await avatarsBucket.delete(avatarObjId)
      }

      user.avatar = req.file.filename
      user.avatarId = req.file.id

      await user.save()

      return res.json(user)
    } catch (error) {
      console.log(error)
      return res.status(400).json({ message: 'Upload avatar error'})
    }
  }

  async deleteAvatar(req, res) {
    try {
      await mongoClient.connect()
      const database = mongoClient.db("test")
      const avatarsBucket = new GridFSBucket(database, {
        bucketName: "avatars_bucket",
      })

      const user = await User.findById(req.user.id)
      user.avatar = null
      const avatarObjId = new mongoose.Types.ObjectId(user.avatarId);
      await avatarsBucket.delete(avatarObjId)

      user.avatarId = null
      await user.save()
 

      return res.json(user)
    } catch (error) {
      console.log(error)
      return res.status(400).json({ message: 'Delete avatar error'})
    }
  }

  async getAvatar(req, res) {
    try {
      await mongoClient.connect()
      const database = mongoClient.db("test")
  
      const avatarsBucket = new GridFSBucket(database, {
        bucketName: "avatars_bucket",
      })


      if (req.params.filename) {
        avatarsBucket.openDownloadStreamByName(req.params.filename).pipe(res)
      }
  
    } catch (error) {
      console.log(error)
      res.status(500).send({
        message: "Error Something went wrong",
        error,
      })
    }
  }
}

module.exports = new FileController()
