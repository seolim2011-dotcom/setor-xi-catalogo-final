/* ============================================================
   Setor XI — login (cliente + admin), questionário e banco de dados
   Usa Firebase Authentication (e-mail/senha) + Firestore, plano
   Spark (gratuito). Troque FIREBASE_CONFIG abaixo pela config do
   seu projeto em console.firebase.google.com — sem isso, login e
   questionário mostram um aviso em vez de travar a página.
   ============================================================ */

import {
  initializeApp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  query,
  orderBy,
  getDocs,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

(function () {
  "use strict";

  // TROQUE pelos valores do SEU projeto (Configurações do projeto > Geral >
  // Seus apps > Web, em console.firebase.google.com). Essa config é pública
  // — a segurança de verdade vem das regras do Firestore, não de escondê-la.
  var FIREBASE_CONFIG = {
    apiKey: "SUA_API_KEY",
    authDomain: "SEU_PROJETO.firebaseapp.com",
    projectId: "SEU_PROJETO",
    storageBucket: "SEU_PROJETO.appspot.com",
    messagingSenderId: "SEU_SENDER_ID",
    appId: "SEU_APP_ID",
  };

  var isConfigured = FIREBASE_CONFIG.apiKey.indexOf("SUA_API_KEY") === -1;

  var app, auth, db;
  if (isConfigured) {
    app = initializeApp(FIREBASE_CONFIG);
    auth = getAuth(app);
    db = getFirestore(app);
  }

  var currentUser = null;
  var isAdminUser = false;
  var authMode = "login";

  /* --- elementos já existentes no index.html --- */
  var loginBtn = document.getElementById("account-login-btn");
  var logoutBtn = document.getElementById("account-logout-btn");
  var greetingEl = document.getElementById("account-greeting");
  var adminLink = document.getElementById("account-admin-link");
  var questionarioForm = document.getElementById("questionario-form");
  var questionarioStatus = document.getElementById("questionario-status");
  var adminSection = document.getElementById("admin");
  var adminStatus = document.getElementById("admin-status");
  var adminTableBody = document.getElementById("admin-table-body");

  function setStatus(el, message, kind) {
    if (!el) return;
    el.textContent = message || "";
    el.classList.remove("contact-form__status--ok", "contact-form__status--error");
    if (kind === "ok") el.classList.add("contact-form__status--ok");
    if (kind === "error") el.classList.add("contact-form__status--error");
  }

  function friendlyAuthError(err) {
    var code = (err && err.code) || "";
    if (code === "auth/email-already-in-use") return "Esse e-mail já tem conta. Tenta entrar em vez de criar.";
    if (code === "auth/invalid-email") return "E-mail inválido.";
    if (code === "auth/weak-password") return "Senha muito curta (mínimo 6 caracteres).";
    if (code === "auth/wrong-password" || code === "auth/invalid-credential") return "E-mail ou senha incorretos.";
    if (code === "auth/user-not-found") return "Não achei conta com esse e-mail.";
    if (code === "auth/too-many-requests") return "Muitas tentativas. Espera um pouco e tenta de novo.";
    return "Não deu certo. Tenta de novo em instantes.";
  }

  /* ============================================================
     Modal de login / cadastro — mesmo componente .modal da telinha
     de produto, montado do mesmo jeito (buildModal em app.js).
     ============================================================ */
  var authModal = (function buildAuthModal() {
    var root = document.createElement("div");
    root.className = "modal";
    root.id = "auth-modal";
    root.hidden = true;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "auth-modal-title");
    root.innerHTML =
      '<div class="modal__backdrop" data-close></div>' +
      '<div class="modal__dialog auth-modal__dialog">' +
      '<button type="button" class="modal__close" data-close aria-label="Fechar">&times;</button>' +
      '<div class="modal__body auth-modal__body">' +
      '<div class="auth-modal__tabs">' +
      '<button type="button" class="auth-modal__tab is-active" data-mode="login">Entrar</button>' +
      '<button type="button" class="auth-modal__tab" data-mode="signup">Criar conta</button>' +
      "</div>" +
      '<h2 class="modal__name" id="auth-modal-title">Entrar</h2>' +
      '<form class="contact-form auth-form" autocomplete="off">' +
      '<input class="contact-form__field auth-form__nome" type="text" name="nome" placeholder="Seu nome" hidden />' +
      '<input class="contact-form__field" type="email" name="email" placeholder="E-mail" required />' +
      '<input class="contact-form__field" type="password" name="senha" placeholder="Senha (mínimo 6 caracteres)" minlength="6" required />' +
      '<button type="submit" class="contact-btn contact-btn--primary contact-form__submit">Entrar</button>' +
      '<p class="contact-form__status" role="status" aria-live="polite"></p>' +
      "</form>" +
      "</div>" +
      "</div>";
    document.body.appendChild(root);

    var refs = {
      root: root,
      title: root.querySelector("#auth-modal-title"),
      tabs: root.querySelectorAll(".auth-modal__tab"),
      nomeField: root.querySelector(".auth-form__nome"),
      form: root.querySelector(".auth-form"),
      submit: root.querySelector(".contact-form__submit"),
      status: root.querySelector(".contact-form__status"),
    };

    var lastFocused = null;

    function open() {
      lastFocused = document.activeElement;
      root.hidden = false;
      document.body.classList.add("modal-open");
      var emailField = refs.form.querySelector('input[name="email"]');
      if (emailField) emailField.focus();
    }

    function close() {
      root.hidden = true;
      document.body.classList.remove("modal-open");
      refs.form.reset();
      setStatus(refs.status, "");
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }

    function setMode(mode) {
      authMode = mode;
      refs.tabs.forEach(function (tab) {
        tab.classList.toggle("is-active", tab.dataset.mode === mode);
      });
      refs.nomeField.hidden = mode !== "signup";
      refs.nomeField.required = mode === "signup";
      refs.title.textContent = mode === "signup" ? "Criar conta" : "Entrar";
      refs.submit.textContent = mode === "signup" ? "Criar conta" : "Entrar";
      setStatus(refs.status, "");
    }

    root.addEventListener("click", function (e) {
      if (e.target.closest("[data-close]")) close();
      var tab = e.target.closest(".auth-modal__tab");
      if (tab) setMode(tab.dataset.mode);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !root.hidden) close();
    });

    refs.form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!isConfigured) {
        setStatus(refs.status, "Login ainda não conectado. Fala com a gente pelo WhatsApp.", "error");
        return;
      }
      var email = refs.form.email.value.trim();
      var senha = refs.form.senha.value;
      var nome = refs.form.nome.value.trim();
      setStatus(refs.status, "Enviando...");

      var task;
      if (authMode === "signup") {
        task = createUserWithEmailAndPassword(auth, email, senha).then(function (cred) {
          return setDoc(doc(db, "users", cred.user.uid), {
            nome: nome,
            email: email,
            criadoEm: serverTimestamp(),
          });
        });
      } else {
        task = signInWithEmailAndPassword(auth, email, senha);
      }

      task
        .then(function () {
          close();
        })
        .catch(function (err) {
          setStatus(refs.status, friendlyAuthError(err), "error");
        });
    });

    return { open: open, close: close, setMode: setMode };
  })();

  if (loginBtn) {
    loginBtn.addEventListener("click", function () {
      authModal.setMode("login");
      authModal.open();
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      if (auth) signOut(auth);
    });
  }

  /* ============================================================
     Estado de login: cabeçalho + acesso ao painel admin
     ============================================================ */
  function updateHeaderUI() {
    if (currentUser) {
      if (loginBtn) loginBtn.hidden = true;
      if (logoutBtn) logoutBtn.hidden = false;
      if (greetingEl) {
        greetingEl.hidden = false;
        greetingEl.textContent = "Olá, " + (currentUser.displayName || currentUser.email);
      }
    } else {
      if (loginBtn) loginBtn.hidden = false;
      if (logoutBtn) logoutBtn.hidden = true;
      if (greetingEl) {
        greetingEl.hidden = true;
        greetingEl.textContent = "";
      }
    }
    if (adminLink) adminLink.hidden = !isAdminUser;
  }

  function checkIsAdmin(uid) {
    return getDoc(doc(db, "admins", uid))
      .then(function (snap) {
        return snap.exists();
      })
      .catch(function () {
        return false;
      });
  }

  function fetchUserProfile(uid) {
    return getDoc(doc(db, "users", uid))
      .then(function (snap) {
        return snap.exists() ? snap.data() : null;
      })
      .catch(function () {
        return null;
      });
  }

  if (isConfigured) {
    onAuthStateChanged(auth, function (user) {
      currentUser = user;
      if (!user) {
        isAdminUser = false;
        updateHeaderUI();
        renderAdminSection();
        return;
      }
      Promise.all([fetchUserProfile(user.uid), checkIsAdmin(user.uid)]).then(function (results) {
        var profile = results[0];
        isAdminUser = results[1];
        if (profile && profile.nome) currentUser.displayName = profile.nome;
        updateHeaderUI();
        renderAdminSection();
      });
    });
  }

  /* ============================================================
     Questionário
     ============================================================ */
  if (questionarioForm) {
    questionarioForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!isConfigured) {
        setStatus(questionarioStatus, "Questionário ainda não conectado. Fala com a gente pelo WhatsApp.", "error");
        return;
      }
      var form = questionarioForm;
      setStatus(questionarioStatus, "Enviando...");
      var data = {
        nome: form.nome.value.trim(),
        cidade: form.cidade.value.trim(),
        time: form.time.value.trim(),
        faixaEtaria: form.faixaEtaria.value,
        comoConheceu: form.comoConheceu.value,
        resposta: form.resposta.value.trim(),
        uid: currentUser ? currentUser.uid : null,
        createdAt: serverTimestamp(),
      };
      addDoc(collection(db, "questionnaireResponses"), data)
        .then(function () {
          setStatus(questionarioStatus, "Valeu! Resposta enviada.", "ok");
          form.reset();
        })
        .catch(function () {
          setStatus(questionarioStatus, "Não deu certo. Tenta de novo em instantes.", "error");
        });
    });
  }

  /* ============================================================
     Painel admin
     ============================================================ */
  function formatDate(ts) {
    if (!ts || !ts.toDate) return "";
    return ts.toDate().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function textCell(text) {
    var td = document.createElement("td");
    td.textContent = text || "";
    return td;
  }

  function renderAdminSection() {
    if (!adminSection) return;
    adminSection.hidden = !isAdminUser;
    if (!isAdminUser) return;
    loadResponses();
  }

  function loadResponses() {
    if (!adminTableBody) return;
    setStatus(adminStatus, "Carregando...");
    var q = query(collection(db, "questionnaireResponses"), orderBy("createdAt", "desc"));
    getDocs(q)
      .then(function (snap) {
        adminTableBody.innerHTML = "";
        if (snap.empty) {
          setStatus(adminStatus, "Nenhuma resposta ainda.");
          return;
        }
        setStatus(adminStatus, snap.size + " resposta(s).");
        snap.forEach(function (docSnap) {
          var d = docSnap.data();
          var tr = document.createElement("tr");
          tr.appendChild(textCell(formatDate(d.createdAt)));
          tr.appendChild(textCell(d.nome));
          tr.appendChild(textCell(d.cidade));
          tr.appendChild(textCell(d.time));
          tr.appendChild(textCell(d.faixaEtaria));
          tr.appendChild(textCell(d.comoConheceu));
          tr.appendChild(textCell(d.resposta));
          adminTableBody.appendChild(tr);
        });
      })
      .catch(function () {
        setStatus(adminStatus, "Erro ao carregar (confira as regras do Firestore).", "error");
      });
  }
})();
