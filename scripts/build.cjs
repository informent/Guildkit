'use strict';
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..'), target = path.join(root, 'dist'); fs.mkdirSync(target, { recursive: true });
for (const name of ['index.html', 'style.css', 'app.js', 'engine.js', 'icon.svg']) fs.copyFileSync(path.join(root, name), path.join(target, name));
console.log('Built dist/: all assets bundled locally; no dependencies or CDN.');
