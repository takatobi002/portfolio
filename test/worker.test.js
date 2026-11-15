import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { validate } from '../worker/index.js';

const valid = () => ({id:crypto.randomUUID(),cohort:'test-class',consent:true,life_evaluation:0,support:'はい',freedom:'満足',donation:null,government:'回答しない',business:'いいえ'});
test('zero and missing answers stay distinct; invalid consent, scores and choices fail',()=>{
  assert.equal(validate(valid())[2],0);
  for(const patch of [{consent:false},{life_evaluation:11},{life_evaluation:'7'},{support:'<script>'},{cohort:'=CMD()'},{life_evaluation:null,support:null,freedom:null,business:null}]) assert.throws(()=>validate({...valid(),...patch}));
});
test('admin HTML, statistics and CSV require authentication and never cache data',async()=>{
  for(const path of ['/admin','/admin/','/api/admin/cohorts','/api/admin/stats?cohort=test-class','/api/admin/export.csv?cohort=test-class']){
    const r=await worker.fetch(new Request('https://example.com'+path),{ADMIN_PASSWORD:'test-secret'});
    assert.equal(r.status,401);assert.equal(r.headers.get('cache-control'),'no-store');
  }
  const r=await worker.fetch(new Request('https://example.com/admin',{headers:{authorization:'Basic '+btoa('teacher:test-secret')}}),{ADMIN_PASSWORD:'test-secret'});
  assert.equal(r.status,200);assert.match(await r.text(),/先生用集計/);
});
test('submission rejects foreign origins before touching storage',async()=>{
  const r=await worker.fetch(new Request('https://example.com/api/life-evaluation',{method:'POST',headers:{origin:'https://foreign.example','content-type':'application/json'},body:JSON.stringify(valid())}),{});
  assert.equal(r.status,403);
});
