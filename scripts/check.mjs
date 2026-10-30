import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const elements=new Map();
function el(selector){if(!elements.has(selector))elements.set(selector,{innerHTML:'',textContent:'',value:'',classList:{toggle(){},add(){},remove(){},contains(){return false;}},setAttribute(){},removeAttribute(){},addEventListener(){},focus(){},showModal(){this.open=true;},close(){this.open=false;}});return elements.get(selector);}
const storage=new Map();
const context=vm.createContext({console,URL,Blob,setTimeout,clearInterval,setInterval,requestAnimationFrame:fn=>fn(),location:{hash:'#overview'},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},navigator:{},document:{querySelector:el,querySelectorAll:()=>[],getElementById:()=>null,addEventListener(){},body:el('body'),activeElement:{tagName:'BODY'}},window:{addEventListener(){},scrollTo(){}}});
vm.runInContext(fs.readFileSync('dist/content.js','utf8'),context);
vm.runInContext(fs.readFileSync('dist/app.js','utf8'),context);
const run=s=>vm.runInContext(s,context);
assert.equal(run('lessons.length'),34);assert.equal(run('new Set(lessons.map(l=>l.id)).size'),34);
assert.equal(run('domains.reduce((s,d)=>s+d.weight,0)'),100);
for(const mock of ['mockA','mockB'])assert.equal(run(`${mock}.reduce((s,t)=>s+t[1],0)`),100);
for(const id of ['overview','roadmap','foundations','cluster','workloads','networking','storage','troubleshooting','commands','tools','videos','mock','exam-day','resources']){run(`location.hash='#${id}';render()`);assert.ok(el('#main').innerHTML.length>500,`route ${id} empty`);assert.ok(!el('#main').innerHTML.includes('undefined'),`route ${id} undefined`);}
run("location.hash='#commands';render()");el('#command-search').value='rollout';run('renderCommands()');assert.ok(el('#command-list').innerHTML.includes('Scale and roll out'));
el('#command-search').value='no-such-command-xyz';run('renderCommands()');assert.ok(el('#command-list').innerHTML.includes('No commands match'));
run("completed=['terminal','lab-setup'];updateProgress()");assert.equal(el('#progress').value,6);
run("selectedMock='A';checklist={'mock-A-0':true,'mock-A-1':true};updateScore()");assert.equal(el('#mock-score').textContent,'18 / 100');
assert.equal(run('formatTime(7200)'),'02:00:00');assert.equal(run('formatTime(0)'),'00:00:00');
run("search('etcd')");assert.ok(el('#search-results').innerHTML.includes('#troubleshooting/etcd'));
const lessons=JSON.parse(run('JSON.stringify(lessons)'));for(const l of lessons){assert.ok(l.concept.length>100,l.id);assert.ok(l.steps.length>=3,l.id);assert.ok(l.command.length>50,l.id);assert.match(l.doc,/^https:\/\//);if(l.video)assert.ok(run(`Boolean(videos[${JSON.stringify(l.video)}])`));}
for(const path of ['dist/index.html','dist/style.css','dist/mark.svg','dist/handbook.html','dist/labs.zip'])assert.ok(fs.statSync(path).size>0);
console.log('PASS: 14 page render functions, 34 complete modules, unique IDs, 100% domain weights, mock totals and scoring, progress calculation, command filters, search results and timer formatting. Browser layout/playback and Kubernetes execution remain unverified.');
