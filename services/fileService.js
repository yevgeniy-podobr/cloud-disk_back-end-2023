const fs = require('fs')
const config = require('config')

class FileService {

  createDir(file) {
    const filePath = `${config.get('filePath')}${file.user}${file.path ? `/` : ''}${file.path}`
    return new Promise(((resolve, reject) => {
      try {
        if (!fs.existsSync(filePath)) {
          fs.mkdirSync(filePath)
          return resolve({ message: "File was created"})
        } else {
          return reject({message: "File already created"})
        }
      } catch (error) {
       return reject({message: 'File error'}) 
      }
    }))
  }

  deleteFile(file) {
    const path = this.getPath(file)

    if(file.type === 'dir') {
      fs.rmdirSync(path)
    } else {
      fs.unlinkSync(path)
    }
  }

  getPath(file) {
    return config.get('filePath') + file.user + '/' + `${file.path ? file.path : file.name}`
   }
}

module.exports = new FileService()
