const { Schema, model } = require('mongoose')
const mongoose = require('mongoose')
const defaultDiskSpace = require("config").get('defaultDiskSpace')

const User = new Schema({
  email: {type: String, required: true, unigue: true},
  password: {type: String, required: true},
  diskSpace: {type: Number, default: defaultDiskSpace},
  usedSpace: {type: Number, default: 0},
  avatar: {type: String},
  avatarId: {type: String},
  files: [{type: mongoose.ObjectId, ref: 'File'}],
})

module.exports = model("User", User)
