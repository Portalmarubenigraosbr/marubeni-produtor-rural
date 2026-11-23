
import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {getFirestore,collection,doc,onSnapshot,serverTimestamp,getDoc,getDocs,setDoc,addDoc,runTransaction} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {firebaseConfig} from './firebase-config.js';

const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app),$=id=>document.getElementById(id);

const stages=[
  {"id":"ident","title":"Quem está vendendo?","fields":[
    {"key":"operationDate","label":"Data prevista da venda à Marubeni"},
    {"key":"name","label":"Nome completo / razão social"},
    {"key":"type","label":"Tipo de fornecedor"},
    {"key":"taxId","label":"CPF / CNPJ"},
    {"key":"ie","label":"Inscrição estadual / inscrição de produtor"},
    {"key":"address","label":"Endereço completo"},
    {"key":"additionalCnpjs","label":"CNPJs adicionais"},
    {"key":"contact","label":"Nome do produtor / representante responsável pelas informações"},
    {"key":"phone","label":"Telefone / WhatsApp"},
    {"key":"email","label":"E-mail"},
    {"key":"accountant","label":"Contador / escritório e CRC (opcional)"},
    {"key":"accountantConfirmed","label":"O contador validou o enquadramento informado? (opcional)"},
    {"key":"accountantContact","label":"Contato do contador (opcional)"},
    {"key":"registry","label":"CAEPF / identificação IBS-CBS e situação cadastral"}
  ]},
  {"id":"origin","title":"De onde vem a produção?","fields":[
    {"key":"area","label":"Relação principal com a área"},
    {"key":"own","label":"Esta operação envolve somente produção própria?"},
    {"key":"third","label":"Também comercializa grãos de terceiros?"},
    {"key":"thirdDetails","label":"Origem de terceiros e segregação dos lotes"},
    {"key":"ruralOnly","label":"As atividades são exclusivamente rurais?"},
    {"key":"otherActivities","label":"Outras atividades e respectivas receitas"},
    {"key":"integration","label":"Existe contrato de integração vertical?"},
    {"key":"integrationOperation","label":"Esta operação decorre do contrato de integração?"},
    {"key":"integrationDetails","label":"Integrador, CNPJ, contrato, vigência e remuneração"}
  ]},
  {"id":"regime","title":"Qual é o regime declarado?","fields":[
    {"key":"simple","label":"A pessoa jurídica é optante pelo Simples Nacional?"},
    {"key":"hybrid","label":"Apura IBS/CBS fora do DAS, pelo regime regular?"},
    {"key":"hybridStart","label":"Início dos efeitos da opção pelo regime regular"},
    {"key":"hybridEnd","label":"Fim do período comprovado da opção"},
    {"key":"option","label":"Houve opção voluntária pelo regime regular?"},
    {"key":"optionRequest","label":"Data do pedido de opção"},
    {"key":"optionStart","label":"Início dos efeitos da opção comprovado"},
    {"key":"renunciation","label":"Houve renúncia de opção anterior?"},
    {"key":"renunciationDate","label":"Data da renúncia"},
    {"key":"renunciationEffect","label":"Início dos efeitos da renúncia informado pelo contador"},
    {"key":"optionEvidence","label":"Referência dos comprovantes de opção / renúncia"}
  ]},
  {"id":"structure","title":"Há vínculos que mudam o enquadramento?","fields":[
    {"key":"participation","label":"Possui participação em outra PJ agropecuária?"},
    {"key":"participations","label":"CNPJ, nome, participação e receitas por ano de cada PJ"},
    {"key":"coopMembers","label":"Todos os integrantes são produtores PF abaixo do limite aplicável?"},
    {"key":"coopDetails","label":"Quantidade, relação dos integrantes e evidência de receitas"}
  ]},
  {"id":"revenue","title":"Como está a receita rural?","fields":[
    {"key":"revenueKnown","label":"Há dados de receita suficientes para a análise?"},
    {"key":"started","label":"Iniciou a atividade no ano da operação?"},
    {"key":"startDate","label":"Início da atividade"},
    {"key":"revenue2024","label":"Receita rural de 2024 (R$)"},
    {"key":"previousRevenue","label":"Receita rural do ano anterior (R$)"},
    {"key":"currentRevenue","label":"Receita rural acumulada no ano da operação (R$)"},
    {"key":"revenueThrough","label":"Receita apurada até"},
    {"key":"projection","label":"Receita rural projetada até 31/12 (R$)"},
    {"key":"combinedPrevious","label":"Receita TOTAL combinada do ano anterior (R$)"},
    {"key":"combinedCurrent","label":"Receita TOTAL combinada acumulada (R$)"},
    {"key":"segregation","label":"Existem receitas que exigem segregação?"},
    {"key":"revenueMemo","label":"Memória de apuração e segregações"},
    {"key":"excessDate","label":"Data em que ultrapassou o limite"},
    {"key":"excess20Date","label":"Data em que ultrapassou 120% do limite"},
    {"key":"revenueEvidence","label":"Referência da declaração / relatório de receita"}
  ]},
  {"id":"product","title":"O que será adquirido?","fields":[
    {"key":"product","label":"Produtos (selecione um ou mais)"},
    {"key":"description","label":"Descrição comercial e finalidade"},
    {"key":"ncm","label":"NCM informado"},
    {"key":"natural","label":"Todos os produtos selecionados são vendidos in natura?"},
    {"key":"process","label":"Processos realizados antes da entrega"},
    {"key":"processDetail","label":"Processos, matéria-prima e diferenças entre produtos (opcional)"},
    {"key":"mixed","label":"Há mistura de lotes próprios e de terceiros?"}
  ]},
  {"id":"invoice","title":"Como será emitida a nota?","fields":[
    {"key":"invoice","label":"Documento emitido"},
    {"key":"issuer","label":"Responsável pela emissão"},
    {"key":"system","label":"Sistema, modelo / série e estabelecimento emitente"},
    {"key":"ready","label":"Sistema preparado para os campos IBS/CBS aplicáveis?"},
    {"key":"registration","label":"Inscrições e cadastros exigidos estão ativos e regulares?"},
    {"key":"buyerInvoice","label":"Está ciente da emissão pelo adquirente quando exigida para crédito presumido?"},
    {"key":"ruralTaxes","label":"FUNRURAL, RAT/GILRAT, SENAR e sub-rogação"},
    {"key":"invoiceEvidence","label":"Referência da nota de amostra / validação do sistema"}
  ]},
  {"id":"payment","title":"Como será contratado e pago?","fields":[
    {"key":"contract","label":"Modalidade principal"},
    {"key":"advance","label":"Há adiantamento antes da entrega?"},
    {"key":"advanceAmount","label":"Valor do adiantamento (R$)"},
    {"key":"advanceDate","label":"Data do adiantamento"},
    {"key":"payment","label":"Forma de liquidação"},
    {"key":"samePayee","label":"O beneficiário é o mesmo CPF/CNPJ do vendedor?"},
    {"key":"payeeDetail","label":"Beneficiário, fundamento e documento da destinação"},
    {"key":"reconciliation","label":"Consegue conciliar pagamentos com notas e contratos?"},
    {"key":"cpr","label":"Existe CPR, cessão ou trava financeira vinculada?"},
    {"key":"cprDetail","label":"Instrumento, instituição e impactos"}
  ]},
  {"id":"logistics","title":"Qual é o caminho da mercadoria?","fields":[
    {"key":"freight","label":"Responsável pelo frete"},
    {"key":"carrier","label":"Tipo de transportador"},
    {"key":"freightIncluded","label":"O frete está incluído no preço?"},
    {"key":"delivery","label":"Local de entrega, município/UF e identificação"},
    {"key":"export","label":"Compra com fim específico de exportação?"},
    {"key":"exportInvoice","label":"Consegue emitir conforme orientação da exportadora?"},
    {"key":"warehouse","label":"Haverá armazém / terminal de terceiro?"},
    {"key":"warehouseDetail","label":"Armazém / terminal e CNPJ"},
    {"key":"trace","label":"É possível rastrear lote, quantidade, nota e destinação?"}
  ]},
  {"id":"declaration","title":"Confirme as informações","fields":[
    {"key":"declarant","label":"Nome do declarante e qualidade da representação"},
    {"key":"declarationRef","label":"Confirmação do responsável (nome completo)"},
    {"key":"notes","label":"Observações e pendências adicionais"},
    {"key":"accept","label":"Você confirma as informações e se compromete a comunicar alterações?"}
  ]}
];

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;',
  '<':'&lt;',
  '>':'&gt;',
  '"':'&quot;',
  "'":'&#39;'
}[c]));

