const router = require("express").Router();
const User = require('../models/User')
const bcrypt = require("bcrypt");
require('dotenv').config()
const sendEmail = require('../utils/sendEmail')
const jwt = require('jsonwebtoken')

router.post("/", async (req, res) => {
	try {
		const user = await User.findOne({ email: req.body.email });
    
    if (!user){
        return res
          .status(400)
          .send({ message: "User with given email does not exist!" });
    }

		const token = jwt.sign({id: user._id}, process.env.SECRET_KEY, {expiresIn: "24h"})
		const url = `${process.env.REACT_APP_API_URL}#/reset-password/${user._id}/${token}/`;
  
		const error = await sendEmail(user.email, "Reset Password Link", url);
    
		if (error) {
			res
			.status(500)
			.json({ message: "Email not sent!" });
		}
		return res
			.status(200)
			.json({ message: "Reset Password link sent to your email account" });
	} catch (error) {
		res.status(500).send({ message: "Internal Server Error" });
	}
});

router.post("/:id/:token", async (req, res) => {
	try {
		const user = await User.findOne({ _id: req.params.id });
		if (!user) return res.status(400).send({ message: "Invalid link" });

    const token = jwt.verify(req.params.token, process.env.SECRET_KEY)

    if (!token) {
      return res.status(400).json({ message: "Invalid link" })
    }

		const salt = await bcrypt.genSalt();
		const hashPassword = await bcrypt.hash(req.body.password, salt);

		user.password = hashPassword;
		await user.save();

		return res.status(200).json({ message: "Password reset successfully" });
	} catch (error) {
		return res.status(500).json({ message: "Internal Server Error" });
	}
});

module.exports = router;