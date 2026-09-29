export type PoseExample = 'ready' | 'left' | 'right' | 'high' | 'low' | 'mistake';

export const goalIcon = `<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M3 26V7h26v19M3 12h26M9 7v19M23 7v19M3 26h26M11 26l5-7 5 7" stroke="currentColor" stroke-width="1.5"/></svg>`;
export const ballIcon = `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21" fill="#F3F1EC" stroke="#14150F" stroke-width="1.5"/><g fill="#14150F"><path d="m24 14 9 7-4 11H18l-4-11zM10 8l6 3-3 8-8 1M38 8l-6 3 3 8 8 1M9 37l8-1 3 8M39 37l-8-1-3 8"/></g><g fill="none" stroke="#14150F" stroke-width="1.5"><path d="m24 14 0-10M14 21l-9-1M18 32l-5 8M29 32l6 8M33 21l10-1"/></g></svg>`;

export function poseArt(mode: PoseExample = 'high', annotated = false): string {
  const points: Record<string, [number, number]> = {
    head: [240, 106], neck: [240, 134], sl: [213, 143], sr: [267, 143],
    el: [190, 102], er: [290, 102], wl: [173, 56], wr: [307, 56],
    hl: [221, 211], hr: [259, 211], kl: [206, 267], kr: [274, 267], al: [190, 324], ar: [290, 324],
  };
  if (mode === 'ready') Object.assign(points, { el: [188, 182], er: [292, 182], wl: [208, 165], wr: [272, 165], kl: [193, 261], kr: [287, 261] });
  if (mode === 'mistake') Object.assign(points, { er: [296, 181], wr: [283, 218] });
  if (mode === 'low') Object.assign(points, { head: [240, 156], neck: [240, 182], sl: [210, 188], sr: [270, 188], el: [192, 235], er: [288, 235], wl: [215, 271], wr: [265, 271], hl: [219, 246], hr: [261, 246], kl: [181, 275], kr: [299, 275], al: [174, 324], ar: [306, 324] });
  if (mode === 'left' || mode === 'right') {
    Object.assign(points, { head: [193, 118], neck: [195, 147], sl: [172, 153], sr: [221, 155], el: [135, 136], er: [172, 133], wl: [90, 119], wr: [112, 112], hl: [213, 215], hr: [246, 215], kl: [170, 267], kr: [282, 266], al: [132, 324], ar: [328, 324] });
    if (mode === 'right') for (const key of Object.keys(points)) points[key] = [480 - points[key][0], points[key][1]];
  }
  const connections = [['neck','sl'],['neck','sr'],['sl','sr'],['sl','el'],['el','wl'],['sr','er'],['er','wr'],['sl','hl'],['sr','hr'],['hl','hr'],['hl','kl'],['kl','al'],['hr','kr'],['kr','ar']];
  return `<svg class="pose-art" viewBox="0 0 480 360" fill="none" role="img" aria-label="${mode === 'mistake' ? 'Ошибка: поднята только одна рука' : 'Пример движения вратаря'}">
    <g class="art-grid" stroke-width="1"><path d="M40 325V48h400v277M40 100h400M40 156h400M40 212h400M40 268h400M107 48v277M173 48v277M240 48v277M307 48v277M373 48v277"/><path d="M20 325h440M240 24v313" stroke-dasharray="4 6"/></g>
    <path class="art-frame" d="M25 65V33h32m366 0h32v32M25 298v40h32m366 0h32v-40" stroke-width="1.5"/>
    <g class="art-body" stroke-width="2.2">${connections.map(([a,b])=>`<path ${mode === 'mistake' && (a === 'er' || b === 'er' || b === 'wr') ? 'class="art-error"' : ''} d="M${points[a]} ${points[b]}"/>`).join('')}
    <circle cx="${points.head[0]}" cy="${points.head[1]}" r="17"/>
    ${Object.entries(points).filter(([id])=>id!=='head'&&id!=='neck').map(([id,p])=>`<circle class="art-joint ${mode === 'mistake' && ['er','wr'].includes(id) ? 'art-error' : ''}" cx="${p[0]}" cy="${p[1]}" r="3.8"/>`).join('')}</g>
    ${annotated ? `<g class="art-labels"><text x="42" y="24">${mode === 'mistake' ? '01 / РАЗБОР ОШИБКИ' : mode === 'ready' ? '01 / ИСХОДНАЯ ПОЗИЦИЯ' : '02 / ВЕРХНИЙ МЯЧ'}</text><text x="440" y="355" text-anchor="end">KEEPERCAM · MOTION STUDY</text></g><path class="art-callout ${mode === 'mistake' ? 'art-error' : ''}" d="${mode === 'mistake' ? 'M298 218h71v-30' : 'M319 57h51v30'}" stroke-width="1"/><g transform="translate(221 31) scale(.8)">${ballIcon.replace(/<svg[^>]*>/,'').replace('</svg>','')}</g>` : ''}
  </svg>`;
}