const authorized=u=>!!u&&!u.isAnonymous&&!!u.email&&u.emailVerified;

let records=[],selectedId=null,unsub=null,checked={},activeFilter='all',saving=false;
let userProfile=null,workflowPermissions={},workflowDecisions={},workflowBusy=false,allWorkflowDecisions={},workflowUnsub=null,adminOpen=false;

const isVisible=r=>r.status!=='Rascunho';

const badge=s=>`<span class="pill ${s==='Aprovado Fiscal'?'approved':s==='Correção solicitada'?'correction':'pending'}">${esc(s||'Pendente Fiscal')}</span>`;

const valueText=v=>Array.isArray(v)?v.map(x=>x&&typeof x==='object'&&'cnpj' in x?`CNPJ: ${x.cnpj||''} | Endereço: ${x.address||''} | IE: ${x.ie||''}`:x&&typeof x==='object'?JSON.stringify(x):String(x)).join('; '):v&&typeof v==='object'?JSON.stringify(v):String(v??'');

const current=()=>records.find(r=>r.id===selectedId);

function groups(r){
  const a=r.answers||{},seen=new Set(),out=[];

  for(const stage of stages){
    const entries=[];

    for(const f of stage.fields){
      if(Object.prototype.hasOwnProperty.call(a,f.key)){
        entries.push([f.label,a[f.key]]);
        seen.add(f.key);
      }
    }

    if(entries.length){
      out.push({
        id:stage.id,
        title:stage.title,
        entries
      });
    }
  }

  const extra=Object.entries(a).filter(([k])=>
    !seen.has(k)&&
    !['id','createdAt','updatedAt','completedAt','ruleVersion','status'].includes(k)
  );

  if(extra.length){
    out.push({
      id:'additional',
      title:'Informações adicionais e campos condicionais',
      entries:extra
    });
  }

  return out;
}

