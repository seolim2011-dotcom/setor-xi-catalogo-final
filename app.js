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
  var searchEl = document.getElementById("search-input");
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
    "Edições Especiais": "img/bg-especiais.jpg",
    Retrô: "img/bg-retro.jpg",
    "Corta-Ventos": "img/bg-corta-ventos.jpg",
  };

  var BG_ROTATE_MS = 8500;

  var BRL = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  var WHATSAPP_URL = "https://wa.me/5545991271005";
  var INSTAGRAM_URL = "https://instagram.com/setorxi";
  var CONTACT_CATEGORY = "Entre em contato";

  /* Carrinho: tamanhos disponíveis, endereço público do site (as fotos
     vão como link na mensagem do WhatsApp) e chave do localStorage. */
  var SIZES = ["PP", "P", "M", "G", "GG", "2GG", "3GG", "4GG"];
  var SITE_URL = "https://seolim2011-dotcom.github.io/setor-xi-catalogo-final/";
  var CART_KEY = "setorxi-cart-v1";

  var productById = {};
  products.forEach(function (product) {
    productById[product.id] = product;
  });

  /* TROQUE pelo endpoint real do seu form no Formspree (ou Getform):
     crie uma conta grátis em formspree.io, crie um form lá, e cole aqui
     a URL que eles derem (tipo "https://formspree.io/f/xxxxxxx"). Até lá
     o formulário do site mostra um aviso em vez de tentar enviar. */
  var CONTACT_FORM_ENDPOINT = "https://formspree.io/f/SEU_FORM_ID";

  var activeCategory = "Todos";
  var searchQuery = "";

  /* remove acentos pra busca não depender de digitar "ção" certinho */
  function normalizeText(value) {
    return String(value)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();
  }

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

  /* --- Telinha do produto (foto + história + WhatsApp) --- */
  var STORY_FALLBACK =
    "Peça da coleção Setor XI. Chama no WhatsApp pra ver tecido, tamanhos disponíveis e opções de personalização.";
  var lastFocused = null;
  var currentGallery = [];

  var modal = buildModal();

  function buildModal() {
    var root = document.createElement("div");
    root.className = "modal";
    root.hidden = true;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "modal-name");
    root.innerHTML =
      '<div class="modal__backdrop" data-close></div>' +
      '<div class="modal__dialog">' +
      '<button type="button" class="modal__close" data-close aria-label="Fechar">&times;</button>' +
      '<div class="modal__media">' +
      '<img class="modal__media-img" alt="" decoding="async" />' +
      '<div class="modal__thumbs" hidden></div>' +
      "</div>" +
      '<div class="modal__body">' +
      '<span class="modal__category"></span>' +
      '<h2 class="modal__name" id="modal-name"></h2>' +
      '<p class="modal__story"></p>' +
      '<p class="modal__price"></p>' +
      '<div class="modal__sizes" role="group" aria-label="Tamanho">' +
      '<span class="modal__sizes-label">Tamanho</span>' +
      '<div class="modal__sizes-list"></div>' +
      "</div>" +
      '<div class="modal__actions">' +
      '<button type="button" class="modal__add">Adicionar ao carrinho</button>' +
      '<button type="button" class="modal__view-cart" hidden>Ver carrinho</button>' +
      "</div>" +
      '<p class="modal__add-status" role="status" aria-live="polite"></p>' +
      '<a class="modal__cta" target="_blank" rel="noopener">Falar no WhatsApp</a>' +
      "</div>" +
      "</div>";
    document.body.appendChild(root);

    var sizesList = root.querySelector(".modal__sizes-list");
    SIZES.forEach(function (size) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "size-chip";
      chip.dataset.size = size;
      chip.textContent = size;
      chip.setAttribute("aria-pressed", "false");
      sizesList.appendChild(chip);
    });

    root.addEventListener("click", function (e) {
      if (e.target.closest("[data-close]")) closeProduct();
      var thumbBtn = e.target.closest(".modal__thumb");
      if (thumbBtn) selectGalleryImage(Number(thumbBtn.dataset.index));
      var sizeBtn = e.target.closest(".size-chip");
      if (sizeBtn) selectSize(sizeBtn.dataset.size);
      if (e.target.closest(".modal__add")) addCurrentToCart();
      if (e.target.closest(".modal__view-cart")) {
        var backTo = lastFocused;
        closeProduct(true);
        openCart(backTo);
      }
    });

    return {
      root: root,
      img: root.querySelector(".modal__media-img"),
      thumbs: root.querySelector(".modal__thumbs"),
      category: root.querySelector(".modal__category"),
      name: root.querySelector(".modal__name"),
      price: root.querySelector(".modal__price"),
      story: root.querySelector(".modal__story"),
      sizes: root.querySelector(".modal__sizes"),
      chips: root.querySelectorAll(".size-chip"),
      viewCart: root.querySelector(".modal__view-cart"),
      status: root.querySelector(".modal__add-status"),
      cta: root.querySelector(".modal__cta"),
      close: root.querySelector(".modal__close"),
    };
  }

  /* --- Mensagem do WhatsApp (o link só aceita texto: as fotos vão como
     link, e o WhatsApp mostra a miniatura da imagem na conversa) --- */
  function photoUrl(product) {
    if (!product.image) return "";
    var live =
      /^https?:$/.test(location.protocol) &&
      !/^(localhost|127\.0\.0\.1)$/.test(location.hostname);
    return new URL(product.image, live ? document.baseURI : SITE_URL).href;
  }

  function whatsappLink(text) {
    return WHATSAPP_URL + "?text=" + encodeURIComponent(text);
  }

  function productMessage(product, size) {
    var lines = ["Olá! Tenho interesse na " + product.name + " (Setor XI)."];
    if (size) lines.push("Tamanho: " + size);
    var photo = photoUrl(product);
    if (photo) lines.push("Foto: " + photo);
    return lines.join("\n");
  }

  /* --- Tamanho escolhido na telinha --- */
  var currentProduct = null;
  var selectedSize = null;

  function selectSize(size) {
    selectedSize = size;
    modal.chips.forEach(function (chip) {
      chip.setAttribute("aria-pressed", String(chip.dataset.size === size));
    });
    modal.sizes.classList.remove("is-error");
    setAddStatus("", false);
    modal.cta.href = whatsappLink(productMessage(currentProduct, selectedSize));
  }

  function setAddStatus(message, isError) {
    modal.status.textContent = message;
    modal.status.classList.toggle("modal__add-status--error", Boolean(isError));
  }

  function addCurrentToCart() {
    if (!currentProduct) return;
    if (!selectedSize) {
      modal.sizes.classList.add("is-error");
      setAddStatus("Escolha um tamanho pra adicionar ao carrinho.", true);
      return;
    }
    addToCart(currentProduct, selectedSize);
    setAddStatus("Adicionado ao carrinho ✓ (tamanho " + selectedSize + ")", false);
    modal.viewCart.hidden = false;
  }

  function openProduct(product) {
    renderGallery(product);
    modal.category.textContent = product.category;
    modal.name.textContent = product.name;
    modal.story.textContent = product.story || STORY_FALLBACK;
    modal.story.classList.toggle("modal__story--featured", Boolean(product.story));
    if (typeof product.price === "number") {
      modal.price.textContent = BRL.format(product.price);
    } else if (typeof product.price === "string" && product.price.trim()) {
      modal.price.textContent = product.price;
    } else {
      modal.price.textContent = "Preço a combinar";
    }
    currentProduct = product;
    selectedSize = null;
    modal.chips.forEach(function (chip) {
      chip.setAttribute("aria-pressed", "false");
    });
    modal.sizes.classList.remove("is-error");
    modal.viewCart.hidden = true;
    setAddStatus("", false);
    modal.cta.href = whatsappLink(productMessage(product, null));

    lastFocused = document.activeElement;
    modal.root.hidden = false;
    document.body.classList.add("modal-open");
    modal.close.focus();
  }

  function closeProduct(keepFocus) {
    modal.root.hidden = true;
    document.body.classList.remove("modal-open");
    if (!keepFocus && lastFocused && lastFocused.focus) lastFocused.focus();
  }

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (!cartUi.root.hidden) closeCart();
    else if (!modal.root.hidden) closeProduct();
  });

  /* ============================================================
     Carrinho — fica no localStorage; "Finalizar" abre o WhatsApp
     com a lista do pedido (nome, tamanho, quantidade e foto).
     ============================================================ */
  var cart = loadCart();
  var cartLastFocused = null;
  var cartUi = buildCartUi();

  function loadCart() {
    try {
      var raw = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      return raw
        .filter(function (item) {
          return (
            item &&
            productById[item.id] &&
            SIZES.indexOf(item.size) !== -1 &&
            item.qty > 0
          );
        })
        .map(function (item) {
          return {
            id: item.id,
            size: item.size,
            qty: Math.min(99, Math.floor(item.qty)),
          };
        });
    } catch (err) {
      return [];
    }
  }

  function saveCart() {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (err) {
      /* navegador sem armazenamento: o carrinho vale só nesta visita */
    }
  }

  function cartCount() {
    return cart.reduce(function (total, item) {
      return total + item.qty;
    }, 0);
  }

  function findLine(id, size) {
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].id === id && cart[i].size === size) return cart[i];
    }
    return null;
  }

  function addToCart(product, size) {
    var line = findLine(product.id, size);
    if (line) line.qty = Math.min(99, line.qty + 1);
    else cart.push({ id: product.id, size: size, qty: 1 });
    cartChanged();
    cartUi.fab.classList.remove("is-bump");
    void cartUi.fab.offsetWidth;
    cartUi.fab.classList.add("is-bump");
  }

  function changeQty(index, delta) {
    var line = cart[index];
    if (!line) return;
    line.qty = Math.min(99, line.qty + delta);
    if (line.qty <= 0) cart.splice(index, 1);
    cartChanged();
  }

  function changeSize(index, size) {
    var line = cart[index];
    if (!line || SIZES.indexOf(size) === -1) return;
    var other = findLine(line.id, size);
    if (other && other !== line) {
      other.qty = Math.min(99, other.qty + line.qty);
      cart.splice(index, 1);
    } else {
      line.size = size;
    }
    cartChanged();
  }

  function cartTotals() {
    var sum = 0;
    var toQuote = false;
    cart.forEach(function (item) {
      var price = productById[item.id].price;
      if (typeof price === "number") sum += price * item.qty;
      else toQuote = true;
    });
    var label;
    if (sum > 0) label = BRL.format(sum) + (toQuote ? " + itens a combinar" : "");
    else label = "a combinar";
    return { label: label };
  }

  function priceLabel(product) {
    return typeof product.price === "number"
      ? BRL.format(product.price) + " cada"
      : "a combinar";
  }

  function cartMessage() {
    var lines = ["Olá! Quero fazer este pedido na Setor XI:", ""];
    cart.forEach(function (item, index) {
      var product = productById[item.id];
      lines.push(index + 1 + ") " + product.name);
      lines.push("Tamanho: " + item.size + " | Qtd: " + item.qty);
      lines.push("Valor: " + priceLabel(product));
      var photo = photoUrl(product);
      if (photo) lines.push("Foto: " + photo);
      lines.push("");
    });
    lines.push("Total: " + cartTotals().label);
    return lines.join("\n");
  }

  function buildCartUi() {
    var fab = document.createElement("button");
    fab.type = "button";
    fab.className = "cart-fab";
    fab.setAttribute("aria-label", "Abrir carrinho");
    fab.innerHTML =
      '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M2 3h3l2.7 12.4a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 7H5.6"/>' +
      '<circle cx="9.5" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/></svg>' +
      '<span class="cart-fab__count" hidden></span>';
    document.body.appendChild(fab);

    var root = document.createElement("div");
    root.className = "cart";
    root.hidden = true;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "cart-title");
    root.innerHTML =
      '<div class="cart__backdrop" data-close-cart></div>' +
      '<aside class="cart__panel">' +
      '<header class="cart__head">' +
      '<h2 class="cart__title" id="cart-title">Seu carrinho</h2>' +
      '<button type="button" class="cart__close" data-close-cart aria-label="Fechar carrinho">&times;</button>' +
      "</header>" +
      '<div class="cart__body"></div>' +
      '<footer class="cart__foot" hidden>' +
      '<p class="cart__total"></p>' +
      '<a class="cart__checkout" target="_blank" rel="noopener">Finalizar no WhatsApp</a>' +
      '<button type="button" class="cart__share" hidden>Enviar com as fotos anexadas</button>' +
      '<p class="cart__share-status" role="status" aria-live="polite"></p>' +
      '<p class="cart__note">As fotos vão como link na mensagem do WhatsApp (aparece a miniatura na conversa). Em celulares compatíveis, o botão "Enviar com as fotos anexadas" manda as imagens de verdade.</p>' +
      '<button type="button" class="cart__clear">Esvaziar carrinho</button>' +
      "</footer>" +
      "</aside>";
    document.body.appendChild(root);

    var ui = {
      fab: fab,
      fabCount: fab.querySelector(".cart-fab__count"),
      root: root,
      body: root.querySelector(".cart__body"),
      foot: root.querySelector(".cart__foot"),
      total: root.querySelector(".cart__total"),
      checkout: root.querySelector(".cart__checkout"),
      share: root.querySelector(".cart__share"),
      shareStatus: root.querySelector(".cart__share-status"),
      close: root.querySelector(".cart__close"),
    };

    fab.addEventListener("click", function () {
      openCart(fab);
    });

    root.addEventListener("click", function (e) {
      if (e.target.closest("[data-close-cart]")) closeCart();
      if (e.target.closest(".cart__clear")) {
        cart = [];
        cartChanged();
        return;
      }
      var row = e.target.closest(".cart-item");
      if (!row) return;
      var index = Number(row.dataset.index);
      var stepBtn = e.target.closest("[data-step]");
      if (stepBtn) changeQty(index, Number(stepBtn.dataset.step));
      if (e.target.closest(".cart-item__remove")) changeQty(index, -99);
    });

    root.addEventListener("change", function (e) {
      var select = e.target.closest(".cart-item__size");
      if (select) changeSize(Number(select.closest(".cart-item").dataset.index), select.value);
    });

    ui.share.addEventListener("click", shareCartWithPhotos);
    if (canShareFiles()) ui.share.hidden = false;

    return ui;
  }

  /* Só no celular: abre a folha de compartilhar do aparelho com as fotos
     anexadas de verdade (o usuário escolhe o WhatsApp da Setor XI). */
  function canShareFiles() {
    try {
      if (!window.matchMedia("(pointer: coarse)").matches) return false;
      if (!navigator.share || !navigator.canShare) return false;
      return navigator.canShare({
        files: [new File([""], "x.jpg", { type: "image/jpeg" })],
      });
    } catch (err) {
      return false;
    }
  }

  function shareCartWithPhotos() {
    if (!cart.length) return;
    var seen = {};
    var unique = [];
    cart.forEach(function (item) {
      if (!seen[item.id]) {
        seen[item.id] = true;
        unique.push(productById[item.id]);
      }
    });
    cartUi.shareStatus.textContent = "Preparando as fotos...";
    Promise.all(
      unique.map(function (product) {
        return fetch(imageUrl(product))
          .then(function (res) {
            return res.blob();
          })
          .then(function (blob) {
            return new File([blob], product.id + ".jpg", {
              type: blob.type || "image/jpeg",
            });
          });
      })
    )
      .then(function (files) {
        return navigator.share({ files: files, text: cartMessage() });
      })
      .then(function () {
        cartUi.shareStatus.textContent = "";
      })
      .catch(function (err) {
        if (err && err.name === "AbortError") {
          cartUi.shareStatus.textContent = "";
          return;
        }
        cartUi.shareStatus.textContent =
          "Não deu pra anexar as fotos — use o botão verde (as fotos vão como link).";
      });
  }

  function renderCart() {
    var count = cartCount();
    cartUi.fabCount.hidden = count === 0;
    cartUi.fabCount.textContent = count > 99 ? "99+" : String(count);
    cartUi.fab.setAttribute(
      "aria-label",
      count ? "Abrir carrinho (" + count + " itens)" : "Abrir carrinho"
    );

    cartUi.body.innerHTML = "";
    cartUi.shareStatus.textContent = "";

    if (!cart.length) {
      var empty = document.createElement("p");
      empty.className = "cart__empty";
      empty.textContent =
        "Seu carrinho está vazio. Escolha uma camisa, selecione o tamanho e toque em \"Adicionar ao carrinho\".";
      cartUi.body.appendChild(empty);
      cartUi.foot.hidden = true;
      return;
    }

    cart.forEach(function (item, index) {
      var product = productById[item.id];

      var row = document.createElement("div");
      row.className = "cart-item";
      row.dataset.index = String(index);

      var thumb = document.createElement("img");
      thumb.className = "cart-item__thumb";
      thumb.alt = "";
      thumb.decoding = "async";
      setCardImage(thumb, product);
      thumb.sizes = "72px";

      var info = document.createElement("div");
      info.className = "cart-item__info";

      var name = document.createElement("p");
      name.className = "cart-item__name";
      name.textContent = product.name;

      var price = document.createElement("p");
      price.className = "cart-item__price";
      price.textContent = priceLabel(product);

      var controls = document.createElement("div");
      controls.className = "cart-item__controls";

      var select = document.createElement("select");
      select.className = "cart-item__size";
      select.setAttribute("aria-label", "Tamanho de " + product.name);
      SIZES.forEach(function (size) {
        var option = document.createElement("option");
        option.value = size;
        option.textContent = size;
        option.selected = size === item.size;
        select.appendChild(option);
      });

      var qty = document.createElement("div");
      qty.className = "cart-item__qty";
      var minus = document.createElement("button");
      minus.type = "button";
      minus.dataset.step = "-1";
      minus.setAttribute("aria-label", "Diminuir quantidade");
      minus.textContent = "−";
      var qtyValue = document.createElement("span");
      qtyValue.textContent = String(item.qty);
      var plus = document.createElement("button");
      plus.type = "button";
      plus.dataset.step = "1";
      plus.setAttribute("aria-label", "Aumentar quantidade");
      plus.textContent = "+";
      qty.appendChild(minus);
      qty.appendChild(qtyValue);
      qty.appendChild(plus);

      controls.appendChild(select);
      controls.appendChild(qty);

      info.appendChild(name);
      info.appendChild(price);
      info.appendChild(controls);

      var remove = document.createElement("button");
      remove.type = "button";
      remove.className = "cart-item__remove";
      remove.setAttribute("aria-label", "Remover " + product.name);
      remove.innerHTML = "&times;";

      row.appendChild(thumb);
      row.appendChild(info);
      row.appendChild(remove);
      cartUi.body.appendChild(row);
    });

    cartUi.total.textContent = "Total: " + cartTotals().label;
    cartUi.checkout.href = whatsappLink(cartMessage());
    cartUi.foot.hidden = false;
  }

  function cartChanged() {
    saveCart();
    renderCart();
  }

  function openCart(returnTo) {
    cartLastFocused = returnTo || document.activeElement;
    cartUi.root.hidden = false;
    document.body.classList.add("modal-open");
    cartUi.close.focus();
  }

  function closeCart() {
    cartUi.root.hidden = true;
    document.body.classList.remove("modal-open");
    if (cartLastFocused && cartLastFocused.focus) cartLastFocused.focus();
  }

  renderCart();

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

    var formWrap = document.createElement("div");
    formWrap.className = "contact-form-wrap";

    var formLead = document.createElement("p");
    formLead.className = "contact-panel__text";
    formLead.textContent = "Ou deixa seu contato que a gente te chama:";

    var form = document.createElement("form");
    form.className = "contact-form";
    form.innerHTML =
      '<input class="contact-form__field" type="text" name="nome" placeholder="Seu nome" autocomplete="name" required />' +
      '<input class="contact-form__field" type="text" name="contato" placeholder="WhatsApp ou @ do Instagram" autocomplete="tel" required />' +
      '<input class="contact-form__field" type="text" name="interesse" placeholder="Time do coração, bairro ou geração (opcional)" />' +
      '<input class="contact-form__hp" type="text" name="_gotcha" tabindex="-1" autocomplete="off" aria-hidden="true" />' +
      '<button type="submit" class="contact-btn contact-btn--primary contact-form__submit">Enviar</button>' +
      '<p class="contact-form__status" role="status" aria-live="polite"></p>';
    form.addEventListener("submit", handleContactSubmit);

    formWrap.appendChild(formLead);
    formWrap.appendChild(form);

    panel.appendChild(title);
    panel.appendChild(text);
    panel.appendChild(actions);
    panel.appendChild(formWrap);
    gridEl.appendChild(panel);
  }

  /* Envia o formulário de contato pro Formspree/Getform (ver
     CONTACT_FORM_ENDPOINT lá em cima) e mostra o resultado sem sair da
     página. O dado fica salvo e filtrável no painel do serviço. */
  function handleContactSubmit(e) {
    e.preventDefault();
    var form = e.target;
    var statusEl = form.querySelector(".contact-form__status");
    var submitBtn = form.querySelector(".contact-form__submit");

    if (CONTACT_FORM_ENDPOINT.indexOf("SEU_FORM_ID") !== -1) {
      statusEl.textContent =
        "Formulário ainda não conectado — chama a gente pelo WhatsApp por enquanto.";
      statusEl.className = "contact-form__status contact-form__status--error";
      return;
    }

    submitBtn.disabled = true;
    statusEl.textContent = "Enviando...";
    statusEl.className = "contact-form__status";

    fetch(CONTACT_FORM_ENDPOINT, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: new FormData(form),
    })
      .then(function (response) {
        if (!response.ok) throw new Error("resposta ruim do formulário");
        statusEl.textContent = "Recebemos! A gente chama você em breve.";
        statusEl.className = "contact-form__status contact-form__status--ok";
        form.reset();
      })
      .catch(function () {
        statusEl.textContent =
          "Não deu pra enviar agora — chama a gente direto no WhatsApp.";
        statusEl.className = "contact-form__status contact-form__status--error";
      })
      .then(function () {
        submitBtn.disabled = false;
      });
  }

  /* --- Grade de produtos --- */
  function renderGrid(animate) {
    if (activeCategory === CONTACT_CATEGORY) {
      renderContact();
      return;
    }

    var query = normalizeText(searchQuery.trim());
    var visible = products.filter(function (product) {
      var matchesCategory =
        activeCategory === "Todos" || product.category === activeCategory;
      var matchesQuery = !query || normalizeText(product.name).indexOf(query) !== -1;
      return matchesCategory && matchesQuery;
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
      empty.textContent = query
        ? 'Nenhuma camisa encontrada para "' + searchQuery.trim() + '".'
        : "Nenhuma camisa nesta categoria por enquanto.";
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

  /* Resolve o caminho da imagem. No arquivo único (bundle) esta função é
     trocada por uma que devolve a imagem embutida em base64. */
  function imageUrl(product) {
    return product.image || placeholderImage(product);
  }

  /* Card: versão pequena (mobile) + grande via srcset. No bundle, o srcset
     é removido (só a imagem embutida). */
  function setCardImage(img, product) {
    img.src = imageUrl(product);
    if (product.image) {
      img.srcset =
        product.image.replace("fotos/", "fotos/sm/") +
        " 460w, " +
        product.image +
        " 900w";
      img.sizes = "(max-width: 560px) 46vw, (max-width: 960px) 31vw, 260px";
    }
  }

  /* Resolve um caminho de imagem cru (fotos extras da galeria da telinha).
     No arquivo único (bundle) esta função é trocada por uma que devolve a
     imagem embutida em base64 — igual ao que já acontece com imageUrl(). */
  function imageSrc(path) {
    return path || "";
  }

  /* Lista de fotos da telinha de um produto: images[0] é a foto de
     contexto/hero; o resto são stills. A foto clássica (`image`) entra
     como still extra se ainda não estiver na lista. Produto sem `images`
     devolve lista vazia -> a telinha mostra só uma imagem, como hoje. */
  function productGalleryPaths(product) {
    var list = Array.isArray(product.images) ? product.images.slice() : [];
    if (product.image && list.indexOf(product.image) === -1) {
      list.push(product.image);
    }
    return list;
  }

  /* Monta a imagem (e, se houver 2+ fotos, o rail de miniaturas) da
     telinha de um produto. */
  function renderGallery(product) {
    currentGallery = productGalleryPaths(product);
    modal.img.alt = "Camisa " + product.name;

    if (currentGallery.length <= 1) {
      modal.img.src = imageUrl(product);
      modal.thumbs.hidden = true;
      modal.thumbs.innerHTML = "";
      return;
    }

    modal.img.src = imageSrc(currentGallery[0]);
    modal.thumbs.innerHTML = "";
    currentGallery.forEach(function (path, index) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "modal__thumb" + (index === 0 ? " is-active" : "");
      btn.dataset.index = String(index);
      btn.setAttribute(
        "aria-label",
        "Foto " + (index + 1) + " de " + currentGallery.length
      );
      var thumbImg = document.createElement("img");
      thumbImg.src = imageSrc(path);
      thumbImg.alt = "";
      thumbImg.loading = "lazy";
      thumbImg.decoding = "async";
      btn.appendChild(thumbImg);
      modal.thumbs.appendChild(btn);
    });
    modal.thumbs.hidden = false;
  }

  function selectGalleryImage(index) {
    if (!currentGallery.length || index < 0 || index >= currentGallery.length) {
      return;
    }
    modal.img.src = imageSrc(currentGallery[index]);
    modal.thumbs.querySelectorAll(".modal__thumb").forEach(function (btn, i) {
      btn.classList.toggle("is-active", i === index);
    });
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
      price.href = whatsappLink(productMessage(product, null));
      price.target = "_blank";
      price.rel = "noopener";
      price.textContent = "Falar no WhatsApp";
    }

    body.appendChild(category);
    body.appendChild(name);
    body.appendChild(price);

    card.appendChild(media);
    card.appendChild(body);

    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", product.name + " — ver detalhes");
    card.addEventListener("click", function (e) {
      if (e.target.closest("a")) return; // deixa o link interno funcionar
      openProduct(product);
    });
    card.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openProduct(product);
      }
    });

    return card;
  }

  /* Pausa o movimento do fundo quando o hero sai da tela (a gente rolou
     pra ver as camisas) ou quando a aba do navegador não está visível. */
  if (bgEl && !prefersReducedMotion) {
    var heroVisible = true;
    var refreshBgPause = function () {
      bgEl.classList.toggle("is-paused", document.hidden || !heroVisible);
    };
    document.addEventListener("visibilitychange", refreshBgPause);
    if ("IntersectionObserver" in window) {
      var heroEl = document.querySelector(".hero");
      if (heroEl) {
        new IntersectionObserver(function (entries) {
          heroVisible = entries[0].isIntersecting;
          refreshBgPause();
        }).observe(heroEl);
      }
    }
  }

  /* --- Hero como porta de entrada: trava o scroll até "Ver o catálogo" --- */
  var heroEnter = document.querySelector(".hero");
  if (heroEnter && !location.hash) {
    document.documentElement.classList.add("hero-locked");
    document.body.classList.add("hero-locked");
  }

  function enterCatalog(e) {
    if (e) e.preventDefault();
    document.documentElement.classList.remove("hero-locked");
    document.body.classList.remove("hero-locked");
    var target = document.getElementById("catalogo");
    // espera o scroll destravar antes de rolar
    window.requestAnimationFrame(function () {
      if (target && target.scrollIntoView) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.location.hash = "catalogo";
      }
    });
  }

  var enterLinks = document.querySelectorAll('a[href="#catalogo"]');
  enterLinks.forEach(function (a) {
    a.addEventListener("click", enterCatalog);
  });

  /* --- Busca por nome (combina com a categoria ativa) --- */
  if (searchEl) {
    searchEl.addEventListener("input", function () {
      searchQuery = searchEl.value;
      renderGrid(false);
    });
  }

  /* --- Início --- */
  if (!gridEl || !filtersEl) return;
  buildFilters();
  updateBackground();
  renderGrid(true);
})();
