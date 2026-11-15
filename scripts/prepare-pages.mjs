import { rm, writeFile } from 'node:fs/promises';
// Keep server code outside the public asset directory. Pages compiles functions/.
await rm(new URL('../site/_worker.js', import.meta.url), {force:true});
await writeFile(new URL('../site/_routes.json', import.meta.url), JSON.stringify({version:1,include:['/api/*','/admin','/admin/*'],exclude:[]}));
