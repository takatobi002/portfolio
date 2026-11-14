'use strict';
function calculate(values) {
  if(values.length!==10||values.some(v=>!Number.isInteger(v)||v<1||v>7)) throw new Error('全項目に回答してください');
  const scored=values.map((v,i)=>i===0||i===6?8-v:v);
  const promotion=scored.slice(0,5).reduce((a,b)=>a+b,0)/5;
  const prevention=scored.slice(5).reduce((a,b)=>a+b,0)/5;
  return {promotion,prevention,difference:Math.round((promotion-prevention)*10)/10};
}
const form=document.querySelector('#check'),result=document.querySelector('#result');
form.addEventListener('change',()=>{const n=form.querySelectorAll('input:checked').length;document.querySelector('#count').textContent=`${n} / 10 問 回答済み`;document.querySelector('#progress').value=n;});
form.addEventListener('submit',event=>{
 event.preventDefault();if(!form.reportValidity())return;
 const data=new FormData(form),values=Array.from({length:10},(_,i)=>Number(data.get(`RF_Scale_${String(i+1).padStart(2,'0')}_MX`))),scores=calculate(values);
 for(const key of ['promotion','prevention']){document.querySelector(`#${key}`).textContent=scores[key].toFixed(1);document.querySelector(`#${key}-meter`).value=scores[key];}
 const description=scores.difference>0?'今回の回答では、促進焦点の得点が高くなりました。':scores.difference<0?'今回の回答では、予防焦点の得点が高くなりました。':'今回の回答では、2つの得点は同じでした。';
 document.querySelector('#comparison').textContent=`${description} 差得点（促進 − 予防）：${scores.difference>0?'+':''}${scores.difference.toFixed(1)}。これは得点の比較であり、タイプを分ける基準ではありません。`;
 form.hidden=true;result.hidden=false;result.focus();result.scrollIntoView({block:'start'});
});
document.querySelector('#edit').addEventListener('click',()=>{result.hidden=true;form.hidden=false;form.querySelector('input').focus();});
document.querySelector('#restart').addEventListener('click',()=>{if(!window.confirm('回答をすべて消して、最初から回答しますか？'))return;form.reset();form.dispatchEvent(new Event('change'));result.hidden=true;form.hidden=false;form.querySelector('input').focus();});
