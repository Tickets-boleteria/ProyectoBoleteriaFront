// src/utils/email.js
const { sendGridApiKey, sendGridEmail } = require('../../config');

const sendEmail = async (to, subject, body) => {
  try {
    const response = await axios.post(
      'https://api.sendgrid.com/v3/mail/send',
      {
        personalizations: [
          {
            to: [{ email: to }],
          },
        ],
        from: {
          name: 'Your Name',
          email: sendGridEmail,
        },
        subject,
        html: body,
      },
      {
        headers: {
          Authorization: `Bearer ${sendGridApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  sendEmail,
};