
import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {getFirestore,collection,doc,onSnapshot,updateDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {firebaseConfig} from './firebase-config.js';

const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app),$=id=>document.getElementById(id);

const stages=[
  {"id":"ident","title":"Quem está vendendo?","fields":[
    {"key":"operationDate","label":"Data prevista da venda à Marubeni"},
    {"key":"name","label":"Nome completo / razão social"},
    {"key":"type","label":"Tipo de fornecedor"},
    {"key":"taxId","label":"CPF / CNPJ"},
    {"key":"ie","label":"Inscrição estadual / inscrição de produtor"},
    {"key":"contact","label":"Nome do produtor / representante responsável pelas informações"},
    {"key":"phone","label":"Telefone / WhatsApp"},
    {"key":"email","label":"E-mail"},
    {"key":"accountant","label":"Contador / escritório e CRC (opcional)"},
    {"key":"accountantConfirmed","label":"O contador validou o enquadramento informado? (opcional)"},
    {"key":"accountantContact","label":"Contato do contador (opcional)"},
    {"key":"registry","label":"CAEPF / identificação IBS-CBS e situação cadastral"}
  ]},
  {"id":"origin","title":"De onde vem a produção?","fields":[
    {"key":"properties","label":"Propriedades e estabelecimentos"},
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

const isVisible=r=>r.status!=='Rascunho';

const badge=s=>`<span class="pill ${s==='Aprovado Fiscal'?'approved':s==='Correção solicitada'?'correction':'pending'}">${esc(s||'Pendente Fiscal')}</span>`;

const valueText=v=>Array.isArray(v)?v.join('; '):v&&typeof v==='object'?JSON.stringify(v):String(v??'');

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
        <span>
          <strong>${esc(r.answers?.name||'Produtor sem nome')}</strong>
          <small>
            CPF/CNPJ: ${esc(r.answers?.taxId||'Não informado')}<br>
            Protocolo: ${esc(r.id)}<br>
            Produto: ${esc(valueText(r.answers?.product)||'Não informado')}
          </small>
        </span>
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

  $('memo').value=current()?.fiscal?.memo||'';

  renderReview();
  window.scrollTo(0,0);
}

function back(){
  selectedId=null;

  $('review').hidden=true;
  $('directory').hidden=false;

  renderList();
  window.scrollTo(0,0);
}

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

      <label class="check">
        <input
          type="checkbox"
          data-stage="${esc(stage.id)}"
          ${reviewed.has(stage.id)?'checked':''}
        >
        Confirmo que revisei esta etapa
      </label>
    </details>`
  ).join('')||'<p class="message">Este cadastro não possui respostas. Não é possível aprová-lo.</p>';

  $('sections').querySelectorAll('input[data-stage]').forEach(input=>{
    input.onchange=()=>{
      if(input.checked){
        reviewed.add(input.dataset.stage);
      }else{
        reviewed.delete(input.dataset.stage);
      }

      updateProgress();
    };
  });

  updateProgress();
}

function updateProgress(){
  const r=current();

  if(!r)return;

  const total=groups(r).length;
  const done=(checked[r.id]||new Set()).size;

  $('review-count').textContent=`${done} de ${total} etapas revisadas`;
  $('progress-fill').style.width=`${total?done/total*100:0}%`;

  $('approve').disabled=saving||total===0||done!==total;
  $('correct').disabled=saving;

  $('review-message').textContent=
    total&&done===total
      ?'Todas as etapas conferidas. Registre o parecer e confirme sua decisão.'
      :'Revise todas as etapas antes de aprovar. É possível solicitar correção com parecer fundamentado.';
}

async function decide(status){
  const r=current();

  if(!r||saving)return;

  const memo=$('memo').value.trim();

  if(!memo){
    alert('Preencha o parecer Fiscal antes de decidir.');
    $('memo').focus();
    return;
  }

  if(
    status==='Aprovado Fiscal'&&
    (!groups(r).length||checked[r.id]?.size!==groups(r).length)
  ){
    alert('Confira todas as etapas antes de aprovar.');
    return;
  }

  if(!confirm(`Confirmar a decisão "${status}" para ${r.answers?.name||'este produtor'}?`)){
    return;
  }

  saving=true;
  updateProgress();

  try{
    await updateDoc(doc(db,'entrevistas',r.id),{
      status,
      fiscal:{
        memo,
        reviewer:auth.currentUser.email,
        reviewAt:new Date().toISOString()
      },
      updatedAt:serverTimestamp()
    });

    back();

  }catch(e){
    console.error(e);
    alert('Não foi possível salvar a decisão no Firebase: '+e.message);

  }finally{
    saving=false;
    updateProgress();
  }
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

$('approve').onclick=()=>decide('Aprovado Fiscal');

$('correct').onclick=()=>decide('Correção solicitada');

$('export').onclick=exportApproved;

onAuthStateChanged(auth,u=>{
  if(unsub){
    unsub();
    unsub=null;
  }

  if(!authorized(u)){
    $('directory').hidden=true;
    $('review').hidden=true;

    $('state').textContent=
      'Acesso restrito. Entre pelo login Fiscal do portal com uma conta cadastrada no Firebase Authentication e e-mail verificado.';

    return;
  }

  $('state').textContent=
    'Conectado: '+u.email+' · Cadastros sincronizados com o Firebase';

  $('directory').hidden=false;

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
