import {PRESETS, FEATURED_IDS, CATEGORIES, getPreset, getByNumber} from './presets/registry.js';
import {renderImage} from './engine/effects.js';
import {processImage,imageToData,dataToURL,dataToBlob,cropImageData} from './engine/processor.js';

const $=(selector,root=document)=>root.querySelector(selector);
const demoURL='./demo/atmosphere.jpg';
const imageCache=new Map();
const state={ preset:PRESETS[0], category:'Featured', search:'', favorites:loadFavorites(), imageURL:demoURL, imageName:'demo-atmosphere', isDemo:true, position:50, sourceImage:null, previewData:null, sourceURL:null, resultURL:null, detail:55, texture:40, variation:45, intensity:100, seed:17, text:'VISUAL LAB', outputType:'image/png', exportScale:1, viewMode:'fit', cropRatio:'original', previewMyPhoto:false, showCaption:true, titleSize:50, titlePosition:50, margin:50, palette:'original', transparentBackground:false, activeRenderAbort:null, loading:false, exporting:false, error:'', renderToken:0, editHistory:[], redoHistory:[]};
const canUseIdle=typeof requestIdleCallback==='function';
let renderTimer=0,historyTimer=0,thumbnailObserver,thumbnailSource=null,thumbnailDemoSource=null,thumbnailBusy=false,thumbnailQueue=[],thumbnailGeneration=0,lastAnnounce=0,uploadSerial=0;
function loadFavorites(){try{const v=JSON.parse(localStorage.getItem('visual-lab-favorites')||'[]');return new Set(Array.isArray(v)?v:[]);}catch{return new Set();}}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=(name,size=18)=>({upload:`<path d="M12 16V3m0 0L7 8m5-5 5 5M4 17v3h16v-3"/>`,download:`<path d="M12 3v13m0 0 5-5m-5 5-5-5M4 17v4h16v-4"/>`,arrow:`<path d="M4 12h16m-6-6 6 6-6 6"/>`,search:`<circle cx="10.8" cy="10.8" r="6.7"/><path d="m16 16 5 5"/>`,heart:`<path d="M20.6 8.1c0 4.8-8.6 10-8.6 10S3.4 12.9 3.4 8.1a4.3 4.3 0 0 1 8.6-.5 4.3 4.3 0 0 1 8.6.5Z"/>`,shuffle:`<path d="M3 7h3c5 0 7 10 12 10h3m-4-4 4 4-4 4M3 17h3c2.3 0 4-2.2 5-4M16 7h5m-4-4 4 4-4 4"/>`,undo:`<path d="m9 14-5-5 5-5M4 9h9a7 7 0 0 1 0 14"/>`,redo:`<path d="m15 14 5-5-5-5m5 5h-9a7 7 0 0 0 0 14"/>`,refresh:`<path d="M20 7V3m0 4h-4M4 17v4m0-4h4M5 10a8 8 0 0 1 14-3M19 14a8 8 0 0 1-14 3"/>`,close:`<path d="M5 5l14 14M19 5 5 19"/>`,chevrons:`<path d="m10 8-4 4 4 4m4-8 4 4-4 4"/>`,check:`<path d="m4 12 5 5L20 6"/>`,info:`<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>`,image:`<rect x="3" y="3" width="18" height="18" rx="1"/><circle cx="8" cy="8" r="1"/><path d="m3 17 6-5 4 3 3-4 5 5"/>`}[name]||'');
const I=(name,size=18)=>`<svg width="${size}" height="${size}" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.65" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icon(name)}</svg>`;
function template(){return `
<header class="topbar" id="top"><div class="bar-brand"><a href="#top" aria-label="Visual Lab home" class="brand"><span class="brand-symbol" aria-hidden="true">✳</span> VISUAL<span class="brand-slash">/</span>LAB</a></div><nav class="topnav" aria-label="Main navigation"><a href="#studio" class="nav-active">STUDIO</a><a href="#styles">STYLES</a></nav><button class="header-upload button-light" id="uploadTop">${I('upload',16)} <span>UPLOAD IMAGE</span></button></header>
<main>
  <div id="studio" class="studio-anchor"></div>
  <section class="work-grid" aria-label="Image editor"><div class="editor-left"><div class="stage-head" aria-live="polite"><span id="stageStatus">READY</span><span id="imageMeta"></span></div>
    <div class="stage-container" id="dropZone"><div class="comparison" id="comparison" aria-label="Before and after image comparison"><img id="beforeImage" class="comparison-image" src="${demoURL}" alt="Original image" draggable="false"/><div class="after-layer" id="afterLayer"><img id="afterImage" class="comparison-image" src="${demoURL}" alt="Image after selected visual treatment" draggable="false"/></div><div class="stage-tag stage-before">BEFORE</div><div class="stage-tag stage-after">AFTER</div><div class="divider" id="divider" role="slider" tabindex="0" aria-label="Before and after comparison divider" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50" aria-valuetext="Before 50 percent, after 50 percent"><div class="divider-handle">${I('chevrons',23)}</div></div><div class="render-mask" id="renderMask" hidden><span class="loading-spinner"></span><span>PROCESSING IMAGE</span></div><div class="empty-overlay" id="emptyOverlay" hidden><h3>NO IMAGE<br/>LOADED.</h3><div><button id="emptyUpload" class="empty-upload">OPEN AN IMAGE ↗</button><button id="emptyDemo" class="empty-demo">TRY THE DEMO</button></div></div><div class="drop-mask" id="dropMask" hidden><div class="drop-icon">${I('upload',35)}</div><strong>DROP IMAGE HERE</strong><span>JPEG / PNG / WEBP / AVIF</span></div></div></div>
    <div class="stage-foot"><div><span class="live-indicator">●</span> <span id="currentStyleName">ASCII ART</span> <span class="footer-sep">/</span> <span id="compareValue">50 — 50</span></div><div class="stage-actions"><div class="view-switch" aria-label="Image framing"><button type="button" id="viewFit" aria-pressed="true">FIT</button><button type="button" id="viewFill" aria-pressed="false">FILL</button></div><button id="demoReset" title="Return to built-in demo">${I('refresh',15)} <span>DEMO</span></button><button id="clearImage" title="Remove uploaded image">CLEAR</button></div></div>
  </div><aside class="editor-right" aria-label="Effect settings"><div class="selected-info"><span id="selectedIndex" hidden>PRESET 001 / 082</span><h2 id="selectedName">ASCII ART</h2><p id="selectedNote" hidden>Convert image tones into real glyphs.</p></div><div class="panel-toolbar"><button id="prevStyle" title="Previous preset">← PREV</button><button id="nextStyle" title="Next preset">NEXT →</button><button id="undoEdit" title="Undo last edit" aria-label="Undo edit">${I('undo',16)}</button><button id="redoEdit" title="Redo last edit" aria-label="Redo edit">${I('redo',16)}</button><button id="favoriteCurrent" class="fav-current" aria-label="Favorite selected style">${I('heart',17)}</button></div><div id="parameterPanel" class="parameter-panel"></div><div class="seed-row" id="seedRow"><label for="seedField">SEED</label><div><input id="seedField" type="number" min="0" max="999999" step="1" value="17" aria-label="Noise seed"/><button id="shuffleSeed" title="Randomize seed">${I('shuffle',16)}</button></div></div><div id="textRow" class="text-row" hidden>
 <div class="caption-heading"><label for="captionField">TEXT</label><label class="check-label"><input id="showCaption" type="checkbox" checked/> SHOW</label></div>
 <textarea id="captionField" maxlength="160" rows="2" placeholder="Optional text">VISUAL LAB</textarea>
 <div class="poster-controls">
  <label for="titleSize">TYPE SIZE <output id="value-titleSize">50</output></label><input id="titleSize" data-layout="titleSize" type="range" min="0" max="100" value="50"/>
  <label for="titlePosition">TYPE POSITION <output id="value-titlePosition">50</output></label><input id="titlePosition" data-layout="titlePosition" type="range" min="0" max="100" value="50"/>
  <label for="margin">MARGINS <output id="value-margin">50</output></label><input id="margin" data-layout="margin" type="range" min="0" max="100" value="50"/>
  <label for="paletteSelect">PALETTE</label><select id="paletteSelect"><option value="original">ORIGINAL</option><option value="warm">WARM</option><option value="cool">COOL</option><option value="mono">MONO</option></select>
 </div></div><label class="check-label transparency-option"><input id="transparentBg" type="checkbox"/> PRESERVE SOURCE TRANSPARENCY</label><div class="panel-divider"></div><div class="export-head">EXPORT</div><div class="export-options"><label for="cropRatio">ARTBOARD</label><select id="cropRatio"><option value="original">ORIGINAL</option><option value="1">SQUARE · 1:1</option><option value="0.8">PORTRAIT · 4:5</option><option value="1.7777777778">WIDE · 16:9</option></select><label for="formatSelect">FORMAT</label><select id="formatSelect"><option value="image/png">PNG</option><option value="image/jpeg">JPEG</option><option value="image/webp">WEBP</option></select><label for="scaleSelect">SIZE</label><select id="scaleSelect"><option value="1">STANDARD</option><option value="2">HIGH RES</option></select></div><button class="export-button" id="exportButton">${I('download',18)} EXPORT ARTWORK <span>↗</span></button></aside></section>
  <section class="styles-section" id="styles"><div class="styles-head"><h2>STYLES</h2><button id="randomStyle" class="random-button">${I('shuffle',16)} RANDOM STYLE ${I('arrow',16)}</button></div><div class="style-filterbar"><div class="category-scroll" id="categoryFilters" role="group" aria-label="Filter style categories"></div><label class="style-search">${I('search',17)}<input id="styleSearch" type="search" autocomplete="off" aria-label="Search visual styles" placeholder="SEARCH STYLES..."/></label></div><div class="style-preview-controls"><label class="check-label"><input type="checkbox" id="previewMyPhoto"/> PREVIEW WITH MY IMAGE</label></div><div class="style-grid" id="styleGrid" aria-live="polite"></div><div id="emptyStyles" class="no-results" hidden>NO RESULTS. TRY ANOTHER SEARCH.</div><div class="collection-foot"><button id="backToTop">BACK TO STUDIO ↑</button></div></section>

</main><input type="file" id="fileInput" accept="image/jpeg,image/png,image/webp,image/avif" hidden/><div class="toast" role="status" aria-live="polite" id="toast"></div>`;}

