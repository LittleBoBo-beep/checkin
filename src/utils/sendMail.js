const nodemailer = require("nodemailer");
/**
 * 通过user邮箱发送Mail到to的邮箱
 * @param data
 * @returns {Promise<void>}
 */
const sendMail = async (data) => {
  const user = process.env.USER || process.env.user;
  const pass = process.env.PASS || process.env.pass;
  let transporter = nodemailer.createTransport({
    host: "smtp.163.com",
    port: 465,
    secure: true,
    auth: {
      user,
      pass,
    },
  });

  data.from = `"${data.from}" ${user}`;
  await transporter.sendMail(data);
};

module.exports = sendMail;
