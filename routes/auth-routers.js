const bcrypt = require('bcryptjs')
const User = require('../models/User')
require('dotenv').config()
const Router = require('express')
const jwt = require('jsonwebtoken')
const { check, validationResult } = require('express-validator')
const router = new Router()
const authMiddleware = require('../middleware/auth.middleware')
const fileService = require('../services/fileService')
const File = require('../models/File')

router.post('/registration', 
  [
    check('email', 'Uncorrect email').isEmail(),
    check('password', 'Password must be longer then 3 and shorter 12').isLength({min: 3, max: 12})
  ], 
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({message: "Uncorret request", errors})
      }
      
      const { email, password } = req.body
      const candidate = await User.findOne({email})

      if (candidate) {
        return res.status(400).join({message: `User with email ${email} already exist`})
      }
      const hashedPassword = await bcrypt.hash(password, 8)
      const user = new User({email, password: hashedPassword})
      await user.save()
      await fileService.createDir(req, new File({user: user.id, name: ''}))
      return res.json({message: 'User was created'})

    } catch (error) {
      res.send({message: 'Server error'})
    }
})

router.post('/login',
  async (req, res) => {
    try {
      const { email, password } = req.body
      const user = await User.findOne({ email })
      if (!user) {
        return res.status(404).json({message: 'User not found'})
      }
      const isPasswordVaild = bcrypt.compareSync(password, user.password)

      if (!isPasswordVaild) {
        return res.status(404).json({message: 'Invalid password'})
      }
      const token = jwt.sign({id: user.id}, process.env.SECRET_KEY, {expiresIn: "24h"})

      return res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          diskSpace: user.diskSpace,
          usedSpace: user.usedSpace,
          avatar: user.avatar,
        }
      })
    } catch (error) {
    
      res.send({message: 'Server error'})
    }
})

router.get('/auth', authMiddleware,
  async (req, res) => {
    try {
      const user = await User.findOne({_id: req.user.id})
      const token = jwt.sign({id: user.id}, process.env.SECRET_KEY, {expiresIn: "24h"})

      return res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          diskSpace: user.diskSpace,
          usedSpace: user.usedSpace,
          avatar: user.avatar,
        }
      })
    } catch (error) {
    
      res.send({message: 'Server error'})
    }
})

module.exports = router
