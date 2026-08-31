/* ============================================================
   Setor XI — renderização do catálogo
   Lê os produtos de products.js (window.SETOR_XI_PRODUCTS),
   monta os filtros de categoria e a grade de cards.
   Para editar produtos, mexa em products.js — não aqui.
   ============================================================ */

(function () {
  "use strict";

  var products = window.SETOR_XI_PRODUCTS || [];

  var gridEl = document.getElementById("product-grid");
  var filtersEl = document.getElementById("filters");
  var countEl = document.getElementById("result-count");
  var bgEl = document.querySelector(".category-bg");
  var bgLayers = bgEl ? bgEl.querySelectorAll(".category-bg__layer") : [];

  /* Fundo por categoria: valor = caminho da imagem, ou lista de imagens
     que alternam entre si (slideshow) enquanto a aba estiver ativa. */
  var CATEGORY_BACKGROUNDS = {
    Todos: "img/bg-todos.jpg",
    "Camisas de Seleção": [
      "img/bg-selecao-brasil.jpg",
      "img/bg-selecao-espanha.jpg",
      "img/bg-selecao-argentina.jpg",
    ],
    "Camisas de Clube": "img/bg-camisas-de-clube.jpg",
  };

  var BG_ROTATE_MS = 7000;

  var BRL = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  var WHATSAPP_URL = "https://wa.me/5545991271005";
  var INSTAGRAM_URL = "https://instagram.com/setorxi";
  var CONTACT_CATEGORY = "Entre em contato";

  var activeCategory = "Todos";

  /* --- Placeholder da marca: textura de listras + faixa diagonal --- */
  function placeholderImage(product) {
    var number = escapeXml(product.number || "XI");
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500">' +
      '<defs><pattern id="tw" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
      '<rect width="40" height="40" fill="#151515"/><rect width="20" height="40" fill="#181818"/>' +
      "</pattern></defs>" +
      '<rect width="400" height="500" fill="#131313"/>' +
      '<rect width="400" height="500" fill="url(#tw)"/>' +
      '<g transform="rotate(-45 200 250)">' +
      '<rect x="-160" y="228" width="720" height="26" fill="#1fdd6d"/>' +
      '<rect x="-160" y="258" width="720" height="7" fill="#f5f5f5"/>' +
      "</g>" +
      '<text x="32" y="52" font-family="Arial, sans-serif" font-weight="800" font-size="17" letter-spacing="4" fill="#f5f5f5" fill-opacity="0.75">SETOR XI</text>' +
      '<text x="368" y="468" text-anchor="end" font-family="Arial, sans-serif" font-weight="800" font-size="72" fill="#f5f5f5" fill-opacity="0.9">' +
      number +
      "</text>" +
      "</svg>";
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  function escapeXml(value) {
    return String(value).replace(/[<>&"']/g, function (ch) {
      return {
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      }[ch];
    });
  }

  /* --- Filtros de categoria --- */
  function buildFilters() {
    var categories = ["Todos"];
    products.forEach(function (product) {
      if (categories.indexOf(product.category) === -1) {
        categories.push(product.category);
      }
    });
    if (categories.indexOf(CONTACT_CATEGORY) === -1) {
      categories.push(CONTACT_CATEGORY);
    }

    filtersEl.innerHTML = "";
    categories.forEach(function (category) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "filter-chip";
      button.textContent = category;
      button.setAttribute("aria-pressed", String(category === activeCategory));
      button.addEventListener("click", function () {
        if (category === activeCategory) return;
        activeCategory = category;
        syncFilterState();
        updateBackground();
        swapGrid();
      });
      filtersEl.appendChild(button);
    });
  }

  function syncFilterState() {
    var chips = filtersEl.querySelectorAll(".filter-chip");
    chips.forEach(function (chip) {
      chip.setAttribute(
        "aria-pressed",
        String(chip.textContent === activeCategory)
      );
    });
  }

  var prefersReducedMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --- Fundo da categoria ativa (com slideshow opcional) --- */
  var bgTimer = null;
  var bgTop = 0;

  function stopBgRotation() {
    if (bgTimer) {
      window.clearInterval(bgTimer);
      bgTimer = null;
    }
  }

  function updateBackground() {
    if (!bgEl) return;
    stopBgRotation();

    var entry = CATEGORY_BACKGROUNDS[activeCategory];
    if (!entry) {
      bgEl.classList.remove("is-visible");
      return;
    }

    var imgs = typeof entry === "string" ? [entry] : entry;

    bgTop = 0;
    bgLayers[0].style.backgroundImage = 'url("' + imgs[0] + '")';
    bgLayers[0].classList.add("is-top");
    bgLayers[1].classList.remove("is-top");
    bgEl.classList.add("is-visible");

    if (imgs.length < 2 || prefersReducedMotion) return;

    imgs.forEach(function (src) {
      var pre = new Image();
      pre.src = src;
    });

    var idx = 0;
    bgTimer = window.setInterval(function () {
      idx = (idx + 1) % imgs.length;
      var back = bgTop === 0 ? 1 : 0;
      bgLayers[back].style.backgroundImage = 'url("' + imgs[idx] + '")';
      void bgLayers[back].offsetWidth;
      bgLayers[back].classList.add("is-top");
      bgLayers[bgTop].classList.remove("is-top");
      bgTop = back;
    }, BG_ROTATE_MS);
  }

  /* --- Troca de categoria com transição (sai -> entra escalonado) --- */
  function swapGrid() {
    if (prefersReducedMotion) {
      renderGrid(false);
      return;
    }
    gridEl.classList.add("grid--leaving");
    window.setTimeout(function () {
      gridEl.classList.remove("grid--leaving");
      renderGrid(true);
    }, 160);
  }

  /* --- Painel de contato (aba "Entre em contato") --- */
  function renderContact() {
    if (countEl) countEl.textContent = "";
    gridEl.innerHTML = "";

    var panel = document.createElement("div");
    panel.className = "contact-panel";

    var title = document.createElement("h2");
    title.className = "contact-panel__title";
    title.textContent = "Camisas personalizadas e pedidos especiais";

    var text = document.createElement("p");
    text.className = "contact-panel__text";
    text.textContent =
      "Feitos sob encomenda. Chama a gente no Instagram ou no WhatsApp.";

    var actions = document.createElement("div");
    actions.className = "contact-panel__actions";

    var ig = document.createElement("a");
    ig.className = "contact-btn contact-btn--primary";
    ig.href = INSTAGRAM_URL;
    ig.target = "_blank";
    ig.rel = "noopener";
    ig.textContent = "Ver no Instagram · @setorxi";

    var wa = document.createElement("a");
    wa.className = "contact-btn";
    wa.href = WHATSAPP_URL;
    wa.target = "_blank";
    wa.rel = "noopener";
    wa.textContent = "WhatsApp (45) 99127-1005";

    actions.appendChild(ig);
    actions.appendChild(wa);
    panel.appendChild(title);
    panel.appendChild(text);
    panel.appendChild(actions);
    gridEl.appendChild(panel);
  }

  /* --- Grade de produtos --- */
  function renderGrid(animate) {
    if (activeCategory === CONTACT_CATEGORY) {
      renderContact();
      return;
    }

    var visible = products.filter(function (product) {
      return activeCategory === "Todos" || product.category === activeCategory;
    });

    // sempre em ordem alfabética pelo nome
    visible.sort(function (a, b) {
      return a.name.localeCompare(b.name, "pt-BR", {
        numeric: true,
        sensitivity: "base",
      });
    });

    if (countEl) {
      countEl.textContent =
        visible.length === 1 ? "1 modelo" : visible.length + " modelos";
    }

    gridEl.innerHTML = "";

    if (visible.length === 0) {
      var empty = document.createElement("p");
      empty.className = "grid__empty";
      empty.textContent = "Nenhuma camisa nesta categoria por enquanto.";
      gridEl.appendChild(empty);
      return;
    }

    visible.forEach(function (product, index) {
      var card = createCard(product);
      if (animate && !prefersReducedMotion) {
        card.classList.add("card--enter");
        card.style.animationDelay = Math.min(index, 8) * 32 + "ms";
        card.addEventListener(
          "animationend",
          function () {
            card.classList.remove("card--enter");
            card.style.animationDelay = "";
          },
          { once: true }
        );
      }
      gridEl.appendChild(card);
    });
  }

  /* Define a imagem do card com versão pequena (mobile) + grande via srcset.
     No arquivo único (bundle) esta função é trocada por uma que resolve as
     imagens embutidas em base64. */
  function setCardImage(img, product) {
    if (!product.image) {
      img.src = placeholderImage(product);
      return;
    }
    img.src = product.image;
    img.srcset =
      product.image.replace("fotos/", "fotos/sm/") +
      " 460w, " +
      product.image +
      " 900w";
    img.sizes = "(max-width: 560px) 46vw, (max-width: 960px) 31vw, 260px";
  }

  function createCard(product) {
    var card = document.createElement("article");
    card.className = "card";

    var media = document.createElement("div");
    media.className = "card__media";

    var img = document.createElement("img");
    img.alt = "Camisa " + product.name;
    img.loading = "lazy";
    img.decoding = "async";
    setCardImage(img, product);
    media.appendChild(img);

    if (product.badge) {
      var badge = document.createElement("span");
      badge.className = "card__badge";
      badge.textContent = product.badge;
      media.appendChild(badge);
    }

    var body = document.createElement("div");
    body.className = "card__body";

    var category = document.createElement("span");
    category.className = "card__category";
    category.textContent = product.category;

    var name = document.createElement("h2");
    name.className = "card__name";
    name.textContent = product.name;

    var price;
    if (typeof product.price === "number") {
      price = document.createElement("p");
      price.className = "card__price";
      price.textContent = BRL.format(product.price);
    } else if (typeof product.price === "string" && product.price.trim()) {
      price = document.createElement("p");
      price.className = "card__price";
      price.textContent = product.price;
    } else {
      price = document.createElement("a");
      price.className = "card__price card__price--contact";
      price.href =
        WHATSAPP_URL +
        "?text=" +
        encodeURIComponent(
          "Olá! Tenho interesse na " + product.name + " (Setor XI)."
        );
      price.target = "_blank";
      price.rel = "noopener";
      price.textContent = "Falar no WhatsApp";
    }

    body.appendChild(category);
    body.appendChild(name);
    body.appendChild(price);

    card.appendChild(media);
    card.appendChild(body);
    return card;
  }

  /* Pausa o movimento do fundo quando a aba do navegador não está visível
     (economiza bateria no celular). */
  if (bgEl && !prefersReducedMotion) {
    document.addEventListener("visibilitychange", function () {
      bgEl.classList.toggle("is-paused", document.hidden);
    });
  }

  /* --- Início --- */
  if (!gridEl || !filtersEl) return;
  buildFilters();
  updateBackground();
  renderGrid(true);
})();