function snapshot(){return {preset:state.preset.id,detail:state.detail,texture:state.texture,variation:state.variation,intensity:state.intensity,seed:state.seed,text:state.text,showCaption:state.showCaption,titleSize:state.titleSize,titlePosition:state.titlePosition,margin:state.margin,palette:state.palette,transparentBackground:state.transparentBackground};}
function remember(){state.editHistory.push(snapshot());if(state.editHistory.length>35)state.editHistory.shift();state.redoHistory=[];refreshHistory();}
function refreshHistory(){if($('#undoEdit'))$('#undoEdit').disabled=state.editHistory.length===0;if($('#redoEdit'))$('#redoEdit').disabled=state.redoHistory.length===0;}
function restore(s){if(!s)return;state.preset=getPreset(s.preset);for(const k of ['detail','texture','variation','intensity','seed','text','showCaption','titleSize','titlePosition','margin','palette','transparentBackground'])if(s[k]!==undefined)state[k]=s[k];updatePresetUI();scheduleRender();}
function undo(){if(!state.editHistory.length)return;state.redoHistory.push(snapshot());restore(state.editHistory.pop());refreshHistory();toast('PREVIOUS VERSION RESTORED');}
function redo(){if(!state.redoHistory.length)return;state.editHistory.push(snapshot());restore(state.redoHistory.pop());refreshHistory();toast('NEXT VERSION RESTORED');}
function beginGroupedEdit(){if(historyTimer)return;remember();historyTimer=setTimeout(()=>{historyTimer=0;},800);}
function changeStyle(p){if(!p||p.id===state.preset.id)return;remember();state.preset=p;updatePresetUI();scheduleRender();if(location.hash==='#styles')location.hash='studio';}
function selectCategory(category){state.category=category;renderFilters();renderTiles();}
function refreshFavoriteButton(){const fav=state.favorites.has(state.preset.id);$('#favoriteCurrent').classList.toggle('is-favorite',fav);$('#favoriteCurrent').setAttribute('aria-label',fav?'Remove selected style from favorites':'Add selected style to favorites');}
function toggleFavorite(id){if(state.favorites.has(id))state.favorites.delete(id);else state.favorites.add(id);try{localStorage.setItem('visual-lab-favorites',JSON.stringify([...state.favorites]));}catch{}refreshFavoriteButton();renderTiles();}
function updatePresetUI(){const p=state.preset;$('#selectedIndex').textContent=`PRESET ${String(p.number).padStart(3,'0')} / 082`;$('#selectedName').textContent=p.name.toUpperCase();$('#selectedNote').textContent=p.technique;$('#selectedName').title=p.technique;$('#currentStyleName').textContent=p.name.toUpperCase();refreshFavoriteButton();renderParameters();renderTiles();$('#textRow').hidden=!p.needsText;$('#seedRow').hidden=[12,16,17,31,53,65,67,71].includes(p.number);$('#captionField').value=state.text;$('#showCaption').checked=state.showCaption;$('#captionField').disabled=!state.showCaption;for(const k of ['titleSize','titlePosition','margin']){$('#'+k).value=state[k];$('#value-'+k).textContent=state[k];}$('#paletteSelect').value=state.palette;$('#transparentBg').checked=state.transparentBackground;$('#seedField').value=state.seed;}
function renderParameters(){const arr=[['INTENSITY','intensity'],[state.preset.labels[0].toUpperCase(),'detail'],[state.preset.labels[1].toUpperCase(),'texture'],[state.preset.labels[2].toUpperCase(),'variation']];$('#parameterPanel').innerHTML=arr.map(([name,key],i)=>`<div class="param"><div class="param-label"><label for="param-${key}">${name}</label><output id="value-${key}">${state[key]}${i===0?'%':''}</output></div><input type="range" id="param-${key}" data-param="${key}" min="0" max="100" step="1" value="${state[key]}" style="--fill:${state[key]}%"/></div>`).join('');$('#parameterPanel').querySelectorAll('input').forEach(el=>el.addEventListener('input',e=>{beginGroupedEdit();const k=e.target.dataset.param;state[k]=Number(e.target.value);$(`#value-${k}`).textContent=String(state[k])+(k==='intensity'?'%':'');e.target.style.setProperty('--fill',`${state[k]}%`);scheduleRender();}));}
function renderFilters(){$('#categoryFilters').innerHTML=CATEGORIES.map(c=>`<button type="button" class="filter ${state.category===c?'selected':''}" data-category="${c}" aria-pressed="${state.category===c}">${c.toUpperCase()}</button>`).join('');}
function filtered(){return PRESETS.filter(p=>(state.category==='All'||state.category==='Featured'&&FEATURED_IDS.includes(p.number)||state.category==='Favorites'&&state.favorites.has(p.id)||p.category===state.category)&&(`${p.name} ${p.category} ${p.technique}`.toLowerCase().includes(state.search.toLowerCase())));}
function renderTiles(){const list=filtered(),grid=$('#styleGrid');if(!grid)return;grid.innerHTML=list.map(p=>`<article class="style-card ${p.id===state.preset.id?'selected':''}" data-preset="${p.id}"><button class="tile-image" type="button" data-select="${p.id}" aria-label="Apply ${esc(p.name)}"><img data-thumb="${p.number}" alt="Preview of ${esc(p.name)}" src="./demo/thumb.jpg" loading="lazy"/></button><div class="tile-meta"><button type="button" data-select="${p.id}" class="tile-name">${esc(p.name)}</button><button class="tile-fav ${state.favorites.has(p.id)?'active':''}" data-favorite="${p.id}" aria-label="${state.favorites.has(p.id)?'Remove':'Add'} ${esc(p.name)} ${state.favorites.has(p.id)?'from':'to'} favorites">${I('heart',16)}</button></div></article>`).join('');$('#emptyStyles').hidden=list.length>0;prepareThumbnails();}
function prepareThumbnails(){
 thumbnailObserver?.disconnect();thumbnailQueue=[];thumbnailGeneration++;
 if(!thumbnailSource)return;
 const generation=thumbnailGeneration;
 thumbnailObserver=new IntersectionObserver(entries=>{
  if(generation!==thumbnailGeneration)return;
  for(const entry of entries)if(entry.isIntersecting){thumbnailObserver.unobserve(entry.target);const number=Number(entry.target.dataset.thumb);const key=String(Number(state.previewMyPhoto))+'-'+number;
   if(imageCache.has(key))entry.target.src=imageCache.get(key);
   else thumbnailQueue.push({img:entry.target,number,generation,key});
  }pumpThumbnails();
 },{rootMargin:'100px'});
 $$('img[data-thumb]').forEach(img=>thumbnailObserver.observe(img));
}
function $$(sel,root=document){return [...root.querySelectorAll(sel)];}
function pumpThumbnails(){
 if(thumbnailBusy)return;
 const job=thumbnailQueue.shift();if(!job)return;
 if(job.generation!==thumbnailGeneration){pumpThumbnails();return;}
 thumbnailBusy=true;
 const work=()=>{
  try{
   if(job.generation!==thumbnailGeneration)return;
   const p=getByNumber(job.number),output=renderImage(thumbnailSource,{number:p.number,intensity:100,detail:55,texture:40,variation:45,seed:17,text:state.text,showCaption:state.showCaption});
   const canvas=document.createElement('canvas');canvas.width=output.width;canvas.height=output.height;canvas.getContext('2d').putImageData(output,0,0);
   const url=canvas.toDataURL('image/jpeg',.8);imageCache.set(job.key,url);
   if(imageCache.size>28)imageCache.delete(imageCache.keys().next().value);
   if(job.generation===thumbnailGeneration&&job.img.isConnected)job.img.src=url;
  }catch(err){console.warn('Thumbnail unavailable:',job.number,err);}
  finally{thumbnailBusy=false;if(thumbnailQueue.length)setTimeout(pumpThumbnails,25);}
 };
 canUseIdle?requestIdleCallback(work,{timeout:250}):setTimeout(work,15);
}
function setPosition(v){state.position=Math.max(0,Math.min(100,v));$('#afterLayer').style.clipPath=`inset(0 0 0 ${state.position}%)`;$('#divider').style.left=`${state.position}%`;$('#divider').setAttribute('aria-valuenow',String(Math.round(state.position)));$('#divider').setAttribute('aria-valuetext',`Before ${Math.round(state.position)} percent, after ${Math.round(100-state.position)} percent`);$('#compareValue').textContent=`${Math.round(state.position)} — ${Math.round(100-state.position)}`;}
function handleCompare(){const divider=$('#divider'),stage=$('#comparison');let dragging=false;const move=e=>{const r=stage.getBoundingClientRect();setPosition((e.clientX-r.left)/r.width*100);};divider.addEventListener('pointerdown',e=>{e.preventDefault();dragging=true;divider.setPointerCapture(e.pointerId);move(e);});divider.addEventListener('pointermove',e=>{if(dragging)move(e);});for(const ev of ['pointerup','pointercancel','lostpointercapture'])divider.addEventListener(ev,()=>{dragging=false});divider.addEventListener('keydown',e=>{const step=e.shiftKey?10:2;if(['ArrowLeft','ArrowDown','ArrowRight','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();setPosition(e.key==='Home'?0:e.key==='End'?100:state.position+(e.key==='ArrowLeft'||e.key==='ArrowDown'?-step:step));}});setPosition(50);}
function options(){return {number:state.preset.number,detail:state.detail,texture:state.texture,variation:state.variation,intensity:state.intensity,seed:state.seed,text:state.text,showCaption:state.showCaption,titleSize:state.titleSize,titlePosition:state.titlePosition,margin:state.margin,palette:state.palette,transparentBackground:state.transparentBackground};}
function setBusy(on){state.loading=on;$('#renderMask').hidden=!on;$('#stageStatus').textContent=on?'RENDERING':'READY';}
function cancelRender(){clearTimeout(renderTimer);state.activeRenderAbort?.abort();state.activeRenderAbort=null;}
function scheduleRender(){
 ++state.renderToken;cancelRender();
 if(!state.previewData)return;
 renderTimer=setTimeout(renderCurrent,130);
}
function applyStageView(){
 const comp=$('#comparison'),stage=$('#dropZone');comp.dataset.view=state.viewMode;
 $('#viewFit').setAttribute('aria-pressed',String(state.viewMode==='fit'));
 $('#viewFill').setAttribute('aria-pressed',String(state.viewMode==='fill'));
 const ratio=state.cropRatio==='original'?null:Number(state.cropRatio);
 stage.style.height=ratio?`${Math.min(1500,Math.round(stage.clientWidth/ratio))}px`:'';
}
function selectedCropRatio(){
 const ratio=state.cropRatio==='original'?null:Number(state.cropRatio);
 return ratio||(state.viewMode==='fill'?$('#comparison').clientWidth/Math.max(1,$('#comparison').clientHeight):null);
}
async function renderCurrent(){
 if(!state.previewData)return;
 const token=state.renderToken,controller=new AbortController();
 state.activeRenderAbort=controller;setBusy(true);
 try{
  const result=await processImage(state.previewData,options(),{signal:controller.signal});
  if(controller.signal.aborted||token!==state.renderToken)return;
  const url=await dataToURL(result);
  if(controller.signal.aborted||token!==state.renderToken){URL.revokeObjectURL(url);return;}
  const previous=state.resultURL;
  state.resultURL=url;
  const image=$('#afterImage');
  let released=false;const releaseOld=()=>{if(!released&&previous){URL.revokeObjectURL(previous);released=true;}};
  image.onload=releaseOld;image.onerror=()=>{releaseOld();toast('Preview cannot be displayed.',true);};
  image.src=url;
  if(image.complete&&image.naturalWidth)releaseOld();
 }catch(err){if(token===state.renderToken&&err?.name!=='AbortError')toast(err?.message||'Could not render image.',true);}
 finally{if(state.activeRenderAbort===controller)state.activeRenderAbort=null;if(token===state.renderToken)setBusy(false);}
}
function toast(message,error=false){const t=$('#toast');t.textContent=message;t.classList.toggle('error',error);t.classList.add('show');clearTimeout(lastAnnounce);lastAnnounce=setTimeout(()=>t.classList.remove('show'),3800);}
function setImageMeta(image,name){$('#imageMeta').textContent=`${state.isDemo?'DEMO / ':'SOURCE / '}${(name||'UNTITLED').toUpperCase().slice(0,20)} / ${image.naturalWidth||image.width} × ${image.naturalHeight||image.height}`;}
async function setSource(url,name,isDemo=false){
 const token=++state.renderToken;cancelRender();setBusy(true);
 try{
  const img=new Image();img.decoding='async';img.src=url;await img.decode();
  if(token!==state.renderToken)return false;
  if(img.naturalWidth*img.naturalHeight>24000000)throw Error('Image exceeds 24 megapixels. Please resize the photo first.');
  const preview=await imageToData(img,Math.max(img.naturalWidth,img.naturalHeight)>1500?1250:1500);
  if(token!==state.renderToken)return false;
  state.sourceImage=img;state.imageURL=url;state.imageName=name;state.isDemo=isDemo;state.previewData=preview;
  $('#beforeImage').src=url;$('#emptyOverlay').hidden=true;$('#exportButton').disabled=false;
  setImageMeta(img,name);applyStageView();scheduleRender();
  if(state.previewMyPhoto)await loadThumbnailPhoto();
  return true;
 }catch(err){if(token===state.renderToken){setBusy(false);toast(err?.message||'Could not decode image.',true);}return false;}
}
async function signature(file){
 const arr=new Uint8Array(await file.slice(0,24).arrayBuffer());
 const starts=bytes=>bytes.every((v,i)=>arr[i]===v);
 const text=(a,b)=>String.fromCharCode(...arr.slice(a,b));
 const isJPEG=starts([0xff,0xd8,0xff]),isPNG=starts([137,80,78,71,13,10,26,10]);
 const isWebP=text(0,4)==='RIFF'&&text(8,12)==='WEBP';
 const isAVIF=text(4,8)==='ftyp'&&['avif','avis'].includes(text(8,12));
 return isJPEG||isPNG||isWebP||isAVIF;
}
async function useFile(file){
 if(!file)return;
 const serial=++uploadSerial;
 if(file.size>25*1024*1024){toast('FILE EXCEEDS 25 MB LIMIT.',true);return;}
 if(!await signature(file)){if(serial===uploadSerial)toast('USE A VALID JPEG, PNG, WEBP OR AVIF FILE.',true);return;}
 if(serial!==uploadSerial)return;
 const url=URL.createObjectURL(file),old=state.sourceURL;
 const success=await setSource(url,file.name,false);
 if(success&&serial===uploadSerial){
  state.sourceURL=url;
  if(old&&old!==url)URL.revokeObjectURL(old);
  toast('IMAGE LOADED');
 }else URL.revokeObjectURL(url);
}
function upload(){const input=$('#fileInput');input.value='';input.click();}
async function demo(){
 ++uploadSerial;
 const old=state.sourceURL;
 if(await setSource(demoURL,'atmosphere',true)){
  state.sourceURL=null;if(old)URL.revokeObjectURL(old);toast('DEMO RESTORED');
 }
}
function clearImage(){
 ++uploadSerial;++state.renderToken;cancelRender();
 if(state.sourceURL)URL.revokeObjectURL(state.sourceURL);
 if(state.resultURL)URL.revokeObjectURL(state.resultURL);
 state.sourceURL=null;state.resultURL=null;state.sourceImage=null;state.previewData=null;state.imageURL='';state.imageName='';state.isDemo=false;
 $('#beforeImage').removeAttribute('src');$('#afterImage').removeAttribute('src');$('#emptyOverlay').hidden=false;
 $('#imageMeta').textContent='NO IMAGE LOADED';$('#exportButton').disabled=true;
 if(state.previewMyPhoto){thumbnailSource=thumbnailDemoSource;imageCache.clear();prepareThumbnails();}
 setBusy(false);toast('IMAGE CLEARED');
}
async function exportImage(){
 if(state.exporting||!state.sourceImage)return;
 state.exporting=true;
 const button=$('#exportButton'),last=button.innerHTML;
 button.disabled=true;button.textContent='EXPORTING...';
 try{
  const mobile=matchMedia('(max-width:700px)').matches || (navigator.deviceMemory&&navigator.deviceMemory<=4);
  const maxEdge=mobile?(state.exportScale===2?2400:1700):(state.exportScale===2?3200:2000);
  const data=await imageToData(state.sourceImage,maxEdge);
  const rendered=await processImage(data,options());
  const output=cropImageData(rendered,selectedCropRatio());
  const requested=state.outputType;
  const blob=await dataToBlob(output,requested,.93);
  const actual=['image/png','image/jpeg','image/webp'].includes(blob.type)?blob.type:'image/png';
  if(actual!==requested)toast('FORMAT NOT SUPPORTED — SAVED AS PNG');
  const ext=actual==='image/jpeg'?'jpg':actual==='image/webp'?'webp':'png';
  const filename=`visual-lab_${state.preset.id}_${new Date().toISOString().slice(0,10)}.${ext}`;
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),20000);
  if(actual===requested)toast(`EXPORTED ${output.width} × ${output.height} ${ext.toUpperCase()}`);
 }catch(err){toast(`EXPORT FAILED: ${err?.message||err}`,true);}
 finally{state.exporting=false;button.disabled=!state.sourceImage;button.innerHTML=last;}
}
async function initThumbs(){
 try{const img=new Image();img.src='./demo/thumb.jpg';await img.decode();thumbnailDemoSource=await imageToData(img,158);thumbnailSource=thumbnailDemoSource;prepareThumbnails();}
 catch(err){console.warn('Demo preview thumbnails unavailable',err);}
}
async function loadThumbnailPhoto(){
 if(!state.previewMyPhoto||!state.sourceImage)return;
 const source=state.sourceImage,serial=uploadSerial;
 try{const data=await imageToData(source,168);if(serial!==uploadSerial||!state.previewMyPhoto)return;
  thumbnailSource=data;imageCache.clear();prepareThumbnails();
 }catch(err){console.warn('Cannot preview photo in tiles',err);}
}
function initEvents(){
 $('#uploadTop').addEventListener('click',upload);$('#fileInput').addEventListener('change',e=>useFile(e.target.files?.[0]));$('#demoReset').addEventListener('click',demo);$('#clearImage').addEventListener('click',clearImage);$('#emptyUpload').addEventListener('click',upload);$('#emptyDemo').addEventListener('click',demo);
 $('#prevStyle').addEventListener('click',()=>changeStyle(getByNumber(state.preset.number===1?82:state.preset.number-1)));$('#nextStyle').addEventListener('click',()=>changeStyle(getByNumber(state.preset.number===82?1:state.preset.number+1)));
 $('#favoriteCurrent').addEventListener('click',()=>toggleFavorite(state.preset.id));$('#undoEdit').addEventListener('click',undo);$('#redoEdit').addEventListener('click',redo);refreshHistory();$('#shuffleSeed').addEventListener('click',()=>{remember();state.seed=Math.floor(Math.random()*999999);$('#seedField').value=state.seed;scheduleRender();});$('#seedField').addEventListener('change',e=>{remember();state.seed=Math.max(0,Math.floor(Number(e.target.value)||0));scheduleRender();});
 $('#captionField').addEventListener('input',e=>{beginGroupedEdit();state.text=e.target.value;scheduleRender();});
 $('#showCaption').addEventListener('change',e=>{remember();state.showCaption=e.target.checked;$('#captionField').disabled=!state.showCaption;scheduleRender();});
 for(const input of $$('#textRow [data-layout]'))input.addEventListener('input',e=>{beginGroupedEdit();const key=e.target.dataset.layout;state[key]=Number(e.target.value);$('#value-'+key).textContent=state[key];scheduleRender();});
 $('#paletteSelect').addEventListener('change',e=>{remember();state.palette=e.target.value;scheduleRender();});
 $('#transparentBg').addEventListener('change',e=>{remember();state.transparentBackground=e.target.checked;scheduleRender();});
 $('#cropRatio').addEventListener('change',e=>{state.cropRatio=e.target.value;if(state.cropRatio!=='original')state.viewMode='fill';applyStageView();});
 $('#viewFit').addEventListener('click',()=>{state.viewMode='fit';state.cropRatio='original';$('#cropRatio').value='original';applyStageView();});
 $('#viewFill').addEventListener('click',()=>{state.viewMode='fill';applyStageView();});
 $('#previewMyPhoto').addEventListener('change',async e=>{state.previewMyPhoto=e.target.checked;thumbnailGeneration++;thumbnailQueue=[];imageCache.clear();if(state.previewMyPhoto)await loadThumbnailPhoto();else{thumbnailSource=thumbnailDemoSource;prepareThumbnails();}});
 window.addEventListener('resize',()=>{if(state.cropRatio!=='original')applyStageView();});$('#formatSelect').addEventListener('change',e=>state.outputType=e.target.value);$('#scaleSelect').addEventListener('change',e=>state.exportScale=Number(e.target.value));$('#exportButton').addEventListener('click',exportImage);
 $('#randomStyle').addEventListener('click',()=>{changeStyle(PRESETS[Math.floor(Math.random()*PRESETS.length)]);$('#studio').scrollIntoView({behavior:'smooth',block:'start'});});$('#backToTop').addEventListener('click',()=>$('#studio').scrollIntoView({behavior:'smooth',block:'start'}));
 $('#categoryFilters').addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(b)selectCategory(b.dataset.category);});$('#styleGrid').addEventListener('click',e=>{const fav=e.target.closest('[data-favorite]');if(fav){toggleFavorite(fav.dataset.favorite);return;}const b=e.target.closest('[data-select]');if(b){changeStyle(getPreset(b.dataset.select));document.querySelector('.work-grid').scrollIntoView({behavior:'smooth',block:'start'});}});
 $('#styleSearch').addEventListener('input',e=>{state.search=e.target.value;renderTiles();});handleCompare();
 const zone=$('#dropZone');let counter=0;zone.addEventListener('dragenter',e=>{e.preventDefault();counter++;$('#dropMask').hidden=false;});zone.addEventListener('dragover',e=>e.preventDefault());zone.addEventListener('dragleave',e=>{e.preventDefault();if(--counter<=0){counter=0;$('#dropMask').hidden=true;}});zone.addEventListener('drop',e=>{e.preventDefault();counter=0;$('#dropMask').hidden=true;useFile(e.dataTransfer?.files?.[0]);});
 document.addEventListener('paste',e=>{const f=[...(e.clipboardData?.items||[])].find(item=>item.type.startsWith('image/'));if(f){e.preventDefault();useFile(f.getAsFile());}});
 document.addEventListener('keydown',e=>{const editing=['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName);if(!editing&&e.key==='/'){e.preventDefault();$('#styleSearch').focus();$('#styles').scrollIntoView({behavior:'smooth'});}if(!editing&&e.key.toLowerCase()==='u'){e.preventDefault();upload();}if(!editing&&(e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();}});
 window.addEventListener('beforeunload',()=>{cancelRender();thumbnailObserver?.disconnect();if(state.sourceURL)URL.revokeObjectURL(state.sourceURL);if(state.resultURL)URL.revokeObjectURL(state.resultURL);imageCache.clear();});
}
async function boot(){document.querySelector('#root').innerHTML=template();renderFilters();renderParameters();renderTiles();initEvents();await Promise.all([setSource(demoURL,'atmosphere',true),initThumbs()]);}
boot();
