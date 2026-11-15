import { copyFile, writeFile } from 'node:fs/promises';
await copyFile(new URL('../pages/worker.js', import.meta.url), new URL('../site/_worker.js', import.meta.url));
await writeFile(new URL('../site/_routes.json', import.meta.url), JSON.stringify({version:1,include:['/api/*','/admin','/admin/*'],exclude:[]}));
