const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const page=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const source=page.match(/<script id="card-core">([\s\S]*?)<\/script>/)[1];
const Cards=vm.runInNewContext(source+';Cards');
const normalize=x=>JSON.parse(JSON.stringify(x));

test('parses the exact single-card clipboard format used by Side Story',()=>{
  const result=Cards.parse('**요청**\n\n질문\n\n첫 문단\n\n둘째 문단\n\n**속마음**\n\n생각');
  assert.deepEqual(normalize(result.cards),[{request:'질문',spoken:'첫 문단\n\n둘째 문단',inner:'생각'}]);
});
test('multi-card export keeps internal horizontal rules and removes only the card separator',()=>{
  const result=Cards.parse('**요청 1**\n\n질문 1\n\n답변\n\n---\n\n계속\n\n**속마음**\n\n생각\n\n---\n\n**요청 2**\n\n질문 2\n\n다음 답변');
  assert.equal(result.cards.length,2);
  assert.equal(result.cards[0].spoken,'답변\n\n---\n\n계속');
  assert.equal(result.cards[0].inner,'생각');
  assert.equal(result.cards[1].spoken,'다음 답변');
});
test('raw blocks, Q/A normalization and incomplete responses mirror Side Story parsing',()=>{
  const result=Cards.parse('<sideb-response><request>질문</request><spoken>Q. 질문\n\nA. 답변</spoken><inner>생각</inner></sideb-response>\n<sideb-response><request>두 번째</request><spoken>미완료');
  assert.equal(result.cards.length,2);
  assert.equal(result.cards[0].spoken,'답변');
  assert.equal(result.cards[1].spoken,'미완료');
});
test('empty, CRLF and plain text fallback',()=>{
  assert.equal(Cards.parse(' \n ').cards.length,0);
  assert.equal(Cards.parse('**요청**\r\n\r\n질문\r\n\r\n답변').cards[0].spoken,'답변');
  assert.equal(Cards.parse('본문\n\n**속마음**\n\n생각').cards[0].inner,'생각');
  assert.equal(Cards.parse('본문').cards[0].request,'');
  assert.ok(Cards.parse('본문').warning);
});
test('deck export uses scoped CSS and unique radio names without scripts or iframe',()=>{
  const cards=[{request:'하나',spoken:'답변',inner:'생각'},{request:'둘',spoken:'답변',inner:''}];
  const html=Cards.build(cards,{},'ss-test');
  assert.match(html,/id="ss-test-r0"/);
  assert.match(html,/for="ss-test-r1"/);
  assert.match(html,/#ss-test-r1:checked~\.ss-slides>\.ss-slide:nth-child\(2\)/);
  assert.doesNotMatch(html,/<script|<iframe|onclick=/i);
  assert.match(Cards.build(cards,{},'ss-other'),/name="ss-other-cards"/);
  assert.match(Cards.documentOf(html),/default-src 'none'/);
});
test('stack, hidden inner thoughts, open inner thoughts and single-card mode',()=>{
  const cards=[{request:'질문',spoken:'답변',inner:'SECRET'},{request:'둘',spoken:'다음',inner:''}];
  const stack=Cards.build(cards,{layout:'stack',includeInner:false});
  assert.doesNotMatch(stack,/type="radio"|SECRET/);
  assert.match(Cards.build(cards,{openInner:true}),/<details[^>]+open="open"/);
  assert.doesNotMatch(Cards.build(cards.slice(0,1)),/type="radio"/);
});
test('injection cannot become active HTML in requests, answers, thoughts or options',()=>{
  const bad='<script>alert(1)</script><img src=x onerror=alert(1)><svg onload=alert(1)><iframe src=x></iframe>';
  const html=Cards.build([{request:bad,spoken:bad+'<b onclick="alert(1)">굵게</b>',inner:bad}],{asker:bad,accent:'red;}</style><script>alert(1)</script>'});
  assert.doesNotMatch(html,/<(?:script|img|svg|iframe)\b/i);
  assert.doesNotMatch(html,/<[^>]+\son\w+=/i);
  assert.match(html,/&lt;script&gt;/);
  assert.match(html,/<b>굵게<\/b>/);
  assert.equal(Cards.normalize({accent:'invalid',size:999,width:'9999'}).size,24);
});
test('Markdown rendering preserves emphasis, line breaks, lists and fenced code',()=>{
  const html=Cards.rich('**굵게**와 *기울임*\n줄바꿈\n\n- 항목\n- 둘\n\n```html\n<script>x</script>\n```');
  assert.match(html,/<strong>굵게<\/strong>/);
  assert.match(html,/<em>기울임<\/em>/);
  assert.match(html,/<br>줄바꿈/);
  assert.match(html,/<ul /);
  assert.match(html,/&lt;script&gt;x&lt;\/script&gt;/);
});
