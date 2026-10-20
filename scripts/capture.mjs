import { chromium } from 'playwright';
import {spawn,spawnSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {once} from 'node:events';
import path from 'node:path';
const args=process.argv.slice(2),stills=args.includes('--stills');
const get=(flag,def)=>{const i=args.indexOf(flag);return i<0?def:args[i+1]};
const chunkArg=get('--chunk',null),chunk=chunkArg===null?null:Number(chunkArg),start=chunk===null?0:chunk*1.5,duration=chunk===null?30:1.5;
const width=Number(get('--width',stills?1280:1920)),height=Number(get('--height',stills?720:1080)),fps=Number(get('--fps',30));
if(!stills&&spawnSync('ffmpeg',['-version'],{stdio:'ignore'}).status!==0)throw new Error('FFmpeg is required for capture');
const out=path.resolve(get('--out','output'));await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader','--hide-scrollbars']});
try{
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
 let browserErrors=[];page.on('pageerror',e=>{browserErrors.push(String(e));console.error('BROWSER ERROR',e)});page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('favicon')){browserErrors.push(m.text());console.error('BROWSER',m.text())}});
 await page.goto(get('--url','http://127.0.0.1:5173/?capture=1'+(stills?'&review=1':'')),{waitUntil:'networkidle',timeout:180000});await page.waitForFunction(()=>window.__PV?.ready,null,{timeout:180000});
 if(browserErrors.length)throw new Error('Browser errors: '+browserErrors.join('\n'));

 const telemetry=[];
 if(stills){
  for(const t of get('--times','0,1.5,4.5,7.5,9.9,10.3,10.35,10.5,13.5,16.5,19.5,22.5,25.5,28.5').split(',').map(Number)){
   const jpeg=await page.evaluate(t=>window.__PV.jpeg(t),t);await writeFile(path.join(out,`frame-${t.toFixed(2).padStart(5,'0')}.jpg`),Buffer.from(jpeg,'base64'));
   const d=await page.evaluate(()=>window.__PV.diagnostics());telemetry.push(d);console.log(t,JSON.stringify(d.state));
  }
 }else{
  const file=path.join(out,chunk===null?'giants-hiding-pv-30s.mp4':`part-${String(chunk).padStart(2,'0')}.mp4`);
  const inputs=chunk===null?['-i',path.join(out,'foley.wav'),'-map','0:v','-map','1:a','-c:a','aac','-b:a','192k']:['-an'];
  const enc=spawn('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','image2pipe','-vcodec','mjpeg','-framerate',String(fps),'-i','pipe:0',...inputs,'-c:v','libx264','-preset','medium','-crf','19','-pix_fmt','yuv420p','-t',String(duration),'-metadata','title=Giants Hiding — Harbour Escape PV v0.4','-metadata','comment=Character: Renderpeople Nathan Animated 003 Walking, licensed free sample. Adapted scale, textures and poses. Full credits: github.com/555734/Giants-hiding/blob/main/docs/CREDITS.txt','-movflags','+faststart',file],{stdio:['pipe','inherit','inherit']});
  let encoderError;enc.on('error',e=>encoderError=e);enc.stdin.on('error',e=>encoderError=e);
  const begin=Date.now(),first=Math.round(start*fps),end=Math.round((start+duration)*fps);
  for(let n=first;n<end;n++){
   if(encoderError)throw encoderError;
   const jpeg=await page.evaluate(t=>window.__PV.jpeg(t),n/fps),bytes=Buffer.from(jpeg,'base64');if(!enc.stdin.write(bytes))await once(enc.stdin,'drain');
   if(n===first||n%fps===0||n===end-1){const d=await page.evaluate(()=>window.__PV.diagnostics());d.frame=n;telemetry.push(d);console.log(`Rendered frame ${n}/${fps*30}; elapsed ${((Date.now()-begin)/1000).toFixed(1)}s`)}
   if(n%(fps*3)===Math.round(fps*1.5))await writeFile(path.join(out,`encoded-source-${n}.jpg`),bytes);
  }
  enc.stdin.end();const [code]=await once(enc,'close');if(code!==0)throw new Error(`ffmpeg exit ${code}`);console.log('Video:',file);
 }
 if(browserErrors.length)throw new Error('Browser errors: '+browserErrors.join('\n'));
 const name=stills?'stills-telemetry.json':chunk===null?'capture-telemetry.json':`capture-telemetry-${String(chunk).padStart(2,'0')}.json`;
 await writeFile(path.join(out,name),JSON.stringify(telemetry,null,2));
}finally{await browser.close();}
