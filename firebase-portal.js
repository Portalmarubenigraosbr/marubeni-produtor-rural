
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';

import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let user = null;
let fiscal = false;
let draftTimer = null;
let statusUnsub = null;
let pendingSave = Promise.resolve();
let authReady = false;
let authPromiseResolve;

const authPromise = new Promise(resolve => {
  authPromiseResolve = resolve;
});

window.rtcAuthenticated = false;

const el = id => document.getElementById(id);

const isFiscal = u =>
  !!u &&
  !u.isAnonymous &&
  !!u.email &&
  u.emailVerified &&
  u.providerData?.some(p => p.providerId === 'password');

function err(e) {
  console.error('[Firebase Portal]', e);
}

async function ensureProducerAuth() {
  if (!authReady) {
    await authPromise;
  }

  if (!auth.currentUser) {
    const result = await signInAnonymously(auth);
    user = result.user;
  }

  const current = auth.currentUser;

  if (!current || isFiscal(current)) {
    throw new Error(
      'A sessão atual não permite cadastrar um produtor.'
    );
  }

  return current;
}

function showPanel() {
  if (!fiscal) {
    window.rtcOpen();
    return;
  }

  if (el('rtc-access')) {
    el('rtc-access').style.display = 'block';
  }

  if (el('rtc-login')) {
    el('rtc-login').style.display = 'none';
  }

  if (el('rtc-panel-wrap')) {
    el('rtc-panel-wrap').style.display = 'block';
  }

  const frame = el('rtc-panel');

  if (
    frame &&
    (
      !frame.getAttribute('src') ||
      frame.getAttribute('src') === 'about:blank'
    )
  ) {
    frame.setAttribute('src', './painel-fiscal.html');
  }
}

window.rtcOpen = () => {
  if (el('rtc-access')) {
    el('rtc-access').style.display = 'block';
  }

  if (fiscal) {
    showPanel();
  } else {
    if (el('rtc-login')) {
      el('rtc-login').style.display = 'block';
    }

    if (el('rtc-panel-wrap')) {
      el('rtc-panel-wrap').style.display = 'none';
    }
  }
};

window.rtcClose = () => {
  if (el('rtc-access')) {
    el('rtc-access').style.display = 'none';
  }
};

window.rtcShowPanel = showPanel;

window.rtcSavedRecords = () => {
  if (fiscal) {
    showPanel();
  } else {
    window.rtcOpen();
  }
};

window.rtcLogin = async () => {
  const email = el('rtc-email')?.value.trim().toLowerCase();
  const pass = el('rtc-pass')?.value;

  const errorElement = el('rtc-error');

  if (errorElement) {
    errorElement.textContent = '';
  }

  if (!email || !pass) {
    if (errorElement) {
      errorElement.textContent = 'Informe seu e-mail e senha.';
    }
    return;
  }

  try {
    await setPersistence(
      auth,
      el('rtc-remember')?.checked
        ? browserLocalPersistence
        : browserSessionPersistence
    );

    const result = await signInWithEmailAndPassword(
      auth,
      email,
      pass
    );

    if (!isFiscal(result.user)) {
      await signOut(auth);

      throw new Error(
        'Acesso permitido somente para contas autorizadas com e-mail verificado.'
      );
    }

    if (el('rtc-pass')) {
      el('rtc-pass').value = '';
    }

    user = result.user;
    fiscal = true;
    window.rtcAuthenticated = true;

    showPanel();

  } catch (e) {
    err(e);

    if (errorElement) {
      errorElement.textContent = e.message;
    }
  }
};

window.rtcLogout = async () => {
  try {
    if (statusUnsub) {
      statusUnsub();
      statusUnsub = null;
    }

    await signOut(auth);

    user = null;
    fiscal = false;
    window.rtcAuthenticated = false;

    const frame = el('rtc-panel');

    if (frame) {
      frame.setAttribute('src', 'about:blank');
    }

    const result = await signInAnonymously(auth);
    user = result.user;

    window.rtcClose();

  } catch (e) {
    err(e);
  }
};

