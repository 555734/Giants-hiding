import { chromium } from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {once} from 'node:events';
import path from 'node:path';
const args=process.argv.slice(2),stills=args.includes('--stills');
const get=(flag,def)=>{const i=args.indexOf(flag);return i<0?def:args[i+1]};
const width=Number(get('--width',stills?1280:1920)),height=Number(get('--height',stills?720:1080)),fps=Number(get('--fps',60));
const out=path.resolve(get('--out','output'));await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-web-security','--hide-scrollbars']});
const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
let browserErrors=[];page.on('pageerror',e=>{browserErrors.push(String(e));console.error('BROWSER ERROR',e)});page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('favicon')){browserErrors.push(m.text());console.error('BROWSER',m.text())}});
await page.goto(get('--url','http://127.0.0.1:5173/?capture=1'),{waitUntil:'networkidle'});await page.waitForFunction(()=>window.__PV?.ready,{timeout:90000});
const telemetry=[];
if(stills){
 for(const t of [0,1.5,4.5,7.5,10.5,13.5,16.5,19.5,22.5,25.5,28.5]){
  const jpeg=await page.evaluate(t=>window.__PV.jpeg(t),t);await writeFile(path.join(out,`frame-${t.toFixed(1).padStart(4,'0')}.jpg`),Buffer.from(jpeg,'base64'));
  const d=await page.evaluate(()=>window.__PV.diagnostics());telemetry.push(d);console.log(t,JSON.stringify(d.state));
 }
}else{
 const file=path.join(out,'giants-hiding-pv-30s.mp4');
 const enc=spawn('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','image2pipe','-vcodec','mjpeg','-framerate',String(fps),'-i','pipe:0','-i',path.join(out,'foley.wav'),'-map','0:v','-map','1:a','-c:v','libx264','-preset','medium','-crf','19','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-t','30','-metadata','title=Giants Hiding — Harbour Escape PV v0.1','-metadata','comment=Head scan: Lee Perry-Smith / Infinite-Realities, CC BY 3.0. Body: orange juice games, CC0. Adapted meshes and rig poses. Full credits: github.com/555734/Giants-hiding/blob/main/docs/CREDITS.txt','-movflags','+faststart',file],{stdio:['pipe','inherit','inherit']});
 const begin=Date.now();
 for(let n=0;n<fps*30;n++){
  const jpeg=await page.evaluate(t=>window.__PV.jpeg(t),n/fps);const bytes=Buffer.from(jpeg,'base64');if(!enc.stdin.write(bytes))await once(enc.stdin,'drain');
  if(n%fps===0){const d=await page.evaluate(()=>window.__PV.diagnostics());telemetry.push(d);console.log(`Rendered ${n/fps}/30s; elapsed ${((Date.now()-begin)/1000).toFixed(1)}s`)}
  if(n%(fps*3)===Math.round(fps*1.5))await writeFile(path.join(out,`encoded-source-${n}.jpg`),bytes);
 }
 enc.stdin.end();const [code]=await once(enc,'close');if(code!==0)throw new Error(`ffmpeg exit ${code}`);console.log('Video:',file);
}
if(browserErrors.length)throw new Error('Browser errors: '+browserErrors.join('\n'));
await writeFile(path.join(out,stills?'stills-telemetry.json':'capture-telemetry.json'),JSON.stringify(telemetry,null,2));await browser.close();
