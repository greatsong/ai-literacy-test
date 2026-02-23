const fs = require('fs');

const firebaseApiKey = process.env.FIREBASE_API_KEY || '';
const content = `window.__FIREBASE_API_KEY__ = ${JSON.stringify(firebaseApiKey)};`;
fs.writeFileSync('firebase-env.js', content);
console.log('firebase-env.js generated');
