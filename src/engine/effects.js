import {CONTROL_FALLBACKS} from '../presets/control-policy.js';
/* Independent Canvas2D creative-coding renderer. Works in Worker and main thread.
 * Every numbered registry preset routes through a different technique stack.
 */
const TAU=Math.PI*2;
const clamp=(v,a=0,b=255)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
const luma=(r,g,b)=>r*.2126+g*.7152+b*.0722;
function random(seed=17){ let x=(seed|0)||17;return ()=>{ x^=x<<13;x^=x>>>17;x^=x<<5;return ((x>>>0)%1000000)/1000000;}; }
const makeCanvas=(w,h)=>{let c=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w,h):document.createElement('canvas');c.width=w;c.height=h;return c;};
const context=c=>c.getContext('2d',{willReadFrequently:true});
function scratch(ctx){const c=makeCanvas(ctx.canvas.width,ctx.canvas.height);context(c).drawImage(ctx.canvas,0,0);return c;}
function pixels(ctx,func){const w=ctx.canvas.width,h=ctx.canvas.height;const im=ctx.getImageData(0,0,w,h),d=im.data; for(let i=0;i<d.length;i+=4){const p=func(d[i],d[i+1],d[i+2],d[i+3],(i/4)%w,Math.floor(i/4/w),i);if(p){d[i]=clamp(p[0]);d[i+1]=clamp(p[1]);d[i+2]=clamp(p[2]);if(p.length>3)d[i+3]=clamp(p[3]);}}ctx.putImageData(im,0,0);}
function monochrome(ctx,color=[255,255,255],bg=[0,0,0],gamma=1){pixels(ctx,(r,g,b)=>{const t=(luma(r,g,b)/255)**gamma;return color.map((c,i)=>mix(bg[i],c,t));});}
function threshold(ctx,level=128,c1=[10,10,10],c2=[245,245,242]){pixels(ctx,(r,g,b)=>luma(r,g,b)>=level?c2:c1);}
function poster(ctx,levels=4, colors=null){pixels(ctx,(r,g,b)=>{const t=luma(r,g,b)/255; if(colors)return colors[Math.min(colors.length-1,Math.floor(t*colors.length))];const s=255/(levels-1);return [Math.round(r/s)*s,Math.round(g/s)*s,Math.round(b/s)*s]});}
function noise(ctx,amount,seed=4,mono=false){const rand=random(seed);pixels(ctx,(r,g,b)=>{const n=(rand()-.5)*amount;return [r+n,g+(mono?n:(rand()-.5)*amount),b+(mono?n:(rand()-.5)*amount)]});}
function tone(ctx,shadows=[12,20,34],highlights=[235,218,184],gamma=1){monochrome(ctx,highlights,shadows,gamma);}
function brightness(ctx,contrast=1,offset=0){pixels(ctx,(r,g,b)=>[(r-128)*contrast+128+offset,(g-128)*contrast+128+offset,(b-128)*contrast+128+offset]);}
function blur(ctx,amount=3,opacity=1){let old=scratch(ctx);ctx.save();ctx.globalAlpha=opacity;ctx.filter=`blur(${Math.max(0.1,amount)}px)`;ctx.drawImage(old,0,0);ctx.restore();}
function bloom(ctx,radius=8,alpha=.42){let old=scratch(ctx);ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=alpha;ctx.filter=`blur(${radius}px) brightness(1.5)`;ctx.drawImage(old,0,0);ctx.restore();}
function vignette(ctx,alpha=.5){const w=ctx.canvas.width,h=ctx.canvas.height;let g=ctx.createRadialGradient(w*.5,h*.49,Math.min(w,h)*.12,w*.5,h*.5,Math.max(w,h)*.73);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,`rgba(0,0,0,${alpha})`);ctx.fillStyle=g;ctx.fillRect(0,0,w,h);}
function lines(ctx,step=5,opacity=.28,color='0,0,0'){const w=ctx.canvas.width,h=ctx.canvas.height;ctx.save();ctx.fillStyle=`rgba(${color},${opacity})`;for(let y=0;y<h;y+=Math.max(2,step))ctx.fillRect(0,y,w,Math.max(1,step*.28));ctx.restore();}
function pixelate(ctx,size=9,grid=false){const w=ctx.canvas.width,h=ctx.canvas.height,small=makeCanvas(Math.max(1,Math.round(w/size)),Math.max(1,Math.round(h/size)));const sctx=context(small);sctx.drawImage(ctx.canvas,0,0,small.width,small.height);ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,w,h);ctx.drawImage(small,0,0,w,h);ctx.imageSmoothingEnabled=true;if(grid){ctx.strokeStyle='rgba(0,0,0,.2)';ctx.lineWidth=1;for(let x=0;x<w;x+=size){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}}}
function dither(ctx,type='bayer',step=1,level=128){const w=ctx.canvas.width,h=ctx.canvas.height,im=ctx.getImageData(0,0,w,h),d=im.data;
 const matrix=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
 let val=new Float32Array(w*h);for(let i=0;i<val.length;i++)val[i]=luma(d[i*4],d[i*4+1],d[i*4+2]);
 if(type==='bayer'){for(let y=0;y<h;y++)for(let x=0;x<w;x++){let k=y*w+x;val[k]=val[k]+(matrix[y%4][x%4]-7.5)*(8+step*.7)>=level?255:0;}}
 else {const atkinson=type==='atkinson';const offsets=atkinson?[[1,0,1/8],[2,0,1/8],[-1,1,1/8],[0,1,1/8],[1,1,1/8],[0,2,1/8]]:[[1,0,7/16],[-1,1,3/16],[0,1,5/16],[1,1,1/16]];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const k=y*w+x,old=val[k],nv=old>=level?255:0,e=old-nv;val[k]=nv;for(const [dx,dy,weight] of offsets){const nx=x+dx,ny=y+dy;if(nx>=0&&nx<w&&ny<h)val[ny*w+nx]+=e*weight;}}}
 for(let i=0;i<val.length;i++){d[i*4]=d[i*4+1]=d[i*4+2]=val[i];}ctx.putImageData(im,0,0);
}
function halftone(ctx,cell=11,angle=0,col='#090909',paper='#faf9f2',opacity=1){const w=ctx.canvas.width,h=ctx.canvas.height,im=ctx.getImageData(0,0,w,h),d=im.data;ctx.save();ctx.fillStyle=paper;ctx.fillRect(0,0,w,h);ctx.fillStyle=col;ctx.globalAlpha=opacity;let cs=Math.max(3,Math.floor(cell));for(let y=cs/2;y<h;y+=cs){for(let x=cs/2;x<w;x+=cs){const ix=(Math.floor(y)*w+Math.floor(x))*4,v=luma(d[ix],d[ix+1],d[ix+2]);const rad=Math.sqrt(Math.max(0,1-v/255))*cs*.65;ctx.beginPath();ctx.ellipse(x,y,rad,rad*(.85+.15*Math.cos(angle)),angle,0,TAU);ctx.fill();}}ctx.restore();}
function ascii(ctx,cell=13,chars='@%#*+=-:. ',ink='#e6efe8',paper='#07121c',typ='normal'){const w=ctx.canvas.width,h=ctx.canvas.height,im=ctx.getImageData(0,0,w,h),d=im.data;const cx=Math.max(5,Math.round(cell*.72)),cy=Math.max(7,Math.round(cell));ctx.fillStyle=paper;ctx.fillRect(0,0,w,h);ctx.fillStyle=ink;ctx.font=`${typ==='bold'?'bold ':''}${Math.ceil(cy*.94)}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';for(let y=cy/2;y<h;y+=cy)for(let x=cx/2;x<w;x+=cx){const ix=(Math.floor(y)*w+Math.floor(x))*4,v=luma(d[ix],d[ix+1],d[ix+2]);ctx.globalAlpha=.35+v/390;ctx.fillText(chars[Math.min(chars.length-1,Math.floor((v/255)*(chars.length-1)))],x,y);}ctx.globalAlpha=1;}
function edgeImage(ctx,strength=2,color=[255,255,255],back=[7,8,12]){const w=ctx.canvas.width,h=ctx.canvas.height;const im=ctx.getImageData(0,0,w,h),d=im.data,out=ctx.createImageData(w,h);for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const k=y*w+x,L=k*4;const a=luma(d[L-4],d[L-3],d[L-2]),b=luma(d[L+4],d[L+5],d[L+6]),u=luma(d[L-w*4],d[L-w*4+1],d[L-w*4+2]),v=luma(d[L+w*4],d[L+w*4+1],d[L+w*4+2]);const z=clamp((Math.abs(b-a)+Math.abs(v-u))*strength)/255;for(let c=0;c<3;c++)out.data[L+c]=mix(back[c],color[c],z);out.data[L+3]=255;}ctx.putImageData(out,0,0);}
function offsetSlices(ctx,count=16,size=24,seed=22){const w=ctx.canvas.width,h=ctx.canvas.height,old=scratch(ctx),rand=random(seed);for(let i=0;i<count;i++){const y=Math.floor(rand()*h),hh=Math.max(1,Math.round(rand()*size+2)),dx=(rand()-.5)*size*4;ctx.drawImage(old,0,y,w,hh,dx,y,w,hh);}}
function shiftRGB(ctx,amount=4){const w=ctx.canvas.width,h=ctx.canvas.height,im=ctx.getImageData(0,0,w,h),src=im.data,out=new Uint8ClampedArray(src);const k=Math.max(1,Math.round(amount));for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;out[i]=src[(y*w+Math.min(w-1,x+k))*4];out[i+2]=src[(y*w+Math.max(0,x-k))*4+2];}im.data.set(out);ctx.putImageData(im,0,0);}
function paper(ctx,amount=23,seed=16){noise(ctx,amount,seed,true);const w=ctx.canvas.width,h=ctx.canvas.height,rand=random(seed+9);ctx.save();for(let i=0;i<w*h/900;i++){ctx.strokeStyle=`rgba(255,250,230,${rand()*.15})`;ctx.lineWidth=.5+rand();const x=rand()*w,y=rand()*h;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+rand()*21,y+rand()*3);ctx.stroke();}ctx.restore();}
function gradient(ctx,colors,alpha=.5,direction='linear'){const w=ctx.canvas.width,h=ctx.canvas.height;const g=direction==='radial'?ctx.createRadialGradient(w*.8,h*.75,0,w*.55,h*.5,Math.max(w,h)*.9):ctx.createLinearGradient(0,h,w*.82,0);colors.forEach((col,i)=>g.addColorStop(i/(colors.length-1),col));ctx.save();ctx.globalAlpha=alpha;ctx.globalCompositeOperation='screen';ctx.fillStyle=g;ctx.fillRect(0,0,w,h);ctx.restore();}
function boundary(ctx,step=35,ink='#f6f5f0',width=1,transparent=false){const w=ctx.canvas.width,h=ctx.canvas.height,im=ctx.getImageData(0,0,w,h),d=im.data,cs=Math.max(4,Math.round(step));if(!transparent){ctx.fillStyle='#070a10';ctx.fillRect(0,0,w,h);}ctx.save();ctx.strokeStyle=ink;ctx.lineWidth=width;for(let level=cs;level<=230;level+=cs){ctx.beginPath();for(let y=2;y<h-2;y+=4)for(let x=2;x<w-2;x+=4){const k=(y*w+x)*4,kr=(y*w+x+3)*4,kb=((y+3)*w+x)*4;const a=luma(d[k],d[k+1],d[k+2]);const b=luma(d[kr],d[kr+1],d[kr+2]);const c=luma(d[kb],d[kb+1],d[kb+2]);if((a-level)*(b-level)<0||(a-level)*(c-level)<0)ctx.rect(x,y,1.3,1.3);}ctx.stroke();}ctx.restore();}
function blobs(ctx,thresholdValue=125,size=6,color='#b5f2ed'){const w=ctx.canvas.width,h=ctx.canvas.height,im=ctx.getImageData(0,0,w,h),d=im.data;let step=Math.max(4,Math.round(size));let gw=Math.ceil(w/step),gh=Math.ceil(h/step),grid=new Uint8Array(gw*gh),seen=new Uint8Array(gw*gh),blobs=[];
 for(let y=0;y<gh;y++)for(let x=0;x<gw;x++){const px=Math.min(w-1,x*step),py=Math.min(h-1,y*step),i=(py*w+px)*4;grid[y*gw+x]=luma(d[i],d[i+1],d[i+2])>thresholdValue?1:0;}
 for(let y=0;y<gh;y++)for(let x=0;x<gw;x++){const i=y*gw+x;if(seen[i]||!grid[i])continue;seen[i]=1;const q=[i],region=[];for(let j=0;j<q.length;j++){const p=q[j],px=p%gw,py=Math.floor(p/gw);region.push([px,py]);for(const n of [p-1,p+1,p-gw,p+gw]){if(n<0||n>=seen.length||seen[n]||!grid[n])continue;if(Math.abs(n%gw-px)>1)continue;seen[n]=1;q.push(n);}}if(region.length>=4)blobs.push(region);if(blobs.length>100)break;}
 ctx.save();ctx.lineWidth=Math.max(1,step*.24);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.font=`${Math.max(9,step*1.5)}px monospace`;blobs.sort((a,b)=>b.length-a.length).slice(0,42).forEach((r,i)=>{let sx=0,sy=0;const set=new Set(r.map(([x,y])=>x+','+y));for(const [x,y]of r){sx+=x;sy+=y;const ax=x*step,ay=y*step;if(!set.has((x-1)+','+y))ctx.strokeRect(ax,ay,1,step);if(!set.has((x+1)+','+y))ctx.strokeRect(ax+step,ay,1,step);if(!set.has(x+','+(y-1)))ctx.strokeRect(ax,ay,step,1);if(!set.has(x+','+(y+1)))ctx.strokeRect(ax,ay+step,step,1);}const cx=sx/r.length*step,cy=sy/r.length*step;ctx.beginPath();ctx.arc(cx,cy,Math.max(2,step*.3),0,TAU);ctx.fill();if(i<12)ctx.fillText(String(i+1).padStart(2,'0'),cx+step,cy-step);});ctx.restore();return blobs.length;}
function roundedRect(ctx,x,y,w,h,r=10){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function label(ctx,text,x,y,size=16,col='#f6f5f2',align='left',weight='bold'){
 if(!String(text??'').trim())return;
 const w=ctx.canvas.width,h=ctx.canvas.height;
 const maxWidth=Math.max(10,align==='center'?2*Math.min(x,w-x)-Math.max(6,w*.03):align==='right'?x-Math.max(6,w*.025):w-x-Math.max(6,w*.025));
 const safeY=Math.max(0,Math.min(y,h-8));
 let fontSize=Math.max(8,Math.min(size,h*.18));
 ctx.save();ctx.fillStyle=col;ctx.textBaseline='top';ctx.textAlign=align;
 ctx.font=`${weight} ${fontSize}px monospace`;
 if(ctx.measureText(String(text)).width>maxWidth){fontSize=Math.max(8,fontSize*maxWidth/Math.max(ctx.measureText(String(text)).width,1));ctx.font=`${weight} ${fontSize}px monospace`;}
 ctx.fillText(String(text),x,Math.min(safeY,h-fontSize),maxWidth);ctx.restore();
}
function cutText(ctx,text,seed=17,scale=1,y=.66){const w=ctx.canvas.width,h=ctx.canvas.height,rand=random(seed);const letters=String(text??'').toUpperCase().slice(0,45);if(!letters.trim())return;const fs=Math.max(16,Math.floor(Math.min(w/Math.max(letters.length,5)*1.2,h*.16)*scale));const start=(w-letters.length*fs*.63)*.5;let x=start;for(let i=0;i<letters.length;i++){const ch=letters[i];if(ch===' '){x+=fs*.45;continue;}ctx.save();ctx.translate(x+fs*.3,h*y+Math.sin(i*1.3)*fs*.15);ctx.rotate((rand()-.5)*.42);ctx.fillStyle=['#fffaf0','#f6d969','#d8f1e6','#d1a3a8','#ededed'][i%5];ctx.fillRect(-fs*.15,-fs*.72,fs*.66,fs*1.12);ctx.font=`${i%3===0?'900':'bold'} ${fs}px ${i%2===0?'Georgia,serif':'monospace'}`;ctx.fillStyle='#121212';ctx.textAlign='center';ctx.fillText(ch,fs*.16,fs*.11);ctx.restore();x+=fs*.64;}}
function frame(ctx,margin=20,fill='#edece3',border='#151515'){const w=ctx.canvas.width,h=ctx.canvas.height,old=scratch(ctx);ctx.fillStyle=fill;ctx.fillRect(0,0,w,h);ctx.drawImage(old,margin,margin,w-2*margin,h-2*margin);ctx.strokeStyle=border;ctx.lineWidth=Math.max(1,margin*.05);ctx.strokeRect(margin,margin,w-2*margin,h-2*margin);}
function layout(ctx,type,opt){
 const w=ctx.canvas.width,h=ctx.canvas.height,s=Math.min(w,h),rand=random(opt.seed),text=(opt.showCaption===false?'':String(opt.text??'VISUAL LAB')).slice(0,80);
 const old=scratch(ctx);
 let m=Math.max(2,Math.round(s*(.03+.085*(opt.margin??50)/100+.055*(opt.detail??.55))));
 const titleScale=.6+1.0*(opt.titleSize??50)/100;
 const titleY=((opt.titlePosition??50)-50)/100*h*.35;
 const userLabel=(context,caption,x,y,size,color,align,weight)=>{
  const content=String(caption??'');if(!content.trim())return;
  const baseline=Math.max(0,Math.min(h*.92,y+titleY));
  const lines=content.split('\n').slice(0,4);
  const spacing=Math.max(10,size*titleScale*1.07);
  lines.forEach((line,i)=>{if(baseline+i*spacing<h-8)label(context,line,x,baseline+i*spacing,size*titleScale,color,align,weight);});
 };
 ctx.save();switch(type){
 case 'receipt':{ctx.fillStyle='#eee9dc';ctx.fillRect(0,0,w,h);const pw=w*.66,xx=(w-pw)/2;ctx.fillStyle='#fffdf5';ctx.fillRect(xx,0,pw,h);ctx.save();ctx.beginPath();ctx.rect(xx+m, h*.12, pw-2*m,h*.52);ctx.clip();ctx.drawImage(old,xx+m,h*.12,pw-2*m,h*.52);ctx.restore();ctx.strokeStyle='#222';ctx.setLineDash([3,7]);ctx.strokeRect(xx+m,h*.12,pw-2*m,h*.52);ctx.setLineDash([]);label(ctx,'STUDIO  /  001',xx+m,h*.04,s*.023,'#181818');userLabel(ctx,text.toUpperCase(),xx+m,h*.73,s*.033,'#151515');label(ctx,'------------  ARCHIVE  ------------',xx+m,h*.84,s*.017,'#222');label(ctx,'TOTAL     0000.00',xx+m,h*.9,s*.02,'#222');break;}
 case 'ransom':{ctx.fillStyle='#17171a';ctx.globalAlpha=.8;ctx.fillRect(0,0,w,h);ctx.globalAlpha=1;ctx.drawImage(old,w*.05,h*.05,w*.9,h*.57);cutText(ctx,text,opt.seed,.65+titleScale*.45,.66+titleY/h);break;}
 case 'brand':{ctx.fillStyle='#e8e9e1';ctx.fillRect(0,0,w,h);ctx.drawImage(old,w*.32,0,w*.68,h);ctx.fillStyle='#151515';ctx.fillRect(0,0,w*.34,h);userLabel(ctx,text.toUpperCase(),w*.035,h*.12,s*.066,'#f1f0e8');label(ctx,'IDENTITY  STUDY',w*.035,h*.74,s*.023,'#c1c1c1');label(ctx,'VL / 26 — EDITION 01',w*.035,h*.86,s*.018,'#c1c1c1');break;}
 case 'magazine':{ctx.drawImage(old,0,0);ctx.fillStyle='rgba(0,0,0,.32)';ctx.fillRect(0,0,w,h*.23);userLabel(ctx,text.toUpperCase(),w*.055,h*.045,s*.09,'#fffaf0');label(ctx,'NO. 01   /   IMAGE CULTURE',w*.055,h*.85,s*.025);ctx.fillStyle='#f9f5e8';ctx.fillRect(w*.05,h*.8,w*.3,2);break;}
 case 'label':{ctx.fillStyle='#f8f7ed';ctx.fillRect(0,0,w,h);ctx.drawImage(old,w*.14,h*.22,w*.72,h*.54);ctx.strokeStyle='#191919';ctx.lineWidth=2;ctx.strokeRect(w*.08,h*.08,w*.84,h*.84);userLabel(ctx,text.toUpperCase(),w*.15,h*.1,s*.042,'#171717');label(ctx,'PROCESS / LAB / EDITION 01',w*.15,h*.81,s*.018,'#171717');break;}
 case 'matchbox':{ctx.fillStyle='#e0caa6';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#a5342b';ctx.lineWidth=Math.max(4,s*.024);ctx.strokeRect(m,m,w-m*2,h-m*2);ctx.strokeStyle='#25272a';ctx.lineWidth=2;ctx.strokeRect(m*1.25,m*1.25,w-m*2.5,h-m*2.5);ctx.save();ctx.beginPath();ctx.rect(m*2,h*.21,w-m*4,h*.54);ctx.clip();ctx.drawImage(old,m*2,h*.21,w-m*4,h*.54);ctx.restore();userLabel(ctx,text.toUpperCase(),w*.5,h*.08,s*.048,'#9c3129','center');label(ctx,'NO. 26  —  ORIGINAL DESIGN',w*.5,h*.84,s*.02,'#2c2a27','center');break;}
 case 'archive':{ctx.fillStyle='#e0dfcc';ctx.fillRect(0,0,w,h);ctx.drawImage(old,w*.035,h*.08,w*.93,h*.75);label(ctx,'ARCHIVE   //   1968',w*.055,h*.02,s*.026,'#222');userLabel(ctx,'DOCUMENT  /  '+text.toUpperCase().slice(0,16),w*.055,h*.86,s*.024,'#222');break;}
 case 'retro':{ctx.fillStyle='#c4c7bf';ctx.fillRect(0,0,w,h);ctx.fillStyle='#0808a5';ctx.fillRect(m,m,w-2*m,h*.095);userLabel(ctx,text.toUpperCase(),m*1.4,m*1.35,s*.031,'#fff');ctx.fillStyle='#edece4';ctx.fillRect(m,h*.16,w-2*m,h*.78);ctx.drawImage(old,m*1.7,h*.24,w-3.4*m,h*.52);label(ctx,'[ HOME ]  [ ARCHIVE ]  [ LINKS ]',m*1.7,h*.8,s*.022,'#081299');break;}
 case 'webcore':{ctx.fillStyle='#c1c1b8';ctx.fillRect(0,0,w,h);ctx.save();ctx.translate(w*.09,h*.11);ctx.rotate(-.075);ctx.drawImage(old,0,0,w*.73,h*.65);ctx.restore();ctx.fillStyle='#1c1cbd';ctx.fillRect(w*.46,h*.48,w*.47,h*.39);label(ctx,'WINDOW_01.EXE',w*.49,h*.5,s*.024,'#fff');userLabel(ctx,text.toUpperCase(),w*.49,h*.72,s*.037,'#e5e5dd');break;}
 case 'y2k':{ctx.fillStyle='#12151e';ctx.fillRect(0,0,w,h);ctx.drawImage(old,w*.1,h*.12,w*.8,h*.63);ctx.strokeStyle='#d2eaf0';ctx.lineWidth=s*.018;ctx.strokeRect(w*.08,h*.1,w*.84,h*.68);userLabel(ctx,text.toUpperCase(),w*.5,h*.82,s*.057,'#d6ebf7','center');break;}
 case 'specimen':{ctx.fillStyle='#e8e6df';ctx.fillRect(0,0,w,h);ctx.drawImage(old,w*.13,h*.17,w*.75,h*.67);ctx.strokeStyle='#141414';ctx.lineWidth=1;ctx.strokeRect(w*.12,h*.16,w*.77,h*.69);label(ctx,'FIG. 001 / VISUAL RESEARCH',w*.12,h*.06,s*.022,'#141414');userLabel(ctx,text.toUpperCase(),w*.12,h*.88,s*.03,'#141414');break;}
 case 'brutal':{ctx.fillStyle='#eee';ctx.fillRect(0,0,w,h);ctx.drawImage(old,w*.28,0,w*.72,h*.72);ctx.fillStyle='#080808';ctx.fillRect(0,0,w*.31,h);userLabel(ctx,text.toUpperCase(),w*.035,h*.18,s*.045,'#fff');label(ctx,'NO. 77 — FORM / FUNCTION',w*.34,h*.82,s*.024,'#050505');break;}
 case 'acid':{ctx.fillStyle='#d2fd27';ctx.fillRect(0,0,w,h);ctx.drawImage(old,w*.09,h*.1,w*.82,h*.76);ctx.fillStyle='#111';ctx.fillRect(0,h*.82,w,h*.18);userLabel(ctx,text.toUpperCase(),w*.05,h*.85,s*.055,'#d2fd27');break;}
 case 'sticker':{ctx.fillStyle='#aaa39b';ctx.fillRect(0,0,w,h);for(let i=0;i<9;i++){const x=rand()*w*.78,y=rand()*h*.7;ctx.save();ctx.translate(x,y);ctx.rotate(rand()-.5);ctx.fillStyle=['#f6eee8','#e3fd31','#ee745c','#c5ddfd'][i%4];ctx.fillRect(0,0,w*.26,h*.28);ctx.restore();}ctx.save();ctx.shadowColor='#0009';ctx.shadowBlur=20;ctx.shadowOffsetY=6;ctx.fillStyle='#fff';ctx.fillRect(w*.09,h*.09,w*.72,h*.72);ctx.restore();ctx.drawImage(old,w*.115,h*.12,w*.67,h*.66);break;}
 case 'editorial':{ctx.fillStyle='#f3eee5';ctx.fillRect(0,0,w,h);ctx.save();ctx.translate(w*.5,h*.44);ctx.rotate(-.055);ctx.drawImage(old,-w*.33,-h*.32,w*.66,h*.64);ctx.restore();userLabel(ctx,text.toUpperCase(),w*.07,h*.83,s*.058,'#201c19');label(ctx,'GRAPHIC STUDIES / VOL. 01',w*.07,h*.06,s*.018,'#201c19');break;}
 case 'swiss':{ctx.fillStyle='#eeece7';ctx.fillRect(0,0,w,h);ctx.drawImage(old,w*.38,0,w*.62,h*.85);ctx.fillStyle='#e32820';ctx.fillRect(w*.08,h*.1,w*.055,h*.65);userLabel(ctx,text.toUpperCase(),w*.2,h*.23,s*.046,'#111');label(ctx,'VISUAL SYSTEMS',w*.2,h*.82,s*.023,'#111');break;}
 case 'screenprint':{ctx.fillStyle='#f3ecd4';ctx.fillRect(0,0,w,h);ctx.drawImage(old,w*.13,h*.16,w*.74,h*.67);ctx.globalCompositeOperation='multiply';ctx.fillStyle='#b94529';ctx.fillRect(w*.09,h*.68,w*.7,h*.1);ctx.globalCompositeOperation='source-over';userLabel(ctx,text.toUpperCase(),w*.14,h*.06,s*.041,'#1c3d59');break;}
 }ctx.restore();}
function mosaic(ctx,size=14,raised=false){const w=ctx.canvas.width,h=ctx.canvas.height,im=ctx.getImageData(0,0,w,h),d=im.data;const cs=Math.max(6,Math.round(size));ctx.fillStyle=raised?'#25282d':'#1e2224';ctx.fillRect(0,0,w,h);for(let y=0;y<h;y+=cs)for(let x=0;x<w;x+=cs){const i=(Math.min(h-1,y+cs/2|0)*w+Math.min(w-1,x+cs/2|0))*4,r=d[i],g=d[i+1],b=d[i+2];ctx.fillStyle=`rgb(${r},${g},${b})`;ctx.fillRect(x+1,y+1,cs-2,cs-2);if(raised){ctx.fillStyle='rgba(255,255,255,.33)';ctx.beginPath();ctx.ellipse(x+cs*.5,y+cs*.45,cs*.25,cs*.25,0,0,TAU);ctx.fill();ctx.strokeStyle='rgba(0,0,0,.2)';ctx.stroke();}}}
function distortion(ctx,amt=10,mode='wave',seed=33){const w=ctx.canvas.width,h=ctx.canvas.height,im=ctx.getImageData(0,0,w,h),d=im.data,out=new Uint8ClampedArray(d),rand=random(seed);const steps=new Float32Array(h);for(let y=0;y<h;y++)steps[y]=mode==='wave'?Math.sin(y*.045+seed)*amt:mode==='glass'?Math.sin(y*.07)*amt+Math.sin(y*.015)*amt*.5:(rand()-.5)*amt*2;for(let y=0;y<h;y++)for(let x=0;x<w;x++){let dx=mode==='lens'?Math.sin(x*.022)*amt:steps[y];const sx=clamp(Math.round(x+dx),0,w-1),si=(y*w+sx)*4,di=(y*w+x)*4;out[di]=d[si];out[di+1]=d[si+1];out[di+2]=d[si+2];}im.data.set(out);ctx.putImageData(im,0,0);}
function rings(ctx,amt=10,seed=7,type='circles'){const w=ctx.canvas.width,h=ctx.canvas.height,rand=random(seed);ctx.save();for(let i=0;i<amt;i++){const x=rand()*w,y=rand()*h,r=(4+rand()*23)*Math.min(w,h)/500;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.lineWidth=type==='culture'?2:1.1;ctx.strokeStyle=type==='culture'?`rgba(240,245,190,${.12+rand()*.4})`:`rgba(230,240,250,${.07+rand()*.35})`;ctx.stroke();if(type==='culture'){ctx.beginPath();ctx.arc(x,y,r*.29,0,TAU);ctx.fillStyle='rgba(215,246,173,.24)';ctx.fill();}}ctx.restore();}
function fibers(ctx,amt=100,seed=5){const w=ctx.canvas.width,h=ctx.canvas.height,rand=random(seed);ctx.save();ctx.strokeStyle='rgba(240,240,235,.16)';for(let i=0;i<amt;i++){let x=rand()*w,y=rand()*h;ctx.lineWidth=.4+rand();ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+rand()*30-15,y+rand()*13-6);ctx.stroke();}ctx.restore();}
function marginLabel(ctx,preset,text){const w=ctx.canvas.width,h=ctx.canvas.height,cs=Math.min(w,h);ctx.save();ctx.fillStyle='rgba(0,0,0,.72)';ctx.fillRect(0,h-cs*.1,w,cs*.1);userLabel(ctx,text.toUpperCase().slice(0,21),cs*.03,h-cs*.077,cs*.033,'#f3f3f0');ctx.restore();}
function borderLine(ctx,ink='#fff',margin=.045){const w=ctx.canvas.width,h=ctx.canvas.height;ctx.strokeStyle=ink;ctx.lineWidth=Math.max(1,w*.002);ctx.strokeRect(w*margin,h*margin,w*(1-2*margin),h*(1-2*margin));}

/** Sort threshold-selected luminance runs in the image, without moving pixels outside each run. */
function pixelSort(ctx,level=120,maxRun=64,axis='horizontal'){
 const w=ctx.canvas.width,h=ctx.canvas.height,image=ctx.getImageData(0,0,w,h),d=image.data;
 const along=axis==='vertical'?h:w,across=axis==='vertical'?w:h;
 const index=(row,col)=>axis==='vertical'?(col*w+row)*4:(row*w+col)*4;
 const lum=(i)=>luma(d[i],d[i+1],d[i+2]);
 for(let row=0;row<across;row++){
  let col=0;
  while(col<along){
   const st=index(row,col);
   if(lum(st)<level){col++;continue;}
   const run=[];
   while(col<along&&run.length<maxRun){const i=index(row,col);if(lum(i)<level)break;
    run.push([d[i],d[i+1],d[i+2],d[i+3]]);col++;
   }
   if(run.length<2)continue;
   run.sort((a,b)=>luma(a[0],a[1],a[2])-luma(b[0],b[1],b[2]));
   const begin=col-run.length;
   for(let j=0;j<run.length;j++){const target=index(row,begin+j);for(let c=0;c<4;c++)d[target+c]=run[j][c];}
  }
 }
 ctx.putImageData(image,0,0);
}
/** Directional height-map shading preserves the material's original posterized colors. */
function relief(ctx,depth=1.8){
 const w=ctx.canvas.width,h=ctx.canvas.height,im=ctx.getImageData(0,0,w,h),d=im.data,out=new Uint8ClampedArray(d);
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
   const i=(y*w+x)*4,il=i-4,ir=i+4,iu=i-w*4,id=i+w*4;
   const dx=(luma(d[il],d[il+1],d[il+2])-luma(d[ir],d[ir+1],d[ir+2]))/255;
   const dy=(luma(d[iu],d[iu+1],d[iu+2])-luma(d[id],d[id+1],d[id+2]))/255;
   const light=clamp((dx+dy)*depth*86,-65,65);
   for(let c=0;c<3;c++)out[i+c]=clamp(d[i+c]+light);
 }
 im.data.set(out);ctx.putImageData(im,0,0);
}
/** Sharpness and grain are deliberately neutral at the default positions. */
function finishDetail(ctx,value){
 if(value<.53) blur(ctx,Math.max(.5,(.55-value)*10),.6);
 else if(value>.57){relief(ctx,(value-.55)*4);brightness(ctx,1+(value-.55)*.12);}
}
function finishGrain(ctx,value,seed){
 if(value<.38)blur(ctx,Math.max(.4,(.4-value)*5),.26);
 else if(value>.42)noise(ctx,(value-.4)*68,seed+917,true);
}
function finishTone(ctx,value){
 const change=value-.45;
 if(Math.abs(change)>.02)brightness(ctx,1+change*.5,change*33);
}

/** Unicode Braille: each 2x4 sample maps to the real eight-dot bit layout. */
function braille(ctx,scale=3,contrast=.5,ink='#d8ffd7'){
 const w=ctx.canvas.width,h=ctx.canvas.height,src=ctx.getImageData(0,0,w,h).data;
 const sx=Math.max(1,Math.round(scale*.48)),sy=Math.max(1,Math.round(scale*.48));
 const cw=sx*2,ch=sy*4;const bits=[1,8,2,16,4,32,64,128];
 ctx.fillStyle='#0c211b';ctx.fillRect(0,0,w,h);ctx.fillStyle=ink;
 ctx.textBaseline='top';ctx.textAlign='left';ctx.font=`${Math.round(ch*1.15)}px monospace`;
 for(let y=0;y<h;y+=ch)for(let x=0;x<w;x+=cw){let value=0,light=0;
  for(let py=0;py<4;py++)for(let px=0;px<2;px++){
   const xx=Math.min(w-1,x+Math.round((px+.5)*sx)),yy=Math.min(h-1,y+Math.round((py+.5)*sy)),i=(yy*w+xx)*4;
   const brightness=luma(src[i],src[i+1],src[i+2]);light+=brightness;
   if(brightness>110+contrast*46+(px+py%2-1)*8)value|=bits[px*4+py];
  }
  if(value){ctx.globalAlpha=.45+.55*(light/8/255);ctx.fillText(String.fromCharCode(0x2800+value),x,y);}
 }
 ctx.globalAlpha=1;
}
/** Image-driven branching cell growth (artistic simulation, not microscopy). */
function culture(ctx,density=.5,grain=.5,seed=17){
 const w=ctx.canvas.width,h=ctx.canvas.height,src=ctx.getImageData(0,0,w,h).data;
 const rand=random(seed+611),count=Math.max(25,Math.floor(w*h/680*(.35+density*1.3)));
 ctx.save();ctx.globalCompositeOperation='screen';
 for(let i=0;i<count;i++){
  let x=rand()*w,y=rand()*h;const at=(Math.floor(y)*w+Math.floor(x))*4;
  const brightness=luma(src[at],src[at+1],src[at+2]);
  if(rand()>.12+(brightness/255)*.75)continue;
  const rad=(1.5+rand()*7+grain*9)*Math.min(w,h)/240;
  let theta=rand()*TAU;
  ctx.strokeStyle=`rgba(${Math.round(112+brightness*.45)},${Math.round(179+brightness*.22)},100,${.15+rand()*.3})`;
  ctx.lineWidth=Math.max(.6,rad*.13);ctx.beginPath();ctx.arc(x,y,rad,0,TAU);ctx.stroke();
  for(let branch=0;branch<3+Math.floor(rand()*4);branch++){
   theta+=rand()*1.3;
   ctx.beginPath();ctx.moveTo(x,y);
   const reach=rad*(.8+rand()*2.1);
   ctx.quadraticCurveTo(x+Math.cos(theta+.6)*reach*.6,y+Math.sin(theta+.6)*reach*.6,x+Math.cos(theta)*reach,y+Math.sin(theta)*reach);ctx.stroke();
  }
  ctx.fillStyle=`rgba(232,246,160,${.17+rand()*.4})`;ctx.beginPath();ctx.arc(x,y,rad*.27,0,TAU);ctx.fill();
 }
 ctx.restore();
}
function glitchBlocks(ctx,seed=4,amount=18,block=12){
 const w=ctx.canvas.width,h=ctx.canvas.height,old=scratch(ctx),r=random(seed);
 for(let i=0;i<amount;i++){
  const x=Math.floor(r()*w),y=Math.floor(r()*h),ww=Math.max(3,Math.floor(block*(1+r()*5))),hh=Math.max(3,Math.floor(block*(.3+r())));
  const sx=Math.min(w-1,Math.max(0,x)),sy=Math.min(h-1,Math.max(0,y));
  const dx=Math.floor((r()-.5)*block*13),dy=Math.floor((r()-.5)*block*.5);
  ctx.drawImage(old,sx,sy,Math.min(ww,w-sx),Math.min(hh,h-sy),sx+dx,sy+dy,Math.min(ww,w-sx),Math.min(hh,h-sy));
  if(i%3===0){ctx.fillStyle=`rgba(${r()>.5?'255,45,139':'24,246,255'},.7)`;ctx.fillRect(sx,sy,Math.min(ww,w-sx),Math.min(2+block*.12,h-sy));}
 }
}
function bubbleLenses(ctx,seed=7,cellSize=90){
 const w=ctx.canvas.width,h=ctx.canvas.height,old=scratch(ctx),r=random(seed);
 const step=Math.max(34,cellSize),radius=step*.43;
 ctx.save();
 for(let y=step*.36;y<h+step;y+=step)for(let x=step*.36;x<w+step;x+=step){
  const cx=x+(r()-.5)*step*.32,cy=y+(r()-.5)*step*.32,rr=radius*(.7+r()*.35);
  ctx.save();ctx.beginPath();ctx.arc(cx,cy,rr,0,TAU);ctx.clip();
  const zoom=1.25+r()*.18;
  const sx=Math.max(0,cx-rr*zoom),sy=Math.max(0,cy-rr*zoom);
  const sw=Math.max(1,Math.min(w-sx,rr*2*zoom)),sh=Math.max(1,Math.min(h-sy,rr*2*zoom));
  ctx.drawImage(old,sx,sy,sw,sh,cx-rr,cy-rr,rr*2,rr*2);
  ctx.restore();
  const grad=ctx.createRadialGradient(cx-rr*.3,cy-rr*.35,rr*.05,cx,cy,rr);
  grad.addColorStop(0,'rgba(255,255,255,.24)');grad.addColorStop(.68,'rgba(255,255,255,0)');grad.addColorStop(.95,'rgba(245,255,255,.25)');grad.addColorStop(1,'rgba(248,255,255,.65)');
  ctx.fillStyle=grad;ctx.beginPath();ctx.arc(cx,cy,rr,0,TAU);ctx.fill();
  ctx.strokeStyle='rgba(249,255,255,.65)';ctx.lineWidth=Math.max(1,rr*.046);ctx.stroke();
 }
 ctx.restore();
}
function smearLens(ctx,rad=12,strength=.5){
 const w=ctx.canvas.width,h=ctx.canvas.height,old=scratch(ctx);
 ctx.save();ctx.globalAlpha=.18+strength*.6;
 for(let j=0;j<7;j++){
  const t=(j-3)/3;
  ctx.filter=`blur(${Math.max(1,rad*.12)}px)`;
  ctx.drawImage(old,t*rad*2.7,-t*rad*.65,w,h);
 }
 ctx.restore();
}
/** @param {ImageData} source @param {{number:number,detail:number,texture:number,variation:number,intensity:number,seed:number,text:string}} opt */
export function renderImage(source,opt){
 const w=source.width,h=source.height;
 const strength=clamp(opt.intensity??100,0,100)/100;
 // Intensity zero is a byte-for-byte copy, including transparent pixels.
 if(strength===0)return new ImageData(new Uint8ClampedArray(source.data),w,h);
 const canvas=makeCanvas(w,h),ctx=context(canvas);
 ctx.putImageData(source,0,0);
 const n=opt.number,detail=(opt.detail??55)/100,texture=(opt.texture??40)/100,variation=(opt.variation??45)/100,seed=opt.seed??17,text=opt.showCaption===false?'':String(opt.text??'VISUAL LAB'),s=Math.min(w,h),scale=Math.max(3,Math.round((1-detail)*s*.045+3));const rand=random(seed+n*37);
 switch(n){
 // TYPOGRAPHY
 case 1:brightness(ctx,.65+variation*1.1,0);ascii(ctx,Math.max(6,scale),texture>.67?'@#%8&o*+=-:. ':texture>.3?'@#8&o:*,.  ':'@#*:.  ','#e5fbf5','#071014','bold');break;
 case 2:brightness(ctx,.8+variation*.7,0);ascii(ctx,scale,texture>.5?'█▓▒░  ':'█▒░  ','#eff4f2','#0b0d13','bold');pixelate(ctx,Math.max(2,scale*.4));break;
 case 3:brightness(ctx,.7+variation*.7,0);braille(ctx,Math.max(2,scale*.75),texture,'#c4fadd');break;
 case 4:ascii(ctx,Math.max(5,scale*.65),'MOTION0123456789-','rgba(255,255,255,.9)','#18231d');lines(ctx,scale*.9,.15);break;
 case 5:dither(ctx,'atkinson',30);layout(ctx,'receipt',{...opt,detail});paper(ctx,25*texture,seed);break;
 case 6:poster(ctx,4);layout(ctx,'ransom',{...opt,detail});noise(ctx,28*texture,seed);break;
 case 7:poster(ctx,5);layout(ctx,'brand',{...opt,detail});break;
 case 8:brightness(ctx,1.18,-10);layout(ctx,'magazine',{...opt,detail});break;
 case 9:dither(ctx,'bayer',30);layout(ctx,'label',{...opt,detail});paper(ctx,13*texture,seed);break;
 case 10:tone(ctx,[38,58,47],[193,112,63]);poster(ctx,5);layout(ctx,'matchbox',{...opt,detail});paper(ctx,19*texture,seed);break;
 // PIXELS & RASTER
 case 11:pixelate(ctx,Math.max(1,Math.round(scale*.85)));noise(ctx,texture*24,seed,true);threshold(ctx,65+variation*150);break;
 case 12:pixelate(ctx,Math.max(1,Math.round(scale*1.7)));dither(ctx,'bayer',10+texture*80,105+variation*65);break;
 case 13:pixelate(ctx,Math.max(1,Math.round(scale*.35)));noise(ctx,texture*32,seed,true);dither(ctx,'floyd',0,100+variation*80);break;
 case 14:pixelate(ctx,Math.max(1,Math.round(scale*.35)));noise(ctx,texture*30,seed,true);dither(ctx,'atkinson',0,95+variation*100);tone(ctx,[12,24,34],[228,228,213]);break;
 case 15:pixelate(ctx,Math.max(4,scale*1.8),variation>.55);poster(ctx,3+Math.round(texture*5));break;
 case 16:poster(ctx,2+Math.round(detail*7));brightness(ctx,1+texture*.6,-20*variation);break;
 case 17:brightness(ctx,.75+texture*.65);halftone(ctx,Math.max(4,scale*1.6),variation*1.3,'#171a1c','#f0e9d9');break;
 case 18:poster(ctx,4,[[19,54,78],[235,73,54],[242,206,120],[237,232,208]]);noise(ctx,texture*30,seed);shiftRGB(ctx,Math.round(variation*4+1));break;
 case 19:brightness(ctx,.72+texture*.75);dither(ctx,'bayer',50);halftone(ctx,Math.max(3,scale),.55,'#163650','#eee8d7',.9);lines(ctx,scale*2,.07+texture*.46,'210,51,44');shiftRGB(ctx,1+variation*7);break;
 case 20:pixelSort(ctx,40+texture*115,Math.floor(22+detail*290),variation>.55?'vertical':'horizontal');offsetSlices(ctx,Math.floor(5+variation*15),scale*3,seed);break;
 case 21:mosaic(ctx,scale*1.8);noise(ctx,texture*26,seed,true);shiftRGB(ctx,variation*2);break;
 case 22:mosaic(ctx,scale*2.2,true);noise(ctx,texture*19,seed,true);shiftRGB(ctx,variation*2);vignette(ctx,.12);break;
 case 23:pixelate(ctx,Math.max(4,scale),false);lines(ctx,Math.max(3,scale*.55),.3,'11,13,20');offsetSlices(ctx,15+Math.floor(texture*15),scale*3,seed);shiftRGB(ctx,variation*3);break;
 // VIDEO & ANALOG
 case 24:shiftRGB(ctx,1+variation*10);lines(ctx,Math.max(3,scale*.5),.36);bloom(ctx,2+detail*5,.33);vignette(ctx,.6);break;
 case 25:monochrome(ctx,[255,135,206],[18,0,22],.8);bloom(ctx,scale*.45,.62);lines(ctx,scale*.6,.17);break;
 case 26:monochrome(ctx,[115,255,142],[0,21,9],.85);bloom(ctx,scale*.35,.5);lines(ctx,Math.max(2,scale*.75),.2);break;
 case 27:monochrome(ctx,[255,184,64],[19,12,0],1.05);bloom(ctx,5,.38);lines(ctx,5,.26);break;
 case 28:distortion(ctx,Math.max(2,scale*variation),'wave',seed);shiftRGB(ctx,Math.round(scale*.4));lines(ctx,4,.23);noise(ctx,28*texture,seed);ctx.fillStyle='rgba(245,244,238,.25)';ctx.fillRect(0,h*.89,w,h*.04);break;
 case 29:brightness(ctx,.9,15);noise(ctx,120*texture,seed);shiftRGB(ctx,4);lines(ctx,2,.34);break;
 case 30:distortion(ctx,scale*3,'random',seed);lines(ctx,Math.max(3,scale),.37);shiftRGB(ctx,variation*5);break;
 case 31:shiftRGB(ctx,Math.max(8,Math.round(scale*(1.5+variation*2.2))));brightness(ctx,1.13,-7);break;
 case 32:pixelate(ctx,Math.max(4,scale*.9));smearLens(ctx,Math.max(12,scale*4),.67);poster(ctx,7);offsetSlices(ctx,Math.floor(18+detail*28),scale*4,seed);shiftRGB(ctx,Math.max(5,scale*1.8));break;
 case 33:glitchBlocks(ctx,seed+3,Math.floor(18+texture*85),Math.max(6,scale*2));shiftRGB(ctx,variation*12+3);break;
 case 34:brightness(ctx,.85,24);tone(ctx,[49,62,73],[245,219,169]);frame(ctx,Math.round(s*.09),'#f3eade','#f3eade');paper(ctx,14*texture,seed);break;
 case 35:brightness(ctx,1.08,-5);noise(ctx,50*texture,seed);vignette(ctx,.55);bloom(ctx,5,.2);break;
 case 36:brightness(ctx,1.25,-12);tone(ctx,[12,32,49],[239,174,122]);vignette(ctx,.42);noise(ctx,16*texture,seed);ctx.fillStyle='#050506';ctx.fillRect(0,0,w,h*.065);ctx.fillRect(0,h*.935,w,h*.065);break;
 case 37:monochrome(ctx,[231,221,193],[34,36,32]);poster(ctx,6);layout(ctx,'archive',{...opt,detail});noise(ctx,45*texture,seed);for(let i=0;i<11;i++){const x=rand()*w;ctx.fillStyle=`rgba(250,243,220,${.06+rand()*.2})`;ctx.fillRect(x,0,1+rand()*2,h);}break;
 case 38:tone(ctx,[67,35,69],[243,167,100]);gradient(ctx,['#c74418','#171b4e','#efa869'],.3);vignette(ctx,.55);noise(ctx,42*texture,seed);break;
 // MATERIAL
 case 39:pixelate(ctx,Math.max(2,Math.round(scale*.75)));poster(ctx,5,[[45,59,71],[112,130,137],[185,168,160],[228,196,176],[247,220,192]]);relief(ctx,2+variation*10);blur(ctx,scale*.18,.3);brightness(ctx,.89+variation*.24);bloom(ctx,3,.27);break;
 case 40:pixelate(ctx,Math.max(2,Math.round(scale*.55)));poster(ctx,5,[[26,35,46],[74,89,103],[145,151,140],[210,188,154],[238,217,187]]);relief(ctx,2+variation*10);offsetSlices(ctx,Math.floor(7+detail*35),scale*(.7+variation*1.3),seed);brightness(ctx,.88+variation*.24);paper(ctx,28*texture,seed);break;
 case 41:poster(ctx,3+Math.round(detail*5),[[19,29,51],[73,97,117],[139,156,148],[210,190,157],[250,236,208]]);relief(ctx,2+variation*4);let os=scratch(ctx);ctx.shadowColor='#0a0b11';ctx.shadowBlur=scale*2;ctx.shadowOffsetX=scale*(.2+variation);ctx.shadowOffsetY=scale*(.2+variation);ctx.globalAlpha=.42;ctx.drawImage(os,0,0);ctx.globalAlpha=1;ctx.shadowColor='transparent';break;
 case 42:distortion(ctx,scale*variation*1.2+2,'glass',seed);bloom(ctx,Math.max(2,scale*.6),.34);rings(ctx,20+detail*20,seed);break;
 case 43:bubbleLenses(ctx,seed,Math.max(34,scale*(2.5+detail*4+variation*5)));bloom(ctx,scale*.6,.26);break;
 case 44:monochrome(ctx,[234,224,199],[36,41,51]);relief(ctx,2+detail*15);brightness(ctx,.81+detail*.36);gradient(ctx,['#252631','#e4d9ad','#555b68'],.5);break;
 case 45:poster(ctx,6,[[17,24,34],[78,87,99],[199,204,205],[248,248,246],[110,120,132],[20,30,41]]);distortion(ctx,scale,'wave',seed);bloom(ctx,3,.3);break;
 case 46:threshold(ctx,85+detail*50+variation*45,[10,16,20],[233,224,199]);blur(ctx,1+scale*.3,.21);paper(ctx,30*texture,seed);break;
 case 47:distortion(ctx,scale*.7,'glass',seed);for(let i=0;i<17;i++){ctx.strokeStyle=`rgba(255,255,255,${rand()*.25})`;ctx.lineWidth=.8+rand()*3;ctx.beginPath();ctx.moveTo(rand()*w,0);ctx.bezierCurveTo(rand()*w,rand()*h,rand()*w,rand()*h,rand()*w,h);ctx.stroke();}break;
 case 48:threshold(ctx,105+variation*100,[14,15,17],[246,240,227]);noise(ctx,90*texture,seed);offsetSlices(ctx,7,scale,seed);break;
 case 49:poster(ctx,6);for(let x=0;x<w;x+=Math.max(3,scale*.33)){ctx.fillStyle='rgba(255,252,232,.12)';ctx.fillRect(x,0,Math.max(1,scale*.1),h);}lines(ctx,Math.max(3,scale*.33),.22,'20,25,31');paper(ctx,12*texture,seed);break;
 case 50:threshold(ctx,115,[29,32,34],[240,222,182]);lines(ctx,Math.max(2,scale*(.28+.4*detail)),.3,'28,34,40');relief(ctx,2+detail*3);break;
 // LIGHT
 case 51:brightness(ctx,.62+detail*.27,27);tone(ctx,[105,91,94],[249,227,209]);blur(ctx,5+scale*.9,.55);bloom(ctx,13+scale,.48);break;
 case 52:brightness(ctx,.86,4);gradient(ctx,['#ff815f','#e35acf','#172fae','#62cdea'],.52);bloom(ctx,6+scale,.37);noise(ctx,45*texture,seed);for(let i=0;i<100*detail;i++){ctx.fillStyle=`rgba(240,184,216,${rand()*.12})`;ctx.beginPath();ctx.arc(rand()*w,rand()*h,rand()*scale,0,TAU);ctx.fill();}break;
 case 53:{const x=w*(.2+variation*.6),y=h*.44,g=ctx.createRadialGradient(x,y,s*.018,x,y,s*(.21+detail*.55));g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.55,'rgba(0,0,0,.38)');g.addColorStop(1,`rgba(0,0,0,${.85+texture*.15})`);ctx.fillStyle=g;ctx.fillRect(0,0,w,h);break;}
 case 54:bloom(ctx,scale*1.7,.58+texture*.25);brightness(ctx,.96,8);break;
 case 55:poster(ctx,12);gradient(ctx,['#481c45','#b58d61','#365873','#b7707d'],.4+texture*.3);noise(ctx,85*texture,seed);vignette(ctx,.25);break;
 case 56:brightness(ctx,.87,19);gradient(ctx,['#d8c4da','#ffd8ac','#9ebad9'],.62,'radial');blur(ctx,scale*3,.24);vignette(ctx,.16);noise(ctx,13*texture,seed,true);break;
 case 57:gradient(ctx,['#06323d','#5fc1af','#f7e9b0','#24465a'],.3);for(let y=0;y<h;y+=Math.max(6,scale*2)){ctx.strokeStyle='rgba(245,246,212,.17)';ctx.lineWidth=2;ctx.beginPath();for(let x=0;x<w;x+=7)ctx.lineTo(x,y+Math.sin(x*.022+y*.01)*scale*.8);ctx.stroke();}break;
 case 58:shiftRGB(ctx,Math.max(2,scale*variation));vignette(ctx,.17);break;
 case 59:smearLens(ctx,Math.max(9,scale*2.7),.28+variation*.65);vignette(ctx,.18);break;
 case 60:brightness(ctx,.7,62);tone(ctx,[112,128,145],[255,247,237]);bloom(ctx,scale*1.6,.59);for(let i=0;i<13;i++){const x=rand()*w,y=rand()*h;ctx.strokeStyle='rgba(255,255,252,.7)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x-scale,y);ctx.lineTo(x+scale,y);ctx.moveTo(x,y-scale);ctx.lineTo(x,y+scale);ctx.stroke();}break;
 case 61:threshold(ctx,100+variation*80,[8,16,32],[245,182,101]);bloom(ctx,scale*.9,.5);vignette(ctx,.4);break;
 case 62:monochrome(ctx,[92,246,129],[3,29,7]);noise(ctx,35*texture,seed);vignette(ctx,.75);lines(ctx,Math.max(3,scale*.4),.2);ctx.strokeStyle='rgba(182,255,193,.65)';ctx.beginPath();ctx.arc(w*.5,h*.5,s*.28,0,TAU);ctx.stroke();break;
 // ORGANIC
 case 63:poster(ctx,5,[[10,29,54],[19,73,91],[94,153,161],[161,95,133],[244,153,187]]);edgeImage(ctx,.85,[137,244,238],[20,44,67]);rings(ctx,Math.floor(40+detail*85),seed,'culture');bloom(ctx,scale*.5,.29);break;
 case 64:poster(ctx,5,[[20,28,26],[37,67,49],[70,107,61],[148,151,87],[210,191,119]]);culture(ctx,detail,texture,seed);noise(ctx,38*texture,seed);break;
 case 65:poster(ctx,6);blobs(ctx,80+variation*100,Math.max(4,scale*.9),'#9ff3e3');break;
 case 66:poster(ctx,9,[[13,31,44],[25,62,71],[54,95,88],[141,153,120],[242,217,168]]);brightness(ctx,.85+detail*.3);boundary(ctx,Math.max(15,Math.round((1-detail)*42)),'rgba(245,230,188,.76)',1.4,true);break;
 case 67:boundary(ctx,18+variation*38,'#ecede8',Math.max(1,detail*2));break;
 case 68:poster(ctx,8,[[7,21,68],[9,58,134],[26,139,166],[231,226,70],[241,92,37],[162,14,38]]);blur(ctx,1.5,.24);break;
 case 69:monochrome(ctx,[164,238,255],[0,4,23],.58);edgeImage(ctx,1.6,[212,244,255],[13,44,79]);bloom(ctx,6,.42);break;
 case 70:tone(ctx,[13,39,90],[206,231,235],1.15);paper(ctx,26*texture,seed);break;
 case 71:pixels(ctx,(r,g,b)=>{const a=luma(r,g,b),k=128+variation*85;return a>k?[255-r,255-g,255-b]:[r,g,b]});brightness(ctx,1.18);break;
 case 72:edgeImage(ctx,1.7,[117,237,208],[4,26,29]);ctx.strokeStyle='rgba(117,237,208,.3)';ctx.lineWidth=1.3;for(let i=1;i<7;i++){ctx.beginPath();ctx.arc(w*.5,h*.5,i*s*.095,0,TAU);ctx.stroke();}break;
 // WEB / POSTER COMPOSITIONS
 case 73:pixelate(ctx,Math.max(3,scale*.7));layout(ctx,'retro',{...opt,detail});break;
 case 74:poster(ctx,8);layout(ctx,'webcore',{...opt,detail});noise(ctx,20*texture,seed);break;
 case 75:tone(ctx,[45,64,80],[226,226,227]);layout(ctx,'y2k',{...opt,detail});bloom(ctx,3,.25);break;
 case 76:monochrome(ctx,[226,223,210],[58,66,67]);layout(ctx,'specimen',{...opt,detail});break;
 case 77:threshold(ctx,95+variation*90);layout(ctx,'brutal',{...opt,detail});break;
 case 78:poster(ctx,4,[[12,18,21],[244,88,53],[243,236,19],[71,241,170]]);layout(ctx,'acid',{...opt,detail});break;
 case 79:poster(ctx,6);layout(ctx,'sticker',{...opt,detail});break;
 case 80:brightness(ctx,1.2,-22);layout(ctx,'editorial',{...opt,detail});paper(ctx,27*texture,seed);break;
 case 81:tone(ctx,[40,51,53],[230,209,191]);layout(ctx,'swiss',{...opt,detail});break;
 case 82:poster(ctx,4,[[25,60,79],[226,82,49],[235,188,123],[248,236,204]]);layout(ctx,'screenprint',{...opt,detail});paper(ctx,40*texture,seed);break;
 default:throw new Error(`Preset ${n} is not implemented`);
 }
 // Technique-specific adjustments are primary; fallback controls still have honest, visible effects.
 if(CONTROL_FALLBACKS.detail.has(n))finishDetail(ctx,detail);
 if(CONTROL_FALLBACKS.texture.has(n))finishGrain(ctx,texture,seed);
 if(CONTROL_FALLBACKS.variation.has(n))finishTone(ctx,variation);
 // Variance control always acts on results through recipe-specific geometry + a subtle finish.
 if(n>0 && ![5,6,10,37,80,82].includes(n) && texture>.3 && texture<.9 && [11,12,13,14,16,17,21,22,31,53,65,67,71].indexOf(n)<0) noise(ctx,texture*8,seed+33,true);
  // Flatten only accidental alpha introduced by effects on originally opaque photographs.
  // Optional transparency preserves the source's original silhouette.
  const result=ctx.getImageData(0,0,w,h),out=result.data,origin=source.data;
  for(let i=0;i<out.length;i+=4){
   if(origin[i+3]===255 && out[i+3]<255){const a=out[i+3]/255;
    for(let c=0;c<3;c++)out[i+c]=mix(origin[i+c],out[i+c],a);
    out[i+3]=255;
   }
   if(opt.transparentBackground){out[i+3]=Math.min(origin[i+3],out[i+3]);}
   if(strength<1){for(let c=0;c<3;c++)out[i+c]=mix(origin[i+c],out[i+c],strength);
    out[i+3]=mix(origin[i+3],out[i+3],strength);
   }
  }
  if(opt.palette && opt.palette!=='original' && [5,6,7,8,9,10,37,73,74,75,76,77,78,79,80,81,82].includes(n)){
   const tint=opt.palette==='warm'?[248,198,128]:opt.palette==='cool'?[111,181,227]:[215,215,215];
   for(let i=0;i<out.length;i+=4)for(let c=0;c<3;c++)out[i+c]=mix(out[i+c],tint[c]*out[i+c]/210,.26);
  }
  ctx.putImageData(result,0,0);
  return result;
}
export {random,luma,clamp};