async function saveRecord(record, final = false) {
  if (!record || !record.id) {
    throw new Error('Cadastro sem identificação.');
  }

  const currentUser = await ensureProducerAuth();

  const recordId = String(record.id);
  const ref = doc(db, 'entrevistas', recordId);

  const status = final
    ? 'Pendente Fiscal'
    : 'Rascunho';

  if (
    currentUser.uid.startsWith('producer_') &&
    currentUser.uid !== 'producer_' + recordId
  ) {
    throw new Error(
      'A sessão verificada não corresponde ao cadastro.'
    );
  }

  // Aguarda qualquer gravação anterior antes de iniciar outra.
  // Isso evita concorrência entre o rascunho automático
  // e a conclusão da entrevista.
  try {
    const snapshot = await getDoc(ref);

    if (!snapshot.exists()) {
      // NOVO CADASTRO:
      // Os campos correspondem às regras de criação.
      await setDoc(ref, {
        ownerUid: currentUser.uid,
        answers: record,
        status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        fiscal: {}
      });

    } else {
      // CADASTRO EXISTENTE:
      // Preserva ownerUid, createdAt e fiscal.
      const existing = snapshot.data();

      if (existing.ownerUid !== currentUser.uid) {
        throw new Error(
          'Este cadastro pertence a outra sessão. ' +
          'Para corrigi-lo, utilize o acesso por código de e-mail.'
        );
      }

      if (
        ![
          'Rascunho',
          'Pendente Fiscal',
          'Correção solicitada'
        ].includes(existing.status)
      ) {
        throw new Error(
          'O cadastro não está disponível para alterações.'
        );
      }

      await updateDoc(ref, {
        answers: record,
        status,
        updatedAt: serverTimestamp()
      });
    }

    watchStatus();

    return {
      success: true,
      id: recordId,
      status
    };

  } catch (e) {
    console.error(
      '[Firebase Portal] Erro ao salvar:',
      e.code,
      e.message
    );

    if (e.code === 'permission-denied') {
      throw new Error(
        'O Firestore recusou a operação. ' +
        'Verifique se a sessão atual possui autorização ' +
        'para criar ou atualizar este cadastro.'
      );
    }

    throw e;
  }
}

window.rtcCloudSave = (record, final = false) => {
  clearTimeout(draftTimer);

  // Serializa as gravações.
  const operation = pendingSave
    .catch(() => {})
    .then(() => saveRecord(record, final));

  pendingSave = operation;

  return operation;
};

window.rtcWatchCurrent = watchStatus;

window.rtcCloudDraft = record => {
  clearTimeout(draftTimer);

  if (!record?.id) {
    return;
  }

  draftTimer = setTimeout(() => {
    if (!auth.currentUser || fiscal) {
      return;
    }

    window.rtcCloudSave(
      { ...record, status: 'Rascunho' },
      false
    ).catch(e => {
      console.warn(
        '[Firebase Portal] Rascunho não salvo:',
        e.message
      );
    });

  }, 1400);
};

function watchStatus() {
  if (statusUnsub) {
    statusUnsub();
    statusUnsub = null;
  }

  const recordId = window.rtcGetCurrentId?.();

  if (!auth.currentUser || fiscal || !recordId) {
    return;
  }

  statusUnsub = onSnapshot(
    doc(db, 'entrevistas', String(recordId)),

    snapshot => {
      if (!snapshot.exists()) {
        return;
      }

      const status = snapshot.data().status;

      let items = [];

      try {
        const mirror = JSON.parse(
          localStorage.getItem(
            'marubeni-painel-fiscal-previa-v2'
          ) || '[]'
        );

        items = Array.isArray(mirror)
          ? mirror
          : [];

      } catch (e) {
        console.warn(
          '[Firebase Portal] Cache inválido:',
          e
        );
      }

      const index = items.findIndex(
        item => item.id === snapshot.id
      );

      const entry = {
        id: snapshot.id,
        status
      };

      if (index >= 0) {
        items[index] = {
          ...items[index],
          ...entry
        };
      } else {
        items.push(entry);
      }

      localStorage.setItem(
        'marubeni-painel-fiscal-previa-v2',
        JSON.stringify(items)
      );

      const badge = el('rtc-client-status');

      if (badge) {
        badge.textContent =
          status === 'Aprovado Fiscal'
            ? 'Aprovado pelo Fiscal'
            : status === 'Correção solicitada'
              ? 'Correção solicitada pelo Fiscal'
              : 'Aguardando análise da Marubeni';
      }
    },

    e => {
      console.warn(
        '[Firebase Portal] Acompanhamento:',
        e.code,
        e.message
      );
    }
  );
}

onAuthStateChanged(auth, async u => {
  user = u;
  fiscal = isFiscal(u);
  window.rtcAuthenticated = fiscal;

  if (!authReady) {
    authReady = true;
    authPromiseResolve();
  }

  if (fiscal) {
    if (el('rtc-email')) {
      el('rtc-email').value = u.email;
    }

    if (statusUnsub) {
      statusUnsub();
      statusUnsub = null;
    }

    if (
      el('rtc-access')?.style.display === 'block'
    ) {
      showPanel();
    }

    return;
  }

  if (
    u &&
    !u.isAnonymous &&
    !u.uid.startsWith('producer_')
  ) {
    await signOut(auth);
    return;
  }

  if (!u) {
    try {
      const result = await signInAnonymously(auth);
      user = result.user;

    } catch (e) {
      err(e);
    }
  }
});
