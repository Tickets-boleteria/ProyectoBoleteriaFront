import axios from 'axios';
import { sendGridApiKey, sendGridEmail } from '../config';

export const sendEmail = async (
  to: string,
  subject: string,
  body: string
): Promise<unknown> => {
  if (!sendGridApiKey || !sendGridEmail) {
    throw new Error('Faltan variables VITE_SENDGRID_API_KEY o VITE_SENDGRID_EMAIL');
  }

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
};
