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

  var BRL = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  var WHATSAPP_URL = "https://wa.me/5545991271005";

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

  /* --- Grade de produtos --- */
  function renderGrid(animate) {
    var visible = products.filter(function (product) {
      return activeCategory === "Todos" || product.category === activeCategory;
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

  function createCard(product) {
    var card = document.createElement("article");
    card.className = "card";

    var media = document.createElement("div");
    media.className = "card__media";

    var img = document.createElement("img");
    img.src = product.image || placeholderImage(product);
    img.alt = "Camisa " + product.name;
    img.loading = "lazy";
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

  /* --- Início --- */
  if (!gridEl || !filtersEl) return;
  buildFilters();
  renderGrid(true);
})();
