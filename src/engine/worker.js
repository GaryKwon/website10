import {renderImage} from './effects.js';
self.onmessage=e=>{
 try{
  const {source,options}=e.data;
  const input=new ImageData(new Uint8ClampedArray(source.data),source.width,source.height);
  const output=renderImage(input,options);
  self.postMessage({output:{width:output.width,height:output.height,data:output.data}},[output.data.buffer]);
 }catch(err){self.postMessage({error:String(err?.message||err)});}
};
