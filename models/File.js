
const  { model, Schema } = require('mongoose')
const mongoose = require('mongoose')

const File = new Schema({
  name: {type: String, required: true},
  type: {type: String, required: true},
  accessLink: {type: String},
  size: {type: Number, default: 0},
  date: {type: Date, default: Date.now()},
  user: { type: mongoose.ObjectId, ref: 'User' },
  parent: {type: mongoose.ObjectId, ref: 'File'},
  childs: [{type: mongoose.ObjectId, ref: 'File'}],
  fileId: {type: String},
  filenameForDownload: {type: String}
})

module.exports = model('File', File)
