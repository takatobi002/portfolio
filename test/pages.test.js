import test from 'node:test';
import assert from 'node:assert/strict';
import pages from '../pages/worker.js';
test('Pages serves existing assets and forwards private paths with original URL and authentication',async()=>{
  for (const path of ['/api/life-evaluation','/api/admin/cohorts','/admin','/admin/']) {
    const request=new Request('https://www.chitabea.com'+path,{headers:{Authorization:'Basic test',Origin:'https://www.chitabea.com'}});
    let called=false;
    const response=await pages.fetch(request,{BACKEND:{fetch(r){called=true;assert.equal(r,request);return new Response('private',{status:401})}},ASSETS:{fetch(){throw Error('private route exposed')}}});
    assert.ok(called);assert.equal(response.status,401);
  }
  const response=await pages.fetch(new Request('https://www.chitabea.com/life-evaluation/'),{ASSETS:{fetch(){return new Response('worksheet')}},BACKEND:{fetch(){throw Error('wrong backend')}}});
  assert.equal(await response.text(),'worksheet');
});