function producerWorkflow(id){
  const decisions=allWorkflowDecisions[id]||{};
  const approved=workflowResponsibilities.filter(s=>decisions[s.number]?.status==='Aprovado').length;
  const needsCorrection=workflowResponsibilities.filter(s=>decisions[s.number]?.status==='Correção solicitada');
  const pending=workflowResponsibilities.filter(s=>!decisions[s.number]||decisions[s.number].status!=='Aprovado');
  const owners=[...new Set(pending.flatMap(s=>workflowPermissions[s.number]||DEFAULT_PERMISSIONS[s.number]||[]))];
  return {decisions,approved,needsCorrection,pending,owners};
}
function producerWorkflowHtml(id){
  const w=producerWorkflow(id);
  const dots=workflowResponsibilities.map(s=>{const status=w.decisions[s.number]?.status;return `<span class="stage-dot ${status==='Aprovado'?'ok':status==='Correção solicitada'?'fix':'wait'}" title="${s.number}. ${esc(s.title)}: ${esc(status||'Pendente')} · ${esc((workflowPermissions[s.number]||DEFAULT_PERMISSIONS[s.number]).map(departmentLabel).join(', '))}"></span>`;}).join('');
  const msg=w.needsCorrection.length?`Correção solicitada · ${w.needsCorrection.map(s=>esc(s.title)).join(', ')}`:w.approved===7?'Todas as etapas aprovadas':`Aguardando: ${w.owners.map(departmentLabel).map(esc).join(', ')||'Definição de responsáveis'}`;
  return `<div class="stage-overview" aria-label="${w.approved} de 7 etapas aprovadas">${dots}<small>${w.approved}/7</small></div><div class="stage-owner ${w.needsCorrection.length?'fix':''}"><strong>${msg}</strong></div>`;
}
function renderList(){
  const all=records.filter(isVisible);

  const stats=[
    ['Todos os cadastros',all.length,'all'],
    ['Pendente Fiscal',all.filter(x=>x.status==='Pendente Fiscal').length,'Pendente Fiscal'],
    ['Aprovado Fiscal',all.filter(x=>x.status==='Aprovado Fiscal').length,'Aprovado Fiscal'],
    ['Correção solicitada',all.filter(x=>x.status==='Correção solicitada').length,'Correção solicitada']
  ];

  $('stats').innerHTML=stats.map(([title,n,status])=>
    `<button class="stat ${activeFilter===status?'selected':''}" data-stat="${esc(status)}"><small>${esc(title)}</small><b>${n}</b></button>`
  ).join('');

  $('stats').querySelectorAll('button').forEach(b=>{
    b.onclick=()=>{
      activeFilter=b.dataset.stat;
      $('filter').value=activeFilter;
      renderList();
    };
  });

  const q=$('search').value.trim().toLocaleLowerCase('pt-BR');

  const items=all.filter(r=>
    (activeFilter==='all'||r.status===activeFilter)&&
    [r.id,r.answers?.name,r.answers?.taxId,r.answers?.product].some(v=>
      String(v??'').toLocaleLowerCase('pt-BR').includes(q)
    )
  );

  $('producers').innerHTML=items.length
    ?items.map(r=>
      `<button class="producer" data-id="${esc(r.id)}">
        <div>
          <strong>${esc(r.answers?.name||'Produtor sem nome')}</strong>
          <small>
            CPF/CNPJ: ${esc(r.answers?.taxId||'Não informado')}<br>
            Protocolo: ${esc(r.id)}<br>
            Produto: ${esc(valueText(r.answers?.product)||'Não informado')}
          </small>${producerWorkflowHtml(r.id)}
        </div>
        ${badge(r.status)}
      </button>`
    ).join('')
    :'<div class="empty">Nenhum cadastro encontrado.</div>';

  $('producers').querySelectorAll('button').forEach(b=>{
    b.onclick=()=>openReview(b.dataset.id);
  });
}

