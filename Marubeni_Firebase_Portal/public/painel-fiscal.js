import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {getFirestore,collection,doc,onSnapshot,updateDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {firebaseConfig} from './firebase-config.js';
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app),el=id=>document.getElementById(id);
let records=[],selected=null,view='all',unsub=null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fiscal=u=>u&&!u.isAnonymous&&!!u.email&&u.emailVerified;
function refresh(){
 const all=records.filter(x=>x.status!=='Rascunho');
 const count=s=>all.filter(x=>x.status===s).length;
 el('stats').innerHTML=[['Total recebido',all.length],['Pendente Fiscal',count('Pendente Fiscal')],['Aprovado Fiscal',count('Aprovado Fiscal')],['Correção solicitada',count('Correção solicitada')]].map(([a,b])=>`<div class="card"><span class="muted">${a}</span><b>${b}</b></div>`).join('');
 const q=el('search').value.toLowerCase(),f=el('filter').value;
 const items=records.filter(x=>x.status!=='Rascunho'&&(!['Pendente Fiscal','Aprovado Fiscal','Correção solicitada'].includes(view)||x.status===view)&& (f==='all'||x.status===f) && [x.id,x.answers?.name,x.answers?.taxId].some(v=>String(v||'').toLowerCase().includes(q)));
 el('rows').innerHTML=items.length?items.map(x=>`<tr><td>${esc(x.id.slice(0,13))}</td><td><b>${esc(x.answers?.name)}</b><br><span class="muted">${esc(x.answers?.type)}</span></td><td>${esc(x.answers?.taxId)}</td><td>${esc(x.answers?.product)}</td><td><span class="pill ${x.status==='Aprovado Fiscal'?'good':x.status==='Correção solicitada'?'bad':''}">${esc(x.status)}</span></td><td><button data-id="${esc(x.id)}">Analisar →</button></td></tr>`).join(''):'<tr><td colspan="6">Nenhum cadastro encontrado.</td></tr>';
 el('rows').querySelectorAll('button[data-id]').forEach(b=>b.onclick=()=>open(b.dataset.id));
}
function open(id){selected=records.find(x=>x.id===id);if(!selected)return;
 el('listing').classList.add('hidden');el('stats').classList.add('hidden');el('detail').classList.remove('hidden');
 el('detail-title').textContent=selected.answers?.name||'Produtor';el('detail-meta').textContent=`Protocolo ${id} · ${selected.status}`;
 el('answers').innerHTML='<h3>Respostas da entrevista</h3><dl>'+Object.entries(selected.answers||{}).filter(([k])=>!['createdAt','updatedAt'].includes(k)).map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(typeof v==='object'?JSON.stringify(v):v)}</dd>`).join('')+'</dl>';
 el('memo').value=selected.fiscal?.memo||'';
}
function back(){selected=null;el('listing').classList.remove('hidden');el('stats').classList.remove('hidden');el('detail').classList.add('hidden');refresh();}
async function decide(status){if(!selected)return;const memo=el('memo').value.trim();if(!memo){alert('Informe o parecer fiscal antes de decidir.');return;}
 if(!confirm(`Confirmar: ${status}?`))return;
 try{await updateDoc(doc(db,'entrevistas',selected.id),{status,fiscal:{memo,reviewer:auth.currentUser.email,reviewAt:new Date().toISOString()},updatedAt:serverTimestamp()});back();}
 catch(e){alert('Não foi possível salvar a decisão: '+e.message);}
}
function exportCsv(){const items=records.filter(x=>x.status==='Aprovado Fiscal');if(!items.length){alert('Nenhum cadastro aprovado para exportar.');return;}
 const keys=[...new Set(items.flatMap(x=>Object.keys(x.answers||{})))];const cols=['Protocolo','Status','Analista','Data_Aprovacao','Parecer',...keys];
 const safe=v=>'"'+String(v??'').replace(/^[=+@\-]/,"'$&").replace(/"/g,'""')+'"';
 const rows=items.map(x=>[x.id,x.status,x.fiscal?.reviewer,x.fiscal?.reviewAt,x.fiscal?.memo,...keys.map(k=>x.answers?.[k])]);
 const blob=new Blob(['\uFEFF'+[cols,...rows].map(r=>r.map(safe).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'});
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='Marubeni_Produtores_Aprovados.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);
}
el('search').oninput=refresh;el('filter').onchange=refresh;el('back').onclick=back;el('approve').onclick=()=>decide('Aprovado Fiscal');el('correct').onclick=()=>decide('Correção solicitada');el('export').onclick=exportCsv;
document.querySelectorAll('nav button[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('active',x===b));el('heading').textContent=view==='saved'?'Formulários salvos':view==='all'?'Central de aprovação fiscal':view;back();});
onAuthStateChanged(auth,u=>{
 if(unsub){unsub();unsub=null;}
 if(!fiscal(u)){el('state').textContent='Acesso restrito. Entre pelo login Fiscal na página principal e verifique o e-mail da conta.';el('listing').classList.add('hidden');el('stats').classList.add('hidden');return;}
 el('state').textContent='Conectado: '+u.email+' · carregando cadastros...';
 // A sessao anonima pode ter ocultado a lista antes do login Fiscal.
 el('listing').classList.remove('hidden');
 el('stats').classList.remove('hidden');
 el('detail').classList.add('hidden');
 selected=null;
 unsub=onSnapshot(collection(db,'entrevistas'),snap=>{
   records=snap.docs.map(d=>({id:d.id,...d.data()}));
   el('state').textContent='Conectado: '+u.email+' · '+records.length+' cadastro(s) recebido(s) do Firebase';
   refresh();
 },e=>{
   el('state').textContent='Erro de leitura do Firestore: '+e.message;
   console.error('Falha ao consultar entrevistas:',e);
 });
});
