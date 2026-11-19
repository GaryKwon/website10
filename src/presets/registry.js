import {CONTROL_FALLBACKS} from './control-policy.js';
/** Every entry is connected to a unique effect recipe in effects.js. */
const groups = [
  { category:'Typography', short:'Type & print', names:[
    'ASCII Art','Unicode Block Art','Braille Raster','Microtype Image','Receipt / Ticket','Ransomizer Collage','Brand Generator Poster','Magazine Cover','Label Printer','Vintage Japanese Matchbox Labels'] },
  { category:'Raster', short:'Pixels & ink', names:[
    '1-Bit Dither','Bayer Matrix','Floyd-Steinberg','Atkinson Macintosh','Pixel Art','Limited Palette Posterize','Halftone Press','Risograph Layers','CMYK Newspaper','Pixel Sort','Mosaic Tiles','Raised Blocks','STITCH'] },
  { category:'Analog', short:'Analog & film', names:[
    'CRT','Pink Phosphor','Green Phosphor','Amber Terminal','VHS','Analog TV Static','Scanline Corruption','RGB Split','Datamosh-Inspired','Glitch Slice','Polaroid Print','35mm Film Grain','FILMGRAB-Inspired Cinema','Destockd-Inspired Archive','Expired Film'] },
  { category:'Material', short:'Texture & material', names:[
    'Claymorphism','CARVE','Paper Cut Layers','Glassify','Bubble Glass','Foil Emboss','Liquid Chrome','Ink Bleed','Plastic Wrap','Xerox Zine','Fabric Weave','Linocut'] },
  { category:'Light', short:'Light & atmosphere', names:[
    'Soft-Focused Still Life','MIST','Flashlight','Bloom','Dirty Gradient','Dreamy Haze','Caustic Light','Chromatic Aberration','Lens Smear','Angelcore','Backlit Silhouette','Night Vision'] },
  { category:'Organic', short:'Natural / scientific', names:[
    'Microscopy Imagery','CULTURE','Blobtracking','Topographic Relief','Contour Study','Thermal False Color','X-Ray-Inspired Negative','Cyanotype','Solarization','Sonar Map'] },
  { category:'Web', short:'Web & collage', names:[
    'Retroweb','Webcore','Y2K Chrome','Interface Specimen','Digital Brutalism','Acid Graphics','Sticker Bomb','90s Editorial Collage','Swiss International','Japanese Screenprint'] },
];
const notes = {
  'Microscopy Imagery':'Artistic microscopy simulation, not scientific imaging.',
  'Claymorphism':'Procedural clay-like shading; not generative 3D.',
  'Datamosh-Inspired':'Still-image motion smear, not codec datamoshing.',
  'X-Ray-Inspired Negative':'Artistic negative; not actual X-ray imaging.',
  'CULTURE':'Organic colony-inspired procedural texture.',
  'Blobtracking':'Connected luminance regions, not video object tracking.',
  'FILMGRAB-Inspired Cinema':'Original cinematic grade, no copyrighted film stills.',
  'Destockd-Inspired Archive':'Procedural archival footage aesthetic.'
};
const params = {
  Typography:['Glyph size','Ink density','Letter variation'],
  Raster:['Pixel scale','Threshold','Registration'],
  Analog:['Scan detail','Analog noise','Distortion'],
  Material:['Layer scale','Surface grain','Depth'],
  Light:['Glow radius','Atmosphere','Falloff'],
  Organic:['Cell size','Field density','Edge contrast'],
  Web:['Layout scale','Print grain','Offset']
};
const overrides = {
  'ASCII Art':['Glyph size','Density','Contrast'],
  'Receipt / Ticket':['Paper scale','Thermal ink','Paper age'],
  'Ransomizer Collage':['Cutout scale','Paper grain','Rotation'],
  'Brand Generator Poster':['Identity scale','Color weight','Grid offset'],
  'CRT':['Pixel mask','Scanlines','Curvature'],
  'MIST':['Spray size','Pigment amount','Haze'],
  'CARVE':['Layer count','Paper grain','Extrusion'],
  'CULTURE':['Colony scale','Granularity','Tint'],
  'STITCH':['Weave size','Thread texture','Grid tearing'],
  'Dirty Gradient':['Gradient spread','Noise','Color blend'],
  'Flashlight':['Beam size','Darkness','Beam position'],
  'Microscopy Imagery':['Cell size','Specimen detail','Stain'],
  'Blobtracking':['Blob size','Min region','Outline weight'],
  'FILMGRAB-Inspired Cinema':['Film contrast','Film grain','Color temperature'],
  'Destockd-Inspired Archive':['Film damage','Grain','Age'],
  'Vintage Japanese Matchbox Labels':['Label scale','Paper aging','Ink offset']
};
export const PRESETS = groups.flatMap(group => group.names.map(name=>({
  id: name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''),
  number: 1 + groups.slice(0, groups.indexOf(group)).reduce((n, g) => n+g.names.length,0) + group.names.indexOf(name),
  name, category:group.category, categoryLabel:group.short,
  technique: notes[name] || `Procedural ${group.category.toLowerCase()} treatment`,
  labels:(overrides[name] || params[group.category]).map((label,i)=> {const n=1+groups.slice(0,groups.indexOf(group)).reduce((v,g)=>v+g.names.length,0)+group.names.indexOf(name);return CONTROL_FALLBACKS[['detail','texture','variation'][i]].has(n)?['Edge detail','Surface grain','Tone balance'][i]:label;}),
  needsText: [5,6,7,8,9,10,37,73,74,75,76,77,78,79,80,81,82].includes(1 + groups.slice(0,groups.indexOf(group)).reduce((n,g)=>n+g.names.length,0)+group.names.indexOf(name))
})));
export const FEATURED_IDS = [1,5,6,10,11,17,23,24,32,36,39,40,52,55,63,73];
export const CATEGORIES = ['Featured','All',...groups.map(g=>g.category),'Favorites'];
export const getPreset = id => PRESETS.find(p=>p.id===id) || PRESETS[0];
export const getByNumber = number => PRESETS[number-1];
