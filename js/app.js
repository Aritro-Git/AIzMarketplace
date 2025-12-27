/* AIz Marketplace — CALM (vanilla JS)
   - Loads agents from data/agents.json
   - Default category: Marketing (tab pre-selected)
   - Search + sort + quick filters
   - Renders Amazon-style catalogue rows
   - Subtle starfield background
   - Analytics hooks via dataLayer events for GTM
*/

const AIz = (() => {
  const state = {
    agents: [],
    category: "Marketing",
    search: "",
    sort: "popular",
    pillFilters: [], // {type, value}
    cart: new Set()
  };

  function $(sel) { return document.querySelector(sel); }
  function $all(sel) { return Array.from(document.querySelectorAll(sel)); }

  function pushEvent(event, params = {}) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, ...params });
    // dev helper
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
      console.log("[dataLayer]", { event, ...params });
    }
  }

  function formatMoney(amountStr) {
    const n = Number(amountStr);
    if (Number.isFinite(n)) return `$${n.toFixed(2)}`;
    return `$${amountStr}`;
  }

  function matchesPills(agent) {
    for (const f of state.pillFilters) {
      if (f.type === "badge") {
        if (!agent.badges?.some(b => b.toLowerCase() === f.value.toLowerCase())) return false;
      }
      if (f.type === "deployment") {
        if ((agent.deployment || "").toLowerCase() !== f.value.toLowerCase()) return false;
      }
    }
    return true;
  }

  function matchesSearch(agent) {
    if (!state.search) return true;
    const q = state.search.toLowerCase().trim();
    const hay = [
      agent.name, agent.category, agent.tagline,
      ...(agent.bullets || []),
      ...(agent.integrations || [])
    ].join(" ").toLowerCase();
    return hay.includes(q);
  }

  function matchesCategory(agent) {
    if (state.category === "All") return true;
    if (state.category === "More") {
      return !["Marketing","Coding","Business","Data","Ops","Personal"].includes(agent.category);
    }
    return agent.category === state.category;
  }

  function sortAgents(list) {
    const s = state.sort;
    const copy = [...list];

    if (s === "rating") copy.sort((a,b) => (b.rating||0) - (a.rating||0));
    if (s === "price_low") copy.sort((a,b) => Number(a.price_month||0) - Number(b.price_month||0));
    if (s === "price_high") copy.sort((a,b) => Number(b.price_month||0) - Number(a.price_month||0));

    // default "popular": reviews desc
    if (s === "popular") copy.sort((a,b) => (b.reviews||0) - (a.reviews||0));

    return copy;
  }

  function renderMeta(total, shown) {
    const el = $("#resultsMeta");
    if (!el) return;
    el.textContent = `Showing ${shown} of ${total} results for ${state.category} > AI Agents`;
  }

  function updateCartUI() {
    const el = $("#cartCount");
    if (el) el.textContent = String(state.cart.size);
  }

  function renderCatalog() {
    const root = $("#catalog");
    if (!root) return;

    const total = state.agents.length;

    let filtered = state.agents
      .filter(matchesCategory)
      .filter(matchesSearch)
      .filter(matchesPills);

    filtered = sortAgents(filtered);

    renderMeta(total, filtered.length);

    root.innerHTML = filtered.map(agent => {
      const primeBadge = agent.badges?.includes("Prime AI")
        ? `<span class="tag">Prime AI</span>`
        : "";

      // keep only 2 calm meta pills per card
      const pills = [];
      pills.push(`<span class="smallpill">${agent.deployment}</span>`);
      if (agent.badges?.includes("Next-day deployment")) {
        pills.push(`<span class="smallpill accent">Next-day deploy</span>`);
      }
      if (agent.badges?.includes("Prime AI")) {
        pills.push(`<span class="smallpill accent">Prime AI</span>`);
      }

      return `
        <article class="card" data-id="${agent.id}">
          <div class="visual">
            ${primeBadge}
            <img src="${agent.visual}" alt="${agent.name} visual" loading="lazy" />
          </div>

          <div class="info">
            <h3>${agent.name}</h3>
            <div class="tagline">${agent.tagline}</div>

            <div class="rating">
              <span class="stars">★★★★★</span>
              <span>${agent.rating?.toFixed(2)} (${agent.reviews?.toLocaleString()})</span>
            </div>

            <p class="price">From <strong>${formatMoney(agent.price_month)}</strong> <span>/ month</span></p>

            <div class="badgerow">
              ${pills.slice(0,2).join("")}
            </div>
          </div>

          <div class="ctaCol">
            <a class="btn primary" href="agent.html?id=${agent.id}" data-action="view">View Agent →</a>
            <button class="btn" data-action="cart">Add to cart</button>
          </div>
        </article>
      `;
    }).join("");

    // analytics
    pushEvent("catalog_render", {
      category: state.category,
      query: state.search,
      sort: state.sort,
      results: filtered.length
    });

    // bind actions
    root.querySelectorAll(".card").forEach(card => {
      const id = card.getAttribute("data-id");
      const view = card.querySelector('[data-action="view"]');
      const cart = card.querySelector('[data-action="cart"]');

      view?.addEventListener("click", () => {
        pushEvent("agent_view_click", { agent_id: id, category: state.category });
      });

      cart?.addEventListener("click", () => {
        state.cart.add(id);
        updateCartUI();
        pushEvent("add_to_cart", { agent_id: id, category: state.category });
      });
    });
  }

  async function loadAgents() {
    const res = await fetch("data/agents.json", { cache: "no-cache" });
    state.agents = await res.json();
  }

  function bindHomeUI() {
    const searchInput = $("#searchInput");
    const searchGo = $("#searchGo");
    const sortSelect = $("#sortSelect");

    // Tabs
    const tabs = $all(".tab");
    tabs.forEach(t => {
      const c = t.getAttribute("data-category");
      if (c === state.category) t.classList.add("active");
      else t.classList.remove("active");

      t.addEventListener("click", () => {
        tabs.forEach(x => x.classList.remove("active"));
        t.classList.add("active");
        state.category = c;
        pushEvent("category_selected", { category: c });
        renderCatalog();
      });
    });

    // Quick filters
    const pills = $all(".pill");
    pills.forEach(p => {
      p.addEventListener("click", () => {
        const raw = p.getAttribute("data-filter") || "";
        const [type, ...rest] = raw.split(":");
        const value = rest.join(":");
        const key = `${type}:${value}`.toLowerCase();

        const exists = state.pillFilters.find(f => `${f.type}:${f.value}`.toLowerCase() === key);

        if (exists) {
          state.pillFilters = state.pillFilters.filter(f => `${f.type}:${f.value}`.toLowerCase() !== key);
          p.classList.remove("active");
        } else {
          state.pillFilters.push({ type, value });
          p.classList.add("active");
        }

        pushEvent("quick_filter_toggle", { filter: raw, active: !exists });
        renderCatalog();
      });
    });

    // Search
    const doSearch = () => {
      state.search = (searchInput?.value || "").trim();
      pushEvent("search_used", { search_term: state.search, category: state.category });
      renderCatalog();
    };

    searchGo?.addEventListener("click", doSearch);
    searchInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doSearch();
    });

    // Sort
    sortSelect?.addEventListener("change", () => {
      state.sort = sortSelect.value;
      pushEvent("sort_changed", { sort: state.sort });
      renderCatalog();
    });

    $("#buildBtn")?.addEventListener("click", () => pushEvent("cta_click", { cta: "build_your_own" }));
    $("#exploreBtn")?.addEventListener("click", () => pushEvent("cta_click", { cta: "explore_playground" }));
  }

  function initStars() {
    const canvas = document.getElementById("stars");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let w, h, stars;

    function resize() {
      w = canvas.width = Math.floor(window.innerWidth * DPR);
      h = canvas.height = Math.floor(window.innerHeight * DPR);
      canvas.style.width = "100%";
      canvas.style.height = "100%";

      // CALM: fewer stars
      const count = Math.floor((w * h) / 260000);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: (Math.random() * 1.3 + 0.2) * DPR,
        a: Math.random() * 0.45 + 0.10,
        v: (Math.random() * 0.12 + 0.03) * DPR
      }));
    }

    function tick() {
      ctx.clearRect(0, 0, w, h);

      // CALM: subtle nebula wash
      const grad = ctx.createRadialGradient(w * 0.70, h * 0.20, 0, w * 0.70, h * 0.20, Math.max(w, h) * 0.7);
      grad.addColorStop(0, "rgba(124,92,255,0.07)");
      grad.addColorStop(0.65, "rgba(124,92,255,0.02)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      for (const s of stars) {
        s.y += s.v;
        if (s.y > h) { s.y = -10; s.x = Math.random() * w; }

        ctx.beginPath();
        ctx.fillStyle = `rgba(230,237,247,${s.a})`;
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      requestAnimationFrame(tick);
    }

    resize();
    window.addEventListener("resize", resize);
    tick();
  }

  async function initHomePage() {
    initStars();
    await loadAgents();
    bindHomeUI();
    updateCartUI();
    renderCatalog();
    pushEvent("page_view_custom", { page: "marketplace" });
  }

  // auto-init only on Home
  document.addEventListener("DOMContentLoaded", () => {
    if (document.querySelector("#catalog")) initHomePage();
  });

  return {};
})();