import { timingSafeEqual, createHash } from 'node:crypto';
import { adminPage } from './admin.js';

const fields = ['support', 'freedom', 'donation', 'government', 'business'];
const privateHeaders = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff' };
const json = (data, status = 200) => Response.json(data, { status, headers: privateHeaders });
function authorized(request, env) {
  if (!env.ADMIN_PASSWORD) return false;
  const auth = request.headers.get('Authorization') || '';
  let decoded;
  try { decoded = atob(auth.startsWith('Basic ') ? auth.slice(6) : ''); } catch { return false; }
  const digest = s => createHash('sha256').update(s).digest();
  return timingSafeEqual(digest(decoded), digest('teacher:' + env.ADMIN_PASSWORD));
}
export function validate(data) {
  if (!data || typeof data !== 'object' || data.consent !== true || data.website) throw new Error('invalid');
  if (typeof data.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.id)) throw new Error('invalid');
  if (typeof data.cohort !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(data.cohort)) throw new Error('invalid');
  const score = data.life_evaluation;
  if (score !== null && (!Number.isInteger(score) || score < 0 || score > 10)) throw new Error('invalid');
  const values = fields.map(field => {
    const v = data[field];
    const options = field === 'freedom' ? ['満足', '不満', '回答しない'] : ['はい', 'いいえ', '回答しない'];
    if (v !== null && !options.includes(v)) throw new Error('invalid');
    return v;
  });
  if (score === null && values.every(v => v === null || v === '回答しない')) throw new Error('empty');
  return [data.id, data.cohort, score, ...values];
}
async function readSmallJson(request) {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) throw new Error('invalid');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('invalid');
  const chunks = []; let size = 0;
  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 4096) { await reader.cancel(); throw new Error('large'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/api/life-evaluation') {
        if (request.method !== 'POST') return json({error:'Method not allowed'}, 405);
        if (request.headers.get('Origin') !== url.origin) return json({error:'送信元を確認できません。'},403);
        const rate = await env.SUBMIT_LIMIT.limit({ key: request.headers.get('CF-Connecting-IP') || 'local' });
        if (!rate.success) return json({error:'送信が集中しています。1分ほど待ってから再送してください。'},429);
        let values;
        try { values = validate(await readSmallJson(request)); }
        catch { return json({error:'回答内容を確認してください。少なくとも1項目に回答してください。'},400); }
        await env.DB.prepare(`INSERT INTO life_responses (id,cohort,life_evaluation,support,freedom,donation,government,business) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING`).bind(...values).run();
        return json({ok:true});
      }
      if (url.pathname === '/admin' || url.pathname.startsWith('/admin/') || url.pathname.startsWith('/api/admin/')) {
        if (!authorized(request, env)) return new Response('先生用の集計画面です。', { status:401, headers:{...privateHeaders,'WWW-Authenticate':'Basic realm="Teacher statistics", charset="UTF-8"'} });
        if (request.method !== 'GET') return json({error:'Method not allowed'},405);
        if (url.pathname === '/admin' || url.pathname === '/admin/') return new Response(adminPage, {headers:{...privateHeaders,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'"}});
        const cohort = url.searchParams.get('cohort');
        if (url.pathname === '/api/admin/cohorts') {
          const {results} = await env.DB.prepare('SELECT cohort, COUNT(*) AS count FROM life_responses GROUP BY cohort ORDER BY cohort DESC').all();
          return json(results);
        }
        if (!cohort || !/^[a-zA-Z0-9_-]{1,64}$/.test(cohort)) return json({error:'授業回を選んでください。'},400);
        if (url.pathname === '/api/admin/stats') {
          const {results: rows} = await env.DB.prepare('SELECT life_evaluation,support,freedom,donation,government,business FROM life_responses WHERE cohort=?').bind(cohort).all();
          const scores=rows.map(r=>r.life_evaluation).filter(v=>v!==null).sort((a,b)=>a-b), n=scores.length;
          const answers=Object.fromEntries(fields.map(f=>[f,rows.reduce((acc,r)=>{const key=r[f]||'未回答';acc[key]=(acc[key]||0)+1;return acc;},{})]));
          const comparisons = Object.fromEntries(['support','freedom'].map(f=>[f,Object.entries(answers[f]).filter(([k])=>!['未回答','回答しない'].includes(k)).map(([label])=>{const s=rows.filter(r=>r[f]===label&&r.life_evaluation!==null).map(r=>r.life_evaluation);return {label,n:s.length,mean:s.length?s.reduce((a,b)=>a+b,0)/s.length:null};})]));
          return json({total:rows.length,n,mean:n?scores.reduce((a,b)=>a+b,0)/n:null,median:n?(scores[Math.floor((n-1)/2)]+scores[Math.floor(n/2)])/2:null,histogram:Array.from({length:11},(_,i)=>scores.filter(s=>s===i).length),answers,comparisons});
        }
        if (url.pathname === '/api/admin/export.csv') {
          const {results} = await env.DB.prepare('SELECT submitted_at,cohort,life_evaluation,support,freedom,donation,government,business FROM life_responses WHERE cohort=? ORDER BY submitted_at').bind(cohort).all();
          const keys=['submitted_at','cohort','life_evaluation',...fields];
          const cell=v=>'"'+String(v??'').replaceAll('"','""')+'"';
          return new Response('\uFEFF'+[['回答日時（UTC）','授業回','人生評価','社会的支援','自由','寄付','政府の腐敗','企業の腐敗'],...results.map(r=>keys.map(k=>r[k]))].map(row=>row.map(cell).join(',')).join('\r\n'),{headers:{...privateHeaders,'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="life-evaluation.csv"'}});
        }
        return json({error:'Not found'},404);
      }
      if (url.pathname.startsWith('/api/')) return json({error:'Not found'},404);
      return env.ASSETS.fetch(request);
    } catch {
      console.error(JSON.stringify({message:'request_failed',path:url.pathname}));
      return json({error:'現在処理できません。少し待ってからもう一度お試しください。'},503);
    }
  }
};
