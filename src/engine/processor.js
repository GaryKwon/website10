import {renderImage} from './effects.js';

/** A fresh Worker per heavy render makes abort a real cancellation, not a cosmetic token.
 * No request queue or pending ImageData copies survive a cancelled job. */
export function processImage(source,options,{signal}={}){
 if(signal?.aborted)return Promise.reject(new DOMException('Render cancelled','AbortError'));
 return new Promise((resolve,reject)=>{
  let finished=false, worker=null, fallbackTimer=null;
  const cleanup=()=>{if(worker){worker.terminate();worker=null;}if(fallbackTimer!==null){clearTimeout(fallbackTimer);fallbackTimer=null;}signal?.removeEventListener('abort',onAbort);};
  const finish=(value,err)=>{if(finished)return;finished=true;cleanup();err?reject(err):resolve(value);};
  const onAbort=()=>finish(null,new DOMException('Render cancelled','AbortError'));
  signal?.addEventListener('abort',onAbort,{once:true});
  const fallback=()=>{
   if(finished)return;
   fallbackTimer=setTimeout(()=>{
    if(finished)return;
    try{finish(renderImage(source,options));}catch(err){finish(null,err);}
   },0);
  };
  if(typeof Worker==='undefined'){fallback();return;}
  try{
   worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});
   worker.onmessage=e=>{
    if(e.data?.error){finish(null,Error(e.data.error));return;}
    const out=e.data?.output;
    if(!out||out.width<1||out.height<1||!out.data){finish(null,Error('Invalid renderer response'));return;}
    finish(new ImageData(new Uint8ClampedArray(out.data),out.width,out.height));
   };
   worker.onerror=e=>{e.preventDefault?.();if(finished)return;worker?.terminate();worker=null;fallback();};
   worker.onmessageerror=()=>{if(finished)return;worker?.terminate();worker=null;fallback();};
   // Transfer a dedicated copy; do not detach the cached preview source.
   const bytes=new Uint8ClampedArray(source.data);
   worker.postMessage({source:{width:source.width,height:source.height,data:bytes},options},[bytes.buffer]);
  }catch{if(worker){worker.terminate();worker=null;}fallback();}
 });
}

export async function imageToData(image,maxEdge=1200){
 const w=image.naturalWidth||image.width,h=image.naturalHeight||image.height;
 const scale=Math.min(1,maxEdge/Math.max(w,h));const width=Math.max(1,Math.round(w*scale)),height=Math.max(1,Math.round(h*scale));
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 if(!ctx)throw Error('Canvas is unavailable');
 ctx.drawImage(image,0,0,width,height);return ctx.getImageData(0,0,width,height);
}

/** Center-crop using exactly the same geometry as object-fit: cover in the editor. */
export function cropImageData(data,aspect){
 if(!Number.isFinite(aspect)||aspect<=0)return data;
 const w=data.width,h=data.height,original=w/h;
 if(Math.abs(original-aspect)<.0001)return data;
 let cw=w,ch=h;
 if(original>aspect)cw=Math.max(1,Math.round(h*aspect));else ch=Math.max(1,Math.round(w/aspect));
 const source=document.createElement('canvas');source.width=w;source.height=h;
 source.getContext('2d').putImageData(data,0,0);
 const target=document.createElement('canvas');target.width=cw;target.height=ch;
 const ctx=target.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,Math.floor((w-cw)/2),Math.floor((h-ch)/2),cw,ch,0,0,cw,ch);
 return ctx.getImageData(0,0,cw,ch);
}

export function dataToBlob(data,type='image/png',quality=.93){
 return new Promise((resolve,reject)=>{
  const canvas=document.createElement('canvas');canvas.width=data.width;canvas.height=data.height;
  const ctx=canvas.getContext('2d');if(!ctx){reject(Error('Canvas is unavailable'));return;}
  ctx.putImageData(data,0,0);
  canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Could not encode image.')),type,quality);
 });
}
export async function dataToURL(data,type='image/png',quality=.93){
 const blob=await dataToBlob(data,type,quality);
 return URL.createObjectURL(blob);
}
