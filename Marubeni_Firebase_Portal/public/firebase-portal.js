import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getAuth, onAuthStateChanged, signInAnonymously, signInWithEmailAndPassword, signOut, setPersistence, browserLocalPersistence, browserSessionPersistence} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {getFirestore, doc, setDoc, updateDoc, onSnapshot, serverTimestamp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {firebaseConfig} from './firebase-config.js';
const app=initializeApp(firebaseConfig), auth=getAuth(app), db=getFirestore(app);
let user=null, fiscal=false, draftTimer=null, statusUnsub=null, pendingSave=null;
window.rtcAuthenticated=false;
const isFiscal=u=>!!u&&!u.isAnonymous&&!!u.email&&u.emailVerified;
const el=id=>document.getElementById(id);
function err(e){console.error(e); alert('Falha na comunicação com Firebase: '+(e?.message||e));}
function showPanel(){if(!fiscal){window.rtcOpen();return;} el('rtc-access').style.display='block';el('rtc-login').style.display='none';el('rtc-panel-wrap').style.display='block';}
window.rtcOpen=()=>{el('rtc-access').style.display='block';if(fiscal)showPanel();else{el('rtc-login').style.display='block';el('rtc-panel-wrap').style.display='none';}};
window.rtcClose=()=>{el('rtc-access').style.display='none';};
window.rtcShowPanel=showPanel;
window.rtcSavedRecords=()=>{if(fiscal)showPanel();else window.rtcOpen();};
window.rtcLogin=async()=>{
 const email=el('rtc-email').value.trim().toLowerCase(),pass=el('rtc-pass').value;
 el('rtc-error').textContent='';
 try{await setPersistence(auth,el('rtc-remember').checked?browserLocalPersistence:browserSessionPersistence);
 const result=await signInWithEmailAndPassword(auth,email,pass);
 if(!result.user.emailVerified){await signOut(auth);throw Error('Verifique o e-mail no Firebase Authentication antes de acessar.');}
 el('rtc-pass').value='';showPanel();}catch(e){el('rtc-error').textContent=e.message;}
};
window.rtcLogout=async()=>{try{await signOut(auth);await signInAnonymously(auth);window.rtcClose();}catch(e){err(e);}};
async function saveRecord(record,final){
 if(!user||fiscal||!record?.id)throw Error('A autenticação do produtor ainda não está pronta.');
 const ref=doc(db,'entrevistas',record.id);
 const status=final?'Pendente Fiscal':'Rascunho';
 // Não consulte previamente documentos inexistentes: as regras restringem get ao proprietário.
 try {
  await setDoc(ref,{ownerUid:user.uid,answers:record,status,createdAt:serverTimestamp(),updatedAt:serverTimestamp(),fiscal:{}});
 } catch(e) {
  if(e.code!=='permission-denied')throw e;
  // Se o documento já existe e pertence ao usuário, atualize apenas os campos permitidos.
  // As regras do Firestore recusam alterações de documentos de outros produtores.
  await updateDoc(ref,{answers:record,status,updatedAt:serverTimestamp()});
 }
 watchStatus();
}
window.rtcCloudSave=(record,final)=>{clearTimeout(draftTimer);pendingSave=saveRecord(record,final).catch(err);return pendingSave;};
window.rtcWatchCurrent=watchStatus;
window.rtcCloudDraft=(record)=>{
 clearTimeout(draftTimer);
 draftTimer=setTimeout(()=>{
  // O rascunho só é enviado depois de receber um usuário anônimo válido.
  if(user&&!fiscal&&record?.id)window.rtcCloudSave({...record,status:'Rascunho'},false);
 },1400);
};
function watchStatus(){if(statusUnsub){statusUnsub();statusUnsub=null;}
 if(!user||fiscal||!window.rtcGetCurrentId?.())return;
 statusUnsub=onSnapshot(doc(db,'entrevistas',window.rtcGetCurrentId()),snap=>{
  if(!snap.exists())return;
  const s=snap.data().status;
  const mirror=JSON.parse(localStorage.getItem('marubeni-painel-fiscal-previa-v2')||'[]');
  const items=Array.isArray(mirror)?mirror:[];const i=items.findIndex(x=>x.id===snap.id);
  const entry={id:snap.id,status:s};if(i>=0)items[i]={...items[i],...entry};else items.push(entry);
  localStorage.setItem('marubeni-painel-fiscal-previa-v2',JSON.stringify(items));
  const badge=el('rtc-client-status');if(badge){badge.textContent=s==='Aprovado Fiscal'?'Aprovado pelo Fiscal':s==='Correção solicitada'?'Correção solicitada pelo Fiscal':'Aguardando análise da Marubeni';}
 },err);
}
onAuthStateChanged(auth,async u=>{
 user=u;fiscal=isFiscal(u);window.rtcAuthenticated=fiscal;
 if(fiscal){el('rtc-email').value=u.email; if(el('rtc-access').style.display==='block')showPanel();}
 else if(u&&!u.isAnonymous){ // other accounts have no fiscal permissions
  await signOut(auth);return;
 }else if(!u){try{await signInAnonymously(auth);}catch(e){err(e);}return;}
 // Acompanhar status somente após salvar; ouvir documento inexistente pode ser recusado.
});
// Re-register status listener when navigating to a different interview.
const oldRender=window.render;
if(typeof oldRender==='function')window.render=function(...args){const r=oldRender(...args);watchStatus();return r;};
// Existing page initializes with its own local rascunho. Keep it and synchronize on edits.
