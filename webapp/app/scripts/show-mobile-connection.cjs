const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const connectionFile = path.resolve(__dirname, '../../mobile-access/connection.json');
if (!fs.existsSync(connectionFile)) {
  console.error('Connection is not prepared. Run npm run mobile:qr first.');
  process.exitCode = 1;
} else {
  const { url } = JSON.parse(fs.readFileSync(connectionFile, 'utf8'));
  const expoRequire = createRequire(require.resolve('expo/package.json'));
  const cliFile = expoRequire.resolve('@expo/cli/package.json');
  const { printQRCode } = require(path.join(path.dirname(cliFile), 'build/src/utils/qr.js'));
  console.log('FISH & GREENS — Android / Expo Go SDK 57');
  console.log('Expo and API are running in the background. VPN stays enabled.');
  console.log('Open Expo Go on your phone and scan this QR code.');
  console.log('Manual connection URL:\n' + url + '\n');
  printQRCode(url).print();
}
