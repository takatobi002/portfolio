import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../pages/functions/[[path]].js';
test('Pages gateway preserves URL, origin, authentication and private response', async () => {
  for (const path of ['/api/life-evaluation', '/api/admin/cohorts', '/admin', '/admin/']) {
    const request = new Request('https://www.chitabea.com' + path, {headers:{Authorization:'Basic test',Origin:'https://www.chitabea.com'}});
    const response = await onRequest({request, env:{BACKEND:{fetch(r){
      assert.equal(r,request);
      return new Response('private',{status:401,headers:{'Cache-Control':'no-store'}});
    }}}});
    assert.equal(response.status,401);
    assert.equal(response.headers.get('cache-control'),'no-store');
  }
});
