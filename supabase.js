/* ============================================================
   Setor XI — login separado de cliente e de admin, questionário
   e banco de dados. Usa Supabase (Auth por e-mail/senha + Postgres
   com Row Level Security), plano gratuito, sem cartão. Troque
   SUPABASE_CONFIG abaixo pelos dados do seu projeto em
   supabase.com — sem isso, login e questionário mostram um aviso
   em vez de travar a página.

   Cliente: modal do cabeçalho ("Entrar"), com aba de criar conta —
   leva à seção #minha-conta.
   Admin: formulário próprio dentro de #admin (sem cadastro; a conta
   já existe, foi criada como cliente e depois marcada como admin
   manualmente na tabela `admins`, pelo editor SQL do Supabase).
   Os dois usam o mesmo projeto Supabase por baixo (é o mesmo banco
   gratuito) mas são fluxos de login completamente separados na tela.
   ============================================================ */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

(function () {
  "use strict";

  // TROQUE pelos valores do SEU projeto (Configurações do projeto >
  // API, em supabase.com). A anonKey é pública por design — a
  // segurança de verdade vem das políticas de RLS nas tabelas, não
  // de esconder essa chave.
  var SUPABASE_CONFIG = {
    url: "https://kpfestnmeuizcctmsmhr.supabase.co",
    anonKey:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwZmVzdG5tZXVpemNjdG1zbWhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzMjE4NDYsImV4cCI6MjEwNDg5Nzg0Nn0.kj8Lrn6YfEi2MfZCdS_W36sg7LUSWPWd1pDmN3rhClw",
  };

  var isConfigured = SUPABASE_CONFIG.url.indexOf("SEUPROJETO") === -1;

  var supabase = isConfigured
    ? createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey)
    : null;

  var currentUser = null;
  var isAdminUser = false;
  var authMode = "login";

  /* --- elementos já existentes no index.html --- */
  var loginBtn = document.getElementById("account-login-btn");
  var logoutBtn = document.getElementById("account-logout-btn");
  var greetingEl = document.getElementById("account-greeting");
  var questionarioForm = document.getElementById("questionario-form");
  var questionarioStatus = document.getElementById("questionario-status");

  var contaSection = document.getElementById("minha-conta");
  var contaInfo = document.getElementById("conta-info");
  var contaLogoutBtn = document.getElementById("conta-logout-btn");

  var adminLoginWrap = document.getElementById("admin-login-wrap");
  var adminLoginForm = document.getElementById("admin-login-form");
  var adminLoginStatus = document.getElementById("admin-login-status");
  var adminPanelWrap = document.getElementById("admin-panel-wrap");
  var adminStatus = document.getElementById("admin-status");
  var adminTableBody = document.getElementById("admin-table-body");
  var adminLogoutBtn = document.getElementById("admin-logout-btn");

  function setStatus(el, message, kind) {
    if (!el) return;
    el.textContent = message || "";
    el.classList.remove("contact-form__status--ok", "contact-form__status--error");
    if (kind === "ok") el.classList.add("contact-form__status--ok");
    if (kind === "error") el.classList.add("contact-form__status--error");
  }

  function friendlyAuthError(err) {
    var msg = (err && err.message) || "";
    var code = (err && err.code) || "";
    if (code === "user_already_exists" || /already registered/i.test(msg)) return "Esse e-mail já tem conta. Tenta entrar em vez de criar.";
    if (code === "weak_password" || /password should be at least/i.test(msg)) return "Senha muito curta (mínimo 6 caracteres).";
    if (code === "invalid_credentials" || /invalid login credentials/i.test(msg)) return "E-mail ou senha incorretos.";
    if (code === "email_not_confirmed" || /email not confirmed/i.test(msg)) return "Confirma seu e-mail antes de entrar (a gente mandou um link).";
    if (/invalid email|unable to validate email/i.test(msg)) return "E-mail inválido.";
    if (/rate limit|too many/i.test(msg)) return "Muitas tentativas. Espera um pouco e tenta de novo.";
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
        task = supabase.auth
          .signUp({
            email: email,
            password: senha,
            options: { data: { nome: nome } },
          })
          .then(function (res) {
            if (res.error) return res;
            if (!res.data.session) return { needsConfirmation: true };
            return res;
          });
      } else {
        task = supabase.auth.signInWithPassword({ email: email, password: senha });
      }

      task.then(function (res) {
        if (res.error) {
          setStatus(refs.status, friendlyAuthError(res.error), "error");
          return;
        }
        if (res.needsConfirmation) {
          setStatus(refs.status, "Conta criada! Confira seu e-mail para confirmar antes de entrar.", "ok");
          return;
        }
        close();
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
      if (supabase) supabase.auth.signOut();
    });
  }

  /* ============================================================
     Estado de login: cabeçalho
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
  }

  /* ============================================================
     Área do cliente ("Minha conta") — só aparece pra quem entrou
     pelo modal do cabeçalho, independente de ser admin ou não.
     ============================================================ */
  function renderContaSection() {
    if (!contaSection) return;
    contaSection.hidden = !currentUser;
    if (!currentUser || !contaInfo) return;
    var criadoEm = currentUser.created_at
      ? new Date(currentUser.created_at).toLocaleDateString("pt-BR")
      : "";
    contaInfo.textContent =
      (currentUser.displayName || "Cliente Setor XI") +
      " · " +
      currentUser.email +
      (criadoEm ? " · conta criada em " + criadoEm : "");
  }

  if (contaLogoutBtn) {
    contaLogoutBtn.addEventListener("click", function () {
      if (supabase) supabase.auth.signOut();
    });
  }

  function checkIsAdmin(uid) {
    return supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", uid)
      .maybeSingle()
      .then(function (res) {
        return !res.error && !!res.data;
      });
  }

  function fetchUserProfile(uid) {
    return supabase
      .from("profiles")
      .select("nome")
      .eq("id", uid)
      .maybeSingle()
      .then(function (res) {
        return res.error ? null : res.data;
      });
  }

  if (isConfigured) {
    supabase.auth.onAuthStateChange(function (event, session) {
      var user = session ? session.user : null;
      currentUser = user;
      if (!user) {
        isAdminUser = false;
        updateHeaderUI();
        renderContaSection();
        renderAdminSection();
        return;
      }
      Promise.all([fetchUserProfile(user.id), checkIsAdmin(user.id)]).then(function (results) {
        var profile = results[0];
        isAdminUser = results[1];
        currentUser.displayName = profile && profile.nome ? profile.nome : null;
        updateHeaderUI();
        renderContaSection();
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
        time_coracao: form.time.value.trim(),
        faixa_etaria: form.faixaEtaria.value,
        como_conheceu: form.comoConheceu.value,
        resposta: form.resposta.value.trim(),
        user_id: currentUser ? currentUser.id : null,
      };
      supabase
        .from("questionnaire_responses")
        .insert(data)
        .then(function (res) {
          if (res.error) {
            setStatus(questionarioStatus, "Não deu certo. Tenta de novo em instantes.", "error");
            return;
          }
          setStatus(questionarioStatus, "Valeu! Resposta enviada.", "ok");
          form.reset();
        });
    });
  }

  /* ============================================================
     Painel admin
     ============================================================ */
  function formatDate(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("pt-BR", {
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
    if (!adminLoginWrap || !adminPanelWrap) return;
    if (isAdminUser) {
      adminLoginWrap.hidden = true;
      adminPanelWrap.hidden = false;
      loadResponses();
    } else {
      adminLoginWrap.hidden = false;
      adminPanelWrap.hidden = true;
    }
  }

  if (adminLoginForm) {
    adminLoginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!isConfigured) {
        setStatus(adminLoginStatus, "Painel ainda não conectado.", "error");
        return;
      }
      var email = adminLoginForm.email.value.trim();
      var senha = adminLoginForm.senha.value;
      setStatus(adminLoginStatus, "Entrando...");
      supabase.auth
        .signInWithPassword({ email: email, password: senha })
        .then(function (res) {
          if (res.error) {
            setStatus(adminLoginStatus, friendlyAuthError(res.error), "error");
            return;
          }
          return checkIsAdmin(res.data.user.id).then(function (admin) {
            if (!admin) {
              setStatus(adminLoginStatus, "Essa conta não tem acesso administrativo.", "error");
              return;
            }
            adminLoginForm.reset();
            setStatus(adminLoginStatus, "");
          });
        });
    });
  }

  if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener("click", function () {
      if (supabase) supabase.auth.signOut();
    });
  }

  function loadResponses() {
    if (!adminTableBody) return;
    setStatus(adminStatus, "Carregando...");
    supabase
      .from("questionnaire_responses")
      .select("*")
      .order("created_at", { ascending: false })
      .then(function (res) {
        if (res.error) {
          setStatus(adminStatus, "Erro ao carregar (confira as políticas de RLS).", "error");
          return;
        }
        var rows = res.data || [];
        adminTableBody.innerHTML = "";
        if (rows.length === 0) {
          setStatus(adminStatus, "Nenhuma resposta ainda.");
          return;
        }
        setStatus(adminStatus, rows.length + " resposta(s).");
        rows.forEach(function (d) {
          var tr = document.createElement("tr");
          tr.appendChild(textCell(formatDate(d.created_at)));
          tr.appendChild(textCell(d.nome));
          tr.appendChild(textCell(d.cidade));
          tr.appendChild(textCell(d.time_coracao));
          tr.appendChild(textCell(d.faixa_etaria));
          tr.appendChild(textCell(d.como_conheceu));
          tr.appendChild(textCell(d.resposta));
          adminTableBody.appendChild(tr);
        });
      });
  }
})();
