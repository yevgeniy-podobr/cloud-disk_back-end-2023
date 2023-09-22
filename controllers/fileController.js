const fileService = require('../services/fileService')
const config = require("config")
const fs = require('fs')
const User = require('../models/User')
const File = require('../models/File')
const { type } = require('os')

class FileController {
  async createDir(req, res) {
    try {
      const {name, type, parent} = req.body
      const file = new File({name, type, parent, user: req.user.id})
      const parentFile = await File.findOne({_id: parent})
      if(!parentFile) {
        file.path = name
        await fileService.createDir(file)
      } else {
        file.path = `${parentFile.path}/${file.name}`
        await fileService.createDir(file)
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
      const files = await File.find({ user: req.user.id, parent: req.query.parent })
      return res.json(files)
    } catch (error) {
      console.log(error)
      return res.status(500).json({ message: 'Can not get files'})
    }
  }

  async uploadFile(req, res) {
    try {
      const file = req.files.file
      const parent = await File.findOne({ user: req.user.id, _id: req.body.parent })
      const user = await User.findOne({ _id: req.user.id })

      if (user.usedSpace + file.size > user.diskSpace) {
        return res.status(400).json({ message: 'There no space on the disk'})
      }
      user.usedSpace = file.size + user.usedSpace

      let path

      if(parent) {
        path = `${config.get('filePath')}${user.id}/${parent.path}/${file.name}`
      } else {
        path = `${config.get('filePath')}${user.id}/${file.name}`
      }

      if (fs.existsSync(path)) {
        return res.status(400).json({ message: 'Fail already exist'})
      }

      file.mv(path)
      const typeFile = file.name.split('.').pop()
      let filePath = file.name

      if (parent) {
        filePath = parent.path + '/' + file.name
      }

      const dbFile = new File({
        name: file.name,
        type: typeFile,
        size: file.size,
        path: filePath,
        parent: parent?._id,
        user: user._id,
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
      const path = config.get("filePath") + '/' + req.user.id + '/' + file.path + '/' + file.name

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
      fileService.deleteFile(file)
      await file.deleteOne()
      return res.json({ message: "File was deleted" })
    } catch (error) {
      console.log(error)
      return res.status(400).json({ message: 'Dir is not empty'})
    }
  }

}

module.exports = new FileController()
