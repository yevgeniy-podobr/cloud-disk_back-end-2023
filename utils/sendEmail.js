const nodemailer = require("nodemailer");
require('dotenv').config()

module.exports = async (email, subject, text) => {
	try {
		const transporter = nodemailer.createTransport({
			service: process.env.NODEMAILER_SERVICE,
			auth: {
				user: process.env.NODEMAILER_USER_EMAIL,
				pass: process.env.NODEMAILER_USER_PASS
			},
		});

		await transporter.sendMail({
			from: process.env.NODEMAILER_USER_EMAIL,
			to: email,
			subject: subject,
			text: text,
		});

	} catch (error) {
		console.log(error, "email not sent!");
		return error;
	}
};