import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
const siteURL=process.env.SITE_URL?new URL(process.env.SITE_URL):null;
if(siteURL&&(!['http:','https:'].includes(siteURL.protocol)||siteURL.username||siteURL.password||siteURL.search||siteURL.hash))throw new Error('SITE_URL must be an HTTP(S) site root without credentials, query or fragment.');
const canonical=siteURL?siteURL.href.replace(/\/?$/, '/'): './';
const indexPath='dist/index.html';
const context=vm.createContext({});
vm.runInContext(fs.readFileSync('dist/content.js','utf8'),context);
const data=JSON.parse(vm.runInContext('JSON.stringify({domains,lessons,videos,sources,commands,weeks,mockA,mockB})',context));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const index=fs.readFileSync(indexPath,'utf8').replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${esc(canonical)}">`);
fs.writeFileSync(indexPath,index);
const pre=s=>`<pre><code>${esc(s)}</code></pre>`;
let html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>CKA Open Handbook — complete printable edition</title><style>body{max-width:900px;margin:auto;padding:30px;font:16px/1.7 system-ui;color:#172b25}h1,h2,h3{line-height:1.25}h1{font-size:40px}h2{margin-top:50px;border-bottom:2px solid #23765b;padding-bottom:10px}a{color:#23765b}pre{padding:20px;background:#eef3ef;white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px}article{border-bottom:1px solid #ddd;padding-bottom:25px}aside{padding:20px;background:#eef3ef}li{margin:8px 0}table{border-collapse:collapse;width:100%}td,th{padding:10px;border:1px solid #ddd;text-align:left}@media print{body{padding:0;font-size:11pt}h2{break-before:page}pre{font-size:9pt}.no-print{display:none}}</style></head><body><p class="no-print"><a href="index.html">← Interactive handbook</a> · Print this page using your browser’s Print command.</p><h1>CKA Open Handbook</h1><p>Free practical preparation by <a href="https://ahsan2000.github.io/portfolio">Ahsan Nawaz</a> · Research checked October 30, 2026.</p><aside>Independent study resource. Completion does not guarantee passing. Official CKA: 2 hours; passing score 66%; live FAQ lists Kubernetes v1.37 at review time. Recheck the official FAQ and allowed-resource policies before booking. Preparation is free; the official certification exam is paid. Commands are lab examples, sometimes fragments or templates; read prerequisites and replace placeholders. Use disposable environments.</aside><h2>Exam domains</h2><table><tr><th>Domain</th><th>Weight</th></tr>${data.domains.map(d=>`<tr><td>${esc(d.title)}</td><td>${d.weight}%</td></tr>`).join('')}</table><h2>Study roadmap</h2>${data.weeks.map(([t,items],i)=>`<h3>Week ${i+1}: ${esc(t)}</h3><ul>${items.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`).join('')}<h2>Curriculum</h2><ul>${data.lessons.map(l=>`<li><a href="#${l.id}">${esc(l.title)}</a></li>`).join('')}</ul>`;
let md='# CKA Open Handbook\n\nBy [Ahsan Nawaz](https://ahsan2000.github.io/portfolio). Original educational material: CC BY 4.0. Research checked October 30, 2026.\n\nIndependent preparation; no passing guarantee. Use disposable labs. Official exam fee is separate. See the live Linux Foundation FAQ and candidate handbook before booking.\n\n';
for(const group of ['foundations',...data.domains.map(d=>d.id)]){
const title=group==='foundations'?'Foundations':data.domains.find(d=>d.id===group).title;
html+=`<h2>${esc(title)}</h2>`;md+=`## ${title}\n\n`;
for(const l of data.lessons.filter(l=>l.domain===group)){
html+=`<article id="${l.id}"><h3>${esc(l.title)}</h3><p>${esc(l.concept)}</p><h4>Work through it</h4><ol>${l.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol>${pre(l.command)}<p><b>Verify:</b> ${esc(l.verify)}</p><p><b>Watch out:</b> ${esc(l.pitfall)}</p><p><a href="${esc(l.doc)}">Primary documentation</a></p>${l.video?`<p>Video: <a href="https://www.youtube.com/watch?v=${data.videos[l.video].id}">${esc(data.videos[l.video].title)}</a> — ${esc(data.videos[l.video].author)}. ${esc(data.videos[l.video].note)}</p>`:''}</article>`;
md+=`### ${l.title}\n\n${l.concept}\n\n${l.steps.map((s,i)=>`${i+1}. ${s}`).join('\n')}\n\n\`\`\`\n${l.command}\n\`\`\`\n\n**Verify:** ${l.verify}\n\n**Watch out:** ${l.pitfall}\n\nDocumentation: ${l.doc}\n\n`;
}
}
html+='<h2>Command reference</h2>';md+='## Command reference\n\n';
for(const [category,title,desc,cmd] of data.commands){html+=`<h3>${esc(category)}: ${esc(title)}</h3><p>${esc(desc)}</p>${pre(cmd)}`;md+=`### ${title}\n\n${desc}\n\n\`\`\`\n${cmd}\n\`\`\`\n\n`;}
html+='<h2>Original mock exams</h2><p>120 minutes each. Prepare the required controllers, policy-enforcing CNI, storage and disposable kubeadm VM lab before starting. Self-grade only after verifying every requested outcome. The weight split matches the five official domain percentages; this practice score is not the official scoring system.</p>';
md+='## Original mock exams\n\n120 minutes each. See website for timer, prerequisites and self-assessment.\n\n';
for(const [name,tasks] of [['A',data.mockA],['B',data.mockB]]){html+=`<h3>Mock ${name}</h3>`;md+=`### Mock ${name}\n\n`;for(const [title,points,task,hint] of tasks){html+=`<article><h4>${esc(title)} · ${points} points</h4><p>${esc(task)}</p><p><b>Approach and verification:</b> ${esc(hint)}</p></article>`;md+=`**${title} (${points})**: ${task}\n\nApproach/verification: ${hint}\n\n`;}}
html+='<h2>Sources and attribution</h2>';md+='## Sources\n\n';
for(const [t,d,url,type] of data.sources){html+=`<p><a href="${esc(url)}">${esc(t)}</a> (${esc(type)}). ${esc(d)}</p>`;md+=`- [${t}](${url}) — ${d}\n`;}
html+='<p>Original teaching text and labs: CC BY 4.0. Website code: MIT. External videos, documentation and other assets retain their respective licenses.</p></body></html>';
fs.writeFileSync('dist/handbook.html',html);fs.writeFileSync('HANDBOOK.md',md);
console.log(`Built complete HTML and Markdown handbooks: ${data.lessons.length} modules, ${data.commands.length} command groups, 24 mock tasks.`);
