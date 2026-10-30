
import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getAuth, onAuthStateChanged, signInAnonymously, signInWithEmailAndPassword, signOut, setPersistence, browserLocalPersistence, browserSessionPersistence} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {getFirestore, doc, setDoc, updateDoc, onSnapshot, serverTimestamp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {firebaseConfig} from './firebase-config.js';

const app=initializeApp(firebaseConfig), auth=getAuth(app), db=getFirestore(app);

let user=null, fiscal=false, draftTimer=null, statusUnsub=null, pendingSave=null;

window.rtcAuthenticated=false;

// Qualquer usuário cadastrado no Firebase Authentication,
// não anônimo e com e-mail verificado, pode acessar o Fiscal.
const isFiscal=u=>!!u&&!u.isAnonymous&&!!u.email&&u.emailVerified&&u.providerData?.some(p=>p.providerId==='password');

const el=id=>document.getElementById(id);

function err(e){
 console.error(e);
 alert('Falha na comunicação com Firebase: '+(e?.message||e));
}

function showPanel(){
 if(!fiscal){
  window.rtcOpen();
  return;
 }

 el('rtc-access').style.display='block';
 el('rtc-login').style.display='none';
 el('rtc-panel-wrap').style.display='block';

 const frame=el('rtc-panel');

 if(frame?.getAttribute('src')==='about:blank'){
  frame.setAttribute('src','./painel-fiscal.html');
 }
}

window.rtcOpen=()=>{
 el('rtc-access').style.display='block';

 if(fiscal){
  showPanel();
 }else{
  el('rtc-login').style.display='block';
  el('rtc-panel-wrap').style.display='none';
 }
};

window.rtcClose=()=>{
 el('rtc-access').style.display='none';
};

window.rtcShowPanel=showPanel;

window.rtcSavedRecords=()=>{
 if(fiscal){
  showPanel();
 }else{
  window.rtcOpen();
 }
};

window.rtcLogin=async()=>{
 const email=el('rtc-email').value.trim().toLowerCase();
 const pass=el('rtc-pass').value;

 el('rtc-error').textContent='';

 if(!email||!pass){
  el('rtc-error').textContent='Informe seu e-mail e senha.';
  return;
 }

 try{
  await setPersistence(
   auth,
   el('rtc-remember').checked
    ?browserLocalPersistence
    :browserSessionPersistence
  );

  const result=await signInWithEmailAndPassword(auth,email,pass);

  if(!isFiscal(result.user)){
   await signOut(auth);
   throw Error('Acesso permitido somente para contas cadastradas no Firebase Authentication com e-mail verificado.');
  }

  el('rtc-pass').value='';

  // Atualiza o estado antes de abrir o painel.
  user=result.user;
  fiscal=true;
  window.rtcAuthenticated=true;

  showPanel();

 }catch(e){
  console.error(e);
  el('rtc-error').textContent=e.message;
 }
};

window.rtcLogout=async()=>{
 try{
  if(statusUnsub){
   statusUnsub();
   statusUnsub=null;
  }

  await signOut(auth);

  user=null;
  fiscal=false;
  window.rtcAuthenticated=false;

  const frame=el('rtc-panel');

  if(frame){
   frame.setAttribute('src','about:blank');
  }

  await signInAnonymously(auth);

  window.rtcClose();

 }catch(e){
  err(e);
 }
};

async function saveRecord(record,final){
 if(!user||fiscal||!record?.id){
  throw Error('A autenticação do produtor ainda não está pronta.');
 }

 // Credencial temporária do produtor só pode alterar o cadastro validado.
 if(user.uid.startsWith('producer_') && user.uid!=='producer_'+record.id){
  throw Error('Esta verificação não autoriza modificar outro cadastro.');
 }
 const ref=doc(db,'entrevistas',record.id);
 const status=final?'Pendente Fiscal':'Rascunho';

 // Mantém a lógica original de gravação dos produtores.
 try{
  await setDoc(ref,{
   ownerUid:user.uid,
   answers:record,
   status,
   createdAt:serverTimestamp(),
   updatedAt:serverTimestamp(),
   fiscal:{}
  });

 }catch(e){
  if(e.code!=='permission-denied'){
   throw e;
  }

  // Atualiza somente documentos permitidos pelas regras.
  await updateDoc(ref,{
   answers:record,
   status,
   updatedAt:serverTimestamp()
  });
 }

 watchStatus();
}

window.rtcCloudSave=(record,final)=>{
 clearTimeout(draftTimer);
 pendingSave=saveRecord(record,final);
 return pendingSave;
};

window.rtcWatchCurrent=watchStatus;

window.rtcCloudDraft=(record)=>{
 clearTimeout(draftTimer);

 draftTimer=setTimeout(()=>{
  // Rascunhos só são sincronizados quando a sessão autoriza este documento.
  if(user&&!fiscal&&record?.id&&(!user.uid.startsWith('producer_')||user.uid==='producer_'+record.id)){
   window.rtcCloudSave(
    {...record,status:'Rascunho'},
    false
   );
  }
 },1400);
};

function watchStatus(){
 if(statusUnsub){
  statusUnsub();
  statusUnsub=null;
 }

 if(!user||fiscal||!window.rtcGetCurrentId?.()){
  return;
 }

 statusUnsub=onSnapshot(
  doc(db,'entrevistas',window.rtcGetCurrentId()),
  snap=>{
   if(!snap.exists()){
    return;
   }

   const s=snap.data().status;

   const mirror=JSON.parse(
    localStorage.getItem('marubeni-painel-fiscal-previa-v2')||'[]'
   );

   const items=Array.isArray(mirror)?mirror:[];
   const i=items.findIndex(x=>x.id===snap.id);

   const entry={
    id:snap.id,
    status:s
   };

   if(i>=0){
    items[i]={...items[i],...entry};
   }else{
    items.push(entry);
   }

   localStorage.setItem(
    'marubeni-painel-fiscal-previa-v2',
    JSON.stringify(items)
   );

   const badge=el('rtc-client-status');

   if(badge){
    badge.textContent=
     s==='Aprovado Fiscal'
      ?'Aprovado pelo Fiscal'
      :s==='Correção solicitada'
       ?'Correção solicitada pelo Fiscal'
       :'Aguardando análise da Marubeni';
   }
  },
  err
 );
}

onAuthStateChanged(auth,async u=>{
 user=u;
 fiscal=isFiscal(u);
 window.rtcAuthenticated=fiscal;

 if(fiscal){
  el('rtc-email').value=u.email;

  if(statusUnsub){
   statusUnsub();
   statusUnsub=null;
  }

  if(el('rtc-access').style.display==='block'){
   showPanel();
  }

 }else if(u&&!u.isAnonymous&&!u.uid.startsWith('producer_')){
  // Usuários com e-mail não verificado não recebem acesso Fiscal.
  await signOut(auth);
  return;

 }else if(!u){
  try{
   await signInAnonymously(auth);
  }catch(e){
   err(e);
  }
  return;
 }

 // Acompanhar status somente após salvar.
 // Ouvir documento inexistente pode ser recusado.
});
