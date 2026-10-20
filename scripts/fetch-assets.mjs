import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assets from '../docs/assets.json' with {type:'json'};
await mkdir('public/assets',{recursive:true});
for(const a of assets){
 const path='public/assets/'+a.name;let bytes;
 try{bytes=await readFile(path)}catch{}
 if(!bytes||createHash('sha256').update(bytes).digest('hex')!==a.sha256){
  const r=await fetch(a.url);if(!r.ok)throw new Error(`${a.name}: HTTP ${r.status}`);bytes=Buffer.from(await r.arrayBuffer());
  if(createHash('sha256').update(bytes).digest('hex')!==a.sha256)throw new Error(`${a.name}: checksum mismatch`);
  await writeFile(path,bytes);
 }
 console.log('Verified asset:',a.name);
}
