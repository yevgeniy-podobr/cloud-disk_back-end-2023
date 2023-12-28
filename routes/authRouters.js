const bcrypt = require('bcryptjs')
const User = require('../models/User')
require('dotenv').config()
const Router = require('express')
const jwt = require('jsonwebtoken')
const { check, validationResult } = require('express-validator')
const router = new Router()
const defaultDiskSpace = require("config").get('defaultDiskSpace')

router.post('/registration', 
  [
    check('email', 'Incorrect email').isEmail(),
    check('password', 'Password must be longer then 3 and shorter 12 symbols').isLength({min: 3, max: 12})
  ], 
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {

        return res.status(401).json({
          message:
            errors.errors.length > 1
              ? `${errors.errors[0].msg}, ${errors.errors[1].msg}`
              : `${errors.errors[0].msg}`,
          errors,
        });
      }
      
      const { email, password } = req.body
      const candidate = await User.findOne({email})

      if (candidate) {
        return res.status(401).json({message: `User with email ${email} already exist`})
      }
  
      const salt = await bcrypt.genSalt()
      const hashedPassword = await bcrypt.hash(password, salt)
      const user = new User({email, password: hashedPassword})
      await user.save()
      return res.json({message: 'User was created'})

    } catch (error) {
      return res.status(500).json({ message: 'Server error'})
    }
})

router.post('/login',
  async (req, res) => {
    try {
      const { email, password } = req.body
      const user = await User.findOne({ email })
      if (!user) {
        return res.status(401).json({message: 'User not found'})
      }
      const isPasswordValid = bcrypt.compareSync(password, user.password)

      if (!isPasswordValid) {
        return res.status(401).json({message: 'Invalid password'})
      }
      const token = jwt.sign({id: user.id}, process.env.SECRET_KEY, {expiresIn: "24h"})
      user.diskSpace = defaultDiskSpace

      await user.save()

      return res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          diskSpace: defaultDiskSpace,
          usedSpace: user.usedSpace,
          avatar: user.avatar
        }
      })
    } catch (error) {
      return res.status(500).json({ message: 'Server error'})
    }
})

module.exports = router
