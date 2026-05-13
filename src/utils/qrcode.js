
const qrcode = require('qrcode');

const generateQrCode = async (value, filename) => {
  try {
    await qrcode.toFile(filename, value);
  } catch (error) {
    throw error;
  }
};

module.exports = {
  generateQrCode,
};