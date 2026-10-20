import {createHash} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const root='public/assets/surfaces';await mkdir(root,{recursive:true});
const manifest=[];
async function get(url){const r=await fetch(url,{headers:{'User-Agent':'GiantsHiding-PV/0.2 (github.com/555734/Giants-hiding)'}});if(!r.ok)throw Error(url+': '+r.status);return r;}
async function save(name,url){let b;try{b=await readFile(root+'/'+name)}catch{b=Buffer.from(await(await get(url)).arrayBuffer());await writeFile(root+'/'+name,b)}manifest.push({name,url,sha256:createHash('sha256').update(b).digest('hex')});console.log('Surface:',name,b.length);}
for(const [name,id]of [['stone','castle_wall_slates'],['wood','wood_planks_dirt'],['roof','roof_tiles_14']]){
 const info=await(await get('https://api.polyhaven.com/files/'+id)).json();
 for(const [out,key]of [['color','diff'],['normal','nor_gl'],['roughness','rough']]){
  const f=info[key]?.['2k']?.jpg;if(!f?.url)throw Error(id+' missing '+key+' 2k jpg');await save(name+'-'+out+'.jpg',f.url);
 }
}
const env=await(await get('https://api.polyhaven.com/files/kloofendal_48d_partly_cloudy')).json();
await save('sky.hdr',env.hdri['2k'].hdr.url);
await save('water-normal.jpg','https://raw.githubusercontent.com/mrdoob/three.js/r186/examples/textures/waternormals.jpg');
await writeFile(root+'/manifest.json',JSON.stringify(manifest,null,2));