function openReview(id){
  selectedId=id;
  checked[id]=new Set();

  $('directory').hidden=true;
  $('review').hidden=false;



  renderReview();
  loadWorkflow(id);
  window.scrollTo(0,0);
}

function back(){
  selectedId=null;

  $('review').hidden=true;
  $('directory').hidden=false;

  renderList();
  window.scrollTo(0,0);
}

// Fase de integração: usa a sessão e a leitura de dados do painel Fiscal já funcional.
// Não grava aprovações por departamento até que as regras do Firestore sejam publicadas e testadas.
const workflowResponsibilities=[
  {number:1,title:'Dados do produtor',teams:['Fiscal']},
  {number:2,title:'Origem da produção',teams:['Fiscal']},
  {number:3,title:'Regime tributário',teams:['Fiscal']},
  {number:4,title:'Vínculos e enquadramento',teams:['Fiscal']},
  {number:5,title:'Receita rural',teams:['Comercial']},
  {number:6,title:'Nota fiscal',teams:['Fiscal']},
  {number:7,title:'Pagamento',teams:['Financeiro']}
];
const BOOTSTRAP_UID='1IwRe76Z8WMEPhKliKlux5Abuxs1';
const DEFAULT_PERMISSIONS={1:['Fiscal'],2:['Fiscal'],3:['Fiscal'],4:['Fiscal'],5:['Comercial'],6:['Fiscal'],7:['Financeiro']};
const departments=['Fiscal','Comercial','Financeiro'];
const departmentLabel=t=>t==='Comercial'?'Análise de Crédito':t;
const isAdmin=()=>auth.currentUser?.uid===BOOTSTRAP_UID || (userProfile?.active===true&&userProfile?.role==='Administrador');
const role=()=>isAdmin()?'Administrador':userProfile?.active?userProfile?.role:null;
const canApprove=(number)=>isAdmin()||(!!role()&&(workflowPermissions[number]||DEFAULT_PERMISSIONS[number]||[]).includes(role()));
const decisionId=(producerId,stage)=>producerId+'__'+stage;
const fmtDate=v=>v?.toDate?.()?.toLocaleString('pt-BR')||v?.seconds&&new Date(v.seconds*1000).toLocaleString('pt-BR')||'';
async function loadWorkflow(id){
  workflowDecisions={...(allWorkflowDecisions[id]||{})};
  try{
    const snap=await getDocs(collection(db,'workflowEtapas'));
    snap.forEach(d=>{const x=d.data();if(x.producerId===id)workflowDecisions[x.stage]=x;});
    allWorkflowDecisions[id]={...workflowDecisions};
    renderList();
  }catch(e){console.warn('Sem acesso às aprovações:',e.message);}
  if(selectedId===id)renderWorkflowResponsibilities();
}
async function loadPermissions(){
  workflowPermissions={};
  try{
    const snap=await getDocs(collection(db,'workflowPermissoes'));
    snap.forEach(d=>{const x=d.data();if(Array.isArray(x.departments))workflowPermissions[Number(d.id)]=x.departments;});
  }catch(e){console.warn('Permissões padrão em uso:',e.message);}
  renderAdmin();
  if(records.length)renderList();
}
async function loadProfile(u){
  userProfile=null;
  try{const s=await getDoc(doc(db,'usuariosInternos',u.uid));if(s.exists())userProfile=s.data();}catch(e){console.warn('Perfil indisponível:',e.message);}
  await loadPermissions();
}
function renderWorkflowResponsibilities(){
  // O fluxo de decisão fica dentro das seções do formulário antigo.
  if(selectedId)renderReview();
}
const SECTION_APPROVAL={ident:1,origin:2,regime:3,structure:4,revenue:5,invoice:6,payment:7};
function sectionDecisionHtml(sectionId){
  const number=SECTION_APPROVAL[sectionId];
  if(!number)return '';
  const decision=workflowDecisions[number];
  const teams=workflowPermissions[number]||DEFAULT_PERMISSIONS[number];
  const allowed=canApprove(number);
  return `<div class="wf-item" style="margin-top:15px"><b>Decisão da etapa · ${esc(teams.map(departmentLabel).join(' + '))}</b><div style="margin:8px 0">${decision?`<span class="pill ${decision.status==='Aprovado'?'approved':'correction'}">${esc(decision.status)}</span><div class="audit">${esc(decision.reviewerEmail||'')} · ${esc(fmtDate(decision.decidedAt))}<br>${esc(decision.memo||'')}</div>`:'<span class="pill pending">Aguardando análise</span>'}</div>${allowed?`<textarea data-stage-memo="${number}" placeholder="Parecer / justificativa desta etapa"></textarea><div class="stage-decision"><button class="btn green" data-stage-action="Aprovado" data-stage="${number}">Aprovar etapa</button> <button class="btn red" data-stage-action="Correção solicitada" data-stage="${number}">${decision?.status==='Aprovado'?'Estornar aprovação e solicitar correção':'Solicitar correção'}</button></div>`:'<p class="muted">Somente os departamentos autorizados podem decidir nesta etapa.</p>'}</div>`;
}
async function saveStageDecision(stage,status){
  const r=current(),u=auth.currentUser;
  if(!r||!u||workflowBusy||!canApprove(stage))return;
  const memo=targetMemo(stage);
  if(!memo){alert('Informe um parecer para esta etapa.');return;}
  const prior=workflowDecisions[stage];
  const reversing=prior?.status==='Aprovado' && status==='Correção solicitada';
  if(!confirm(reversing
    ? `Estornar a aprovação da etapa ${stage} e solicitar correção ao produtor?`
    : `Confirmar ${status.toLowerCase()} da etapa ${stage}?`))return;
  workflowBusy=true;
  try{
    const id=decisionId(r.id,stage),ref=doc(db,'workflowEtapas',id);
    await runTransaction(db,async tx=>{
      // Todas as leituras antecedem as gravações; apenas aprovações exigem
      // consultar as outras seis etapas para detectar a conclusão total.
      const stageRefs=Array.from({length:7},(_,i)=>doc(db,'workflowEtapas',decisionId(r.id,i+1)));
      const snapshots=[];
      if(status==='Aprovado'){
        for(const stageRef of stageRefs)snapshots.push(await tx.get(stageRef));
      }else{
        snapshots[stage-1]=await tx.get(ref);
      }
      const producerRef=doc(db,'entrevistas',r.id);
      const producerSnap=await tx.get(producerRef);
      if(!producerSnap.exists())throw new Error('Cadastro do produtor não encontrado.');
      const previous=snapshots[stage-1]?.exists()?snapshots[stage-1].data():null;
      const auditRef=doc(collection(db,'workflowAuditoria'));
      const next={producerId:r.id,stage,status,memo,reviewerUid:u.uid,reviewerEmail:u.email,
        decidedAt:serverTimestamp(),revision:(previous?.revision||0)+1,eventId:auditRef.id};
      const allApproved=status==='Aprovado' && snapshots.every((snapshot,i)=>
        (i+1===stage?status:(snapshot.exists()?snapshot.data().status:null))==='Aprovado');
      tx.set(ref,next);
      tx.set(auditRef,{...next,decisionId:id});
      const oldStatus=producerSnap.data().status;
      let newStatus=null;
      if(status==='Correção solicitada')newStatus='Correção solicitada';
      else if(allApproved)newStatus='Aprovado Fiscal';
      else if(oldStatus==='Aprovado Fiscal' || oldStatus==='Correção solicitada'){
        // Uma aprovação parcial nunca deve restabelecer a aprovação global.
        // Mantém a correção pendente até todas as sete etapas estarem aprovadas.
        newStatus='Correção solicitada';
      }
      if(newStatus && newStatus!==oldStatus){
        tx.update(producerRef,{
          status:newStatus,updatedAt:serverTimestamp(),
          fiscal:{reviewer:u.email,memo:allApproved
            ? 'Aprovação automática: todas as sete etapas aprovadas.'
            : `Etapa ${stage}: ${memo}`,reviewAt:serverTimestamp()}
        });
      }
    });
    await loadWorkflow(r.id);
  }catch(e){console.error(e);alert('Não foi possível registrar a decisão: '+e.message);}
  finally{workflowBusy=false;}
}
const targetMemo=n=>document.querySelector(`[data-stage-memo="${n}"]`)?.value.trim()||'';
let adminRows=[];
function adminTab(tab){document.querySelectorAll('[data-admin-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.adminTab===tab)));document.querySelectorAll('[data-admin-page]').forEach(p=>p.hidden=p.dataset.adminPage!==tab);}
document.querySelectorAll('[data-admin-tab]').forEach(b=>b.onclick=()=>adminTab(b.dataset.adminTab));
function editAdmin(row){const locked=!!row&&(row.id===BOOTSTRAP_UID||row.id===auth.currentUser?.uid);if(locked)return;adminTab('users');$('admin-editor').hidden=false;$('admin-editor-title').textContent=row?'Editar usuário':'Novo usuário';$('admin-uid').value=row?.id||'';$('admin-uid').readOnly=!!row;$('admin-email').value=row?.email||'';$('admin-email').readOnly=!!row;$('admin-name').value=row?.name||'';$('admin-role').value=row?.role||'Fiscal';$('admin-active').checked=row?row.active===true:true;}
$('admin-new').onclick=()=>editAdmin(null);$('admin-cancel').onclick=()=>{$('admin-editor').hidden=true;};
function drawAdminUsers(){const q=$('admin-search').value.toLowerCase();const el=$('admin-users');el.replaceChildren();for(const r of adminRows.filter(r=>[r.name,r.email,departmentLabel(r.role||'')].join(' ').toLowerCase().includes(q))){const card=document.createElement('div');card.className='admin-user-card';const info=document.createElement('div');const title=document.createElement('strong');title.textContent=r.name||r.email||r.id;info.append(title);for(const text of [r.email||'',departmentLabel(r.role||'')+' · '+(r.active?'Ativo':'Inativo'),'Verificação de e-mail: consultar Authentication']){const s=document.createElement('small');s.textContent=text;info.append(s);}card.append(info);const actions=document.createElement('div');actions.className='admin-actions';if(r.id!==BOOTSTRAP_UID&&r.id!==auth.currentUser?.uid){const b=document.createElement('button');b.className='btn';b.textContent='Editar acesso';b.onclick=()=>editAdmin(r);actions.append(b);const t=document.createElement('button');t.className='btn';t.textContent=r.active?'Desativar':'Reativar';t.onclick=()=>{if(!isAdmin()||!confirm((r.active?'Desativar':'Reativar')+' o acesso de '+(r.name||r.email)+'?'))return;editAdmin(r);$('admin-active').checked=!r.active;$('admin-save-user').click();};actions.append(t);}else{actions.textContent='Perfil protegido';}card.append(actions);el.append(card);}if(!el.children.length)el.textContent='Nenhum usuário encontrado.';}
$('admin-search').oninput=drawAdminUsers;
function renderAdmin(){
  const el=$('admin-panel');if(!el)return;el.hidden=!isAdmin()||!adminOpen;$('admin-open').hidden=!isAdmin()||adminOpen;$('admin-close').hidden=!isAdmin()||!adminOpen;if(!isAdmin()||!adminOpen)return;
  $('admin-permissions').innerHTML=workflowResponsibilities.map(s=>`<div class="wf-item" style="margin:8px 0"><b>${s.number}. ${esc(s.title)}</b>${departments.map(t=>`<label style="display:inline-block;margin:7px 13px 0 0"><input type="checkbox" data-perm-stage="${s.number}" value="${t}" ${(workflowPermissions[s.number]||DEFAULT_PERMISSIONS[s.number]).includes(t)?'checked':''}> ${esc(departmentLabel(t))}</label>`).join('')}</div>`).join('');
  getDocs(collection(db,'usuariosInternos')).then(s=>{if(!isAdmin()||!adminOpen)return;adminRows=s.docs.map(d=>({...d.data(),id:d.id}));drawAdminUsers();$('admin-role-list').innerHTML=['Administrador','Fiscal','Comercial','Financeiro'].map(r=>`<div class="admin-user-card"><strong>${esc(departmentLabel(r))}</strong><span>${adminRows.filter(u=>u.role===r&&u.active).length} ativos</span></div>`).join('');$('admin-history').innerHTML=adminRows.map(r=>`<div class="admin-user-card"><strong>${esc(r.name||r.email||r.id)}</strong><span>${esc(r.updatedAt?.toDate?.().toLocaleString('pt-BR')||'Sem data')} · ${esc(adminRows.find(u=>u.id===r.updatedBy)?.name||r.updatedBy||'Não informado')}</span></div>`).join('');}).catch(e=>{$('admin-users').textContent=e.message;});
}
$('admin-save-user').onclick=async()=>{
  if(!isAdmin())return;
  const uid=$('admin-uid').value.trim(),email=$('admin-email').value.trim().toLowerCase(),name=$('admin-name').value.trim(),newRole=$('admin-role').value,active=$('admin-active').checked;
  if(!/^[A-Za-z0-9]{15,128}$/.test(uid)||!email.includes('@')||!name){alert('Informe UID, e-mail e nome válidos.');return;}
  if(uid===BOOTSTRAP_UID||uid===auth.currentUser.uid){alert('O perfil principal e o próprio perfil são protegidos.');return;}
  try{await setDoc(doc(db,'usuariosInternos',uid),{uid,email,name,role:newRole,active,updatedBy:auth.currentUser.uid,updatedAt:serverTimestamp()});$('admin-message').textContent='Usuário salvo. O UID deve corresponder ao usuário real no Authentication.';$('admin-editor').hidden=true;renderAdmin();}
  catch(e){$('admin-message').textContent='Erro ao salvar usuário: '+e.message;}
};
$('admin-save-permissions').onclick=async()=>{
  if(!isAdmin())return;
  const entries=workflowResponsibilities.map(s=>[s.number,[...document.querySelectorAll(`[data-perm-stage="${s.number}"]:checked`)].map(x=>x.value)]);
  if(entries.some(([,a])=>!a.length)){alert('Cada etapa precisa ter ao menos um departamento autorizado.');return;}
  try{for(const [n,departments] of entries)await setDoc(doc(db,'workflowPermissoes',String(n)),{departments,updatedBy:auth.currentUser.uid,updatedAt:serverTimestamp()});$('admin-message').textContent='Permissões atualizadas.';await loadPermissions();}
  catch(e){$('admin-message').textContent='Erro ao salvar permissões: '+e.message;}
};

function renderReview(){
  const r=current();

  if(!r){
    back();
    return;
  }

  $('review-name').textContent=r.answers?.name||'Produtor rural';

  $('review-meta').textContent=
    `Protocolo ${r.id} · ${r.answers?.taxId||'Documento não informado'}`;

  $('review-status').innerHTML=badge(r.status);
  const g=groups(r);
  const reviewed=checked[r.id]||(checked[r.id]=new Set());
  const total=g.length;

  $('sections').innerHTML=g.map((stage,i)=>
    `<details class="review-stage" ${i===0?'open':''}>
      <summary>
        ${i+1}. ${esc(stage.title)} · ${stage.entries.length} campo(s)
      </summary>

      <div>
        ${stage.entries.map(([label,value])=>
          `<div class="answer">
            <span>${esc(label)}</span>
            <strong>${esc(valueText(value))||'<span class="field-note">Não preenchido</span>'}</strong>
          </div>`
        ).join('')}
      </div>

      ${sectionDecisionHtml(stage.id)}
    </details>`
  ).join('')||'<p class="message">Este cadastro não possui respostas. Não é possível aprová-lo.</p>';

  $('sections').querySelectorAll('[data-stage-action]').forEach(btn=>{
    btn.onclick=()=>saveStageDecision(Number(btn.dataset.stage),btn.dataset.stageAction);
  });

  updateProgress();
}

function updateProgress(){
  const r=current();if(!r)return;
  const decisions=Object.values(workflowDecisions);
  const approved=decisions.filter(d=>d.status==='Aprovado').length;
  $('review-count').textContent=`${approved} de 7 etapas de aprovação concluídas`;
  const w=producerWorkflow(r.id);
  $('review-stage-summary').innerHTML=`<strong>Andamento por departamento</strong><div class="stage-summary-grid" style="margin-top:12px">${workflowResponsibilities.map(s=>{const d=workflowDecisions[s.number]||w.decisions[s.number];const state=d?.status==='Aprovado'?'ok':d?.status==='Correção solicitada'?'fix':'wait';const teams=(workflowPermissions[s.number]||DEFAULT_PERMISSIONS[s.number]).map(departmentLabel).join(' / ');return `<div class="stage-summary-cell ${state}" title="${esc(s.title)}"><b>${s.number}</b><div>${esc(teams)}</div><div>${state==='ok'?'✓ Aprovado':state==='fix'?'Correção':'Pendente'}</div></div>`;}).join('')}</div><div class="stage-owner" style="margin-top:12px">${w.needsCorrection.length?'Correção solicitada ao produtor · ':w.approved===7?'Todas as sete etapas aprovadas.':'Aguardando análise de: '}${esc(w.needsCorrection.length?w.needsCorrection.map(s=>s.title).join(', '):w.owners.map(departmentLabel).join(', '))}</div>`;
  $('progress-fill').style.width=`${Math.min(approved,7)/7*100}%`;
}

function exportApproved(){
  const items=records.filter(r=>r.status==='Aprovado Fiscal');

  if(!items.length){
    alert('Não há cadastros aprovados para exportar.');
    return;
  }

  const known=stages.flatMap(s=>s.fields.map(f=>[f.key,f.label]));
  const keys=[...new Set(items.flatMap(r=>Object.keys(r.answers||{})))];
  const labels=Object.fromEntries(known);

  const header=[
    'Protocolo',
    'Status',
    'Fiscal responsável',
    'Data da aprovação',
    'Parecer Fiscal',
    ...keys.map(k=>labels[k]||k)
  ];

  const protect=v=>{
    let s=valueText(v);

    if(/^[=+\-@\t\r]/.test(s)){
      s="'"+s;
    }

    return '"'+s.replace(/"/g,'""')+'"';
  };

  const rows=items.map(r=>[
    r.id,
    r.status,
    r.fiscal?.reviewer||'',
    r.fiscal?.reviewAt||'',
    r.fiscal?.memo||'',
    ...keys.map(k=>r.answers?.[k]??'')
  ]);

  const content='\uFEFF'+[header,...rows]
    .map(row=>row.map(protect).join(';'))
    .join('\r\n');

  const blob=new Blob([content],{
    type:'text/csv;charset=utf-8'
  });

  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');

  a.href=url;
  a.download='Marubeni_Produtores_Aprovados_Excel.csv';

  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(()=>URL.revokeObjectURL(url),4000);
}

$('search').oninput=renderList;

$('filter').onchange=e=>{
  activeFilter=e.target.value;
  renderList();
};

$('back').onclick=back;
$('admin-open').onclick=()=>{if(!isAdmin())return;adminOpen=true;$('directory').hidden=true;$('review').hidden=true;renderAdmin();window.scrollTo(0,0);};
$('admin-close').onclick=()=>{adminOpen=false;$('directory').hidden=false;renderAdmin();window.scrollTo(0,0);};





$('export').onclick=exportApproved;

onAuthStateChanged(auth,async u=>{
  if(unsub){unsub();unsub=null;}
  if(workflowUnsub){workflowUnsub();workflowUnsub=null;}
  adminOpen=false;allWorkflowDecisions={};$('top-nav').hidden=true;$('admin-panel').hidden=true;

  if(!authorized(u)){
    $('directory').hidden=true;
    $('review').hidden=true;

    $('state').textContent=
      'Acesso restrito. Entre pelo login Fiscal do portal com uma conta cadastrada no Firebase Authentication e e-mail verificado.';

    return;
  }

  $('state').textContent='Conectado: '+u.email+' · Verificando permissões...';
  await loadProfile(u);
  $('state').textContent='Conectado: '+u.email+' · Perfil: '+(departmentLabel(role())||'Acesso Fiscal legado')+' · Firebase sincronizado';

  $('directory').hidden=false;
  $('top-nav').hidden=false;
  renderAdmin();
  workflowUnsub=onSnapshot(collection(db,'workflowEtapas'),snap=>{
    const next={};snap.forEach(d=>{const x=d.data();if(!x.producerId||!x.stage)return;(next[x.producerId]??={})[x.stage]=x;});
    allWorkflowDecisions=next;
    if(selectedId){workflowDecisions={...(next[selectedId]||{})};renderReview();}
    renderList();
  },e=>console.warn('Não foi possível carregar o andamento das etapas:',e.message));

  unsub=onSnapshot(collection(db,'entrevistas'),snap=>{
    records=snap.docs.map(d=>({
      id:d.id,
      ...d.data()
    }));

    renderList();

    if(selectedId){
      if(current()){
        $('review-status').innerHTML=badge(current().status);
      }else{
        back();
      }
    }

  },e=>{
    $('state').textContent=
      'Erro ao consultar cadastros: '+e.message;

    console.error(e);
  });
});
