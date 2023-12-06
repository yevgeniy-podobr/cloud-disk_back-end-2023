require('dotenv').config()
const User = require('../models/User')
const File = require('../models/File')
const MongoClient = require("mongodb").MongoClient
const GridFSBucket = require("mongodb").GridFSBucket
const mongoose = require("mongoose")
const uuid = require("uuid").v4

const mongoClient = new MongoClient(process.env.DB_URL)
const database = mongoClient.db("test")

class FileController {
  async createFile(req, res) {
    try {
      const {name, type, parent} = req.body
      const file = new File({name, type, parent, user: req.user.id})
      const parentFile = await File.findOne({_id: parent})
      if (parentFile){
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

      const dbFile = new File({
        name: file.originalname,
        type: file.contentType,
        size: file.size + file.chunkSize,
        parent: parent ? parent?._id : null,
        user: user._id,
        fileId: file.id,
        filenameForDownload: file.filename,
      })

      await dbFile.save()
      await user.save()

      if (parent) {
        parent.childs.push(dbFile._id)
        await parent.save()
      }

      return res.json(dbFile)

    } catch (error) {
      console.log(error)
      return res.status(500).json({ message: 'Upload error'})
    }
  }

  async downloadFile(req, res) {
    try {
      const file = await File.findOne({ _id: req.query.id, user: req.user.id });
  
      if (file) {

        const filesBucket = new GridFSBucket(database, {
          bucketName: "files_bucket",
        })
        const fileName = file.filenameForDownload.toString()

        let downloadStream = filesBucket.openDownloadStreamByName(fileName)

        downloadStream.on("data", (data) => {
          return res.status(200).write(data)
        })
    
        downloadStream.on("error", () => {
          return res.status(404).json({ error: "Download error" })
        })
    
        downloadStream.on("end", () => {
          return res.end()
        })
      } else {
        return res.status(400).json({ message: 'Download error'})
      }
    } catch (error) {
      console.log(error)
      return res.status(500).json({ message: 'Download error'})
    }
  }

  async renameFile(req, res) {
    try {
      const { id, name } = req.body
      const file = await File.findOne({ _id: id, user: req.user.id });

      if (!file) {
        return res.status(400).json({ message: 'File not found'})
      }

      if (file.type !== 'dir') {

        const filesBucket = new GridFSBucket(database, {
          bucketName: "files_bucket",
        })
  
        const fileObjId = new mongoose.Types.ObjectId(file.fileId);

        const newFileNameForDownload = `${uuid()}_${name}`
        await filesBucket.rename(fileObjId, newFileNameForDownload)
        file.filenameForDownload = newFileNameForDownload
      }

      file.name = name

      await file.save()

      return res.json(file)
    } catch (error) {
      console.log(error)
      return res.status(400).json({ message: 'Something was wrong'})
    }
  }

  async deleteFile(req, res) {
    try {
      const file = await File.findOne({ _id: req.query.id, user: req.user.id });
      const parentFile = await File.findById(file.parent)
      const user = await User.findOne({ _id: req.user.id })

      if (!file) {
        return res.status(400).json({ message: 'File not found'})
      }

      if (file.type !== 'dir') {

        const filesBucket = new GridFSBucket(database, {
          bucketName: "files_bucket",
        })
  
        const fileObjId = new mongoose.Types.ObjectId(file.fileId);
        await filesBucket.delete(fileObjId)
      }

      if (parentFile) {
        parentFile.childs = parentFile.childs.filter(child => child.toString() !== file._id.toString())
        await parentFile.save()
      }
      const correctedUserUsedSpace = user.usedSpace - file.size
      const fileType = file.type

      user.usedSpace = correctedUserUsedSpace

      await file.deleteOne()
      await user.save()

      return res.json({ message: `${fileType === 'dir' ? 'Folder' : 'File'} was deleted` })
    } catch (error) {
      console.log(error)
      return res.status(400).json({ message: 'Something was wrong, file was not deleted'})
    }
  }

  async searchFile(req, res) {
    try {
      const searchName = req.query.search
      const files = await File.find({user: req.user.id})

      const filteredFiles = files.filter(file => (file.name).toLocaleLowerCase().includes(searchName.toLocaleLowerCase()))

      return res.json(filteredFiles)
    } catch (error) {
      console.log(error)
      return res.status(400).json({ message: 'Search error'})
    }
  }

  async uploadAvatar(req, res) {
    try {
      const user = await User.findById(req.user.id)

      if (user.avatarId) {

        const avatarsBucket = new GridFSBucket(database, {
          bucketName: "avatars_bucket",
        })

        const avatarObjId = new mongoose.Types.ObjectId(user.avatarId);
        await avatarsBucket.delete(avatarObjId)
      }

      user.avatar = req.file.filename
      user.avatarId = req.file.id

      await user.save()

      return res.json({ avatar: user.avatar, usedSpace: user.usedSpace })
    } catch (error) {
      console.log(error)
      return res.status(400).json({ message: 'Upload avatar error'})
    }
  }

  async deleteAvatar(req, res) {
    try {

      const avatarsBucket = new GridFSBucket(database, {
        bucketName: "avatars_bucket",
      })

      const user = await User.findById(req.user.id)
      user.avatar = null
      const avatarObjId = new mongoose.Types.ObjectId(user.avatarId);
      await avatarsBucket.delete(avatarObjId)

      user.avatarId = null
      await user.save()
 

      return res.json({avatar: null, usedSpace: user.usedSpace})
    } catch (error) {
      console.log(error)
      return res.status(400).json({ message: 'Delete avatar error'})
    }
  }

  async getAvatar(req, res) {
    try {
  
      const avatarsBucket = new GridFSBucket(database, {
        bucketName: "avatars_bucket",
      })

      if (req.params.filename) {
        avatarsBucket.openDownloadStreamByName(req.params.filename).pipe(res)
      }
  
    } catch (error) {
      console.log(error)
      res.status(500).json({
        message: "Error! Something went wrong",
        error,
      })
    }
  }
}

module.exports = new FileController()
