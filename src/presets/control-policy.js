/** Explicit fallback controls for treatments whose native pipeline has no matching parameter.
 * These controls are identified truthfully in the editor and alter the output. */
export const CONTROL_FALLBACKS = {
  detail: new Set([6,7,8,9,18,27,29,34,35,36,37,38,49,55,68,69,70,71,72,74,75,76,77,78,79,80,81,82]),
  texture: new Set([4,7,8,20,24,25,26,27,30,31,32,39,41,42,43,44,45,47,50,51,56,57,58,59,60,61,63,65,66,67,68,69,71,72,73,75,76,77,78,79,81]),
  variation: new Set([4,5,6,7,8,9,10,25,26,27,29,32,34,35,36,37,38,44,45,47,49,50,51,52,54,55,56,57,60,62,63,64,66,68,69,70,72,73,74,75,76,78,79,80,81,82])
};
