import type { GameSnapshot } from '../logic/game';
import { getLeaderboard, saveScore } from '../storage/leaderboard';

const errorLabels: Record<string,string> = { T1:'Шагай к мячу всем телом, не только тянись рукой', T2:'Поднимай обе руки над головой', T3:'Полностью выпрямляй руки вверх', T4:'Сгибай колени и опускай таз', T5:'Двигайся в сторону подсвеченной зоны' };
const zoneNames = { DIVE_LEFT:'слева', DIVE_RIGHT:'справа', HIGH:'сверху', LOW:'снизу' };
const resultNames = { clean:'Чистый сейв', saved_with_error:'Сейв с ошибкой', goal:'Гол' };
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));

export function renderResults(container: HTMLElement, snapshot: GameSnapshot, replay: () => void, newPlayer: () => void): void {
  const saves = snapshot.results.filter(item => item.result !== 'goal').length;
  const clean = snapshot.results.filter(item => item.result === 'clean').length;
  const timed = snapshot.results.filter(item => item.reactionMs !== null);
  const reaction = timed.length ? Math.round(timed.reduce((sum,item)=>sum+(item.reactionMs ?? 0),0)/timed.length) : null;
  const counts = new Map<string,number>();
  for (const shot of snapshot.results) if (shot.errorId) counts.set(shot.errorId,(counts.get(shot.errorId) ?? 0)+1);
  const mistakes = [...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3);
  container.innerHTML = `<div class="result-hero ink-block"><div><p class="eyebrow">ФИНАЛЬНЫЙ СВИСТОК / ТВОЙ РЕЗУЛЬТАТ</p><div class="result-score">${snapshot.score}<small>ОЧКОВ</small></div><h2>${saves >= 7 ? 'ВОРОТА В НАДЁЖНЫХ РУКАХ.' : saves >= 3 ? 'КАЖДЫЙ СЕЙВ — ШАГ ВПЕРЁД.' : 'ПЕРВЫЙ МАТЧ ПОЗАДИ.'}</h2></div><div class="result-stats"><div><strong>${saves}<small>/10</small></strong><span>сейвов</span></div><div><strong>${Math.round(clean/10*100)}<small>%</small></strong><span>чистых сейвов</span></div><div><strong>${reaction ?? '—'}<small>${reaction === null ? '' : ' мс'}</small></strong><span>средняя реакция</span></div></div></div>
  <div class="results-columns"><section><p class="eyebrow">01 / ПО УДАРАМ</p><h3>Как прошёл матч</h3><div class="shot-timeline" role="group" aria-label="Выбери удар для разбора">${snapshot.results.map((item,i)=>`<button class="${item.result}" data-shot="${i}" aria-pressed="${i===0}" aria-label="Удар ${i+1}: ${resultNames[item.result]}">${String(i+1).padStart(2,'0')}</button>`).join('')}</div><p class="timeline-legend">ЗЕЛЁНЫЙ — ЧИСТО · РЫЖИЙ — С ОШИБКОЙ · СЕРЫЙ — ГОЛ</p><p class="shot-detail" id="shot-detail" aria-live="polite"></p><div class="result-mistakes"><h3>Над чем поработать</h3>${mistakes.length ? `<ul class="mistake-list">${mistakes.map(([id,count])=>`<li><span>${errorLabels[id] ?? 'Следи за подсветкой и подсказками тренера'}</span><b>×${count}</b></li>`).join('')}</ul>` : `<p class="empty-copy">${saves === 10 ? 'Тренер не заметил ошибок техники. Попробуй улучшить реакцию в следующем матче.' : 'Ошибок техники не зафиксировано. Следи за зоной мяча и попробуй поймать больше ударов.'}</p>`}</div></section>
  <section><p class="eyebrow">02 / ЛИЧНЫЕ РЕКОРДЫ</p><h3>Оставь свой результат</h3><form id="leader-form"><label class="leader-label" for="player-name">КАК ТЕБЯ ЗОВУТ?</label><div class="leader-form"><input id="player-name" name="name" maxlength="24" placeholder="Имя игрока" autocomplete="nickname"><button class="game-start" id="save-score" type="submit">Сохранить →</button></div></form><p class="leader-message" id="leader-message" role="status">Рекорды хранятся только в этом браузере.</p><table class="leader-table"><thead><tr><th scope="col">№</th><th scope="col">Игрок</th><th scope="col">Очки</th></tr></thead><tbody id="leader-list"></tbody></table></section></div>
  <div class="result-actions"><button class="game-start" id="replay">Сыграть ещё раз <span>↗</span></button><button class="outline" id="new-player">Новый игрок <span>→</span></button></div>`;
  const showShot = (i:number) => {
    const shot = snapshot.results[i];
    container.querySelectorAll<HTMLButtonElement>('[data-shot]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.shot)===i)));
    container.querySelector('#shot-detail')!.textContent = `Удар ${i+1}. Мяч ${zoneNames[shot.zone]}. ${resultNames[shot.result]} · +${shot.points} очков${shot.reactionMs === null ? '' : ` · ${Math.round(shot.reactionMs)} мс`}.${shot.errorId ? ` ${errorLabels[shot.errorId] ?? ''}.` : ''}`;
  };
  container.querySelectorAll<HTMLButtonElement>('[data-shot]').forEach(button=>button.addEventListener('click',()=>showShot(Number(button.dataset.shot))));
  showShot(0);
  const showLeaderboard = (entries: ReturnType<typeof getLeaderboard>) => {
    container.querySelector('#leader-list')!.innerHTML = entries.length ? entries.map((entry,i)=>`<tr><td>${String(i+1).padStart(2,'0')}</td><td>${escape(entry.name)}</td><td>${entry.score}</td></tr>`).join('') : '<tr><td colspan="3">Первый рекорд может быть твоим.</td></tr>';
  };
  showLeaderboard(getLeaderboard());
  let saved = false;
  container.querySelector('#leader-form')!.addEventListener('submit',event=>{
    event.preventDefault(); if(saved) return; saved = true;
    const name = container.querySelector<HTMLInputElement>('#player-name')!.value;
    showLeaderboard(saveScore(name,snapshot.score));
    const button = container.querySelector<HTMLButtonElement>('#save-score')!;
    button.disabled = true; button.classList.remove('game-start'); button.classList.add('outline'); button.textContent = 'Записано';
    container.querySelector('#leader-message')!.textContent = getLeaderboard().length ? 'Результат записан. В таблице показаны десять лучших.' : 'Результат показан. Браузер не разрешил сохранить его после закрытия страницы.';
  });
  container.querySelector('#replay')!.addEventListener('click',replay);
  container.querySelector('#new-player')!.addEventListener('click',newPlayer);
}
