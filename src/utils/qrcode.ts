import QRCode from 'qrcode';

export const generateQrCode = async (
  value: string,
  filename: string
): Promise<void> => {
  await QRCode.toFile(filename, value);
};
