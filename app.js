const agentImages = {
  "adv-001": "assets/agents/advision.png",
  "lds-002": "assets/agents/leadscout.png",
  "ctf-003": "assets/agents/contentforge.png",
  "fnp-004": "assets/agents/funnelpilot.png"
};

function agentImg(sku){
  return AGENT_IMG[sku] || "assets/agents/placeholder.png";
}
const CART_KEY = "aiz_cart_v1";

function money(n){ return `$${Number(n).toFixed(2)}`; }

function getCart(){
  try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); }
  catch { return []; }
}
function setCart(items){
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  updateCartCount();
}
function updateCartCount(){
  const count = getCart().reduce((a,i)=>a + (i.qty||1), 0);
  document.querySelectorAll(".cartCount").forEach(el => el.textContent = count);
}

function addToCart(item){
  const cart = getCart();
  const idx = cart.findIndex(x => x.sku === item.sku);
  if(idx >= 0) cart[idx].qty += 1;
  else cart.push({ ...item, qty: 1 });
  setCart(cart);
}

function bindAddButtons(){
  document.querySelectorAll(".product [data-cta='add_to_cart']").forEach(btn=>{
    btn.addEventListener("click", (e)=>{
      const card = e.target.closest(".product");
      addToCart({
        sku: card.dataset.sku,
        title: card.dataset.title,
        price: Number(card.dataset.price)
      });
    });
  });
}

function listingSearchFilter(){
  const grid = document.getElementById("grid");
  if(!grid) return;

  const q = document.getElementById("q");
  const sort = document.getElementById("sort");
  let activeFilter = "all";

  const chips = document.querySelectorAll(".chipBtn");
  chips.forEach(c=>{
    c.addEventListener("click", ()=>{
      chips.forEach(x=>x.classList.remove("isActive"));
      c.classList.add("isActive");
      activeFilter = c.dataset.filter;
      run();
    });
  });

  function run(){
    const query = (q?.value || "").trim().toLowerCase();
    const cards = [...grid.querySelectorAll(".product")];

    cards.forEach(card=>{
      const title = (card.dataset.title || "").toLowerCase();
      const tags = (card.dataset.tags || "").toLowerCase();
      const okQuery = !query || title.includes(query);
      const okFilter = activeFilter === "all" || tags.includes(activeFilter);
      card.style.display = (okQuery && okFilter) ? "" : "none";
    });

    const visible = cards.filter(c=>c.style.display !== "none");
    const by = sort?.value || "popular";

    visible.sort((a,b)=>{
      const pa = Number(a.dataset.price), pb = Number(b.dataset.price);
      const ra = Number(a.dataset.rating), rb = Number(b.dataset.rating);
      if(by === "price_asc") return pa - pb;
      if(by === "rated") return rb - ra;
      return Number(b.dataset.reviews) - Number(a.dataset.reviews); // popular proxy
    });

    visible.forEach(c=>grid.appendChild(c));
  }

  q?.addEventListener("input", run);
  sort?.addEventListener("change", run);
  run();
}

function agentDetail(){
  const box = document.getElementById("detailInfo");
  if(!box) return;

  const params = new URLSearchParams(location.search);
  const sku = params.get("sku") || "adv-001";

  // Simple local catalogue map (can be replaced later with JSON/API)
  const map = {
    "adv-001": { title:"AdVision", sub:"Auto runs ads, tests creatives, optimises spend.", price:29.99, rating:"4.99", reviews:"(9,213)", stars:"★★★★★", tags:["Cloud","Next-day deploy"] },
    "lds-002": { title:"LeadScout", sub:"Finds leads, enriches intent, drafts outreach.", price:49.99, rating:"4.77", reviews:"(5,789)", stars:"★★★★☆", tags:["Hybrid","Next-day deploy"] },
    "ctf-003": { title:"ContentForge", sub:"Turns briefs into content people actually read.", price:24.99, rating:"4.71", reviews:"(2,144)", stars:"★★★★☆", tags:["Cloud","Prime AI"] },
    "fnp-004": { title:"FunnelPilot", sub:"Finds drop offs, recommends fixes, predicts lift.", price:34.99, rating:"4.64", reviews:"(1,678)", stars:"★★★★☆", tags:["Cloud","Analytics"] },
  };

  const d = map[sku] || map["adv-001"];

  document.getElementById("agentName").textContent = d.title;
  document.getElementById("detailTitle").textContent = d.title;
  document.getElementById("detailSub").textContent = d.sub;
  document.getElementById("detailPrice").textContent = `From ${money(d.price)} / month`;
  document.getElementById("detailRating").textContent = d.rating;
  document.getElementById("detailReviews").textContent = d.reviews;
  document.getElementById("detailStars").textContent = d.stars;

  const tagsWrap = document.getElementById("detailTags");
  tagsWrap.innerHTML = d.tags.map(t=>`<span class="chip">${t}</span>`).join("");

  box.dataset.sku = sku;
  box.dataset.title = d.title;
  box.dataset.price = String(d.price);

  document.getElementById("addBtn").addEventListener("click", ()=>{
    addToCart({ sku, title:d.title, price:Number(d.price) });
  });
}

function renderCart(){
  const root = document.getElementById("cartItems");
  if(!root) return;

  const empty = document.getElementById("cartEmpty");
  const cart = getCart();

  root.innerHTML = cart.map(item => `
    <div class="cartItem" data-sku="${item.sku}">
      <div class="cartItemLeft">
        <div class="cartThumb"></div>
        <div>
          <div class="cartName">${item.title}</div>
          <div class="cartSku">${item.sku}</div>
        </div>
      </div>

      <div class="cartItemRight">
        <div class="qty">
          <button class="qtyBtn" data-act="dec">−</button>
          <span class="qtyNum">${item.qty}</span>
          <button class="qtyBtn" data-act="inc">+</button>
        </div>
        <div class="cartPrice">${money(item.price * item.qty)}</div>
        <button class="linkBtn" data-act="remove">Remove</button>
      </div>
    </div>
  `).join("");

  empty.style.display = cart.length ? "none" : "block";

  root.querySelectorAll(".cartItem").forEach(row=>{
    row.addEventListener("click", (e)=>{
      const act = e.target?.dataset?.act;
      if(!act) return;

      const sku = row.dataset.sku;
      let items = getCart();
      const idx = items.findIndex(x=>x.sku===sku);
      if(idx < 0) return;

      if(act === "inc") items[idx].qty += 1;
      if(act === "dec") items[idx].qty = Math.max(1, items[idx].qty - 1);
      if(act === "remove") items = items.filter(x=>x.sku!==sku);

      setCart(items);
      renderCart();
      renderSummary();
    });
  });

  renderSummary();
}

function renderSummary(){
  const cart = getCart();
  const subtotal = cart.reduce((a,i)=>a + (i.price*i.qty), 0);
  const tax = subtotal * 0.00; // keep 0 for now
  const total = subtotal + tax;

  const s = document.getElementById("sumSubtotal");
  if(!s) return;

  document.getElementById("sumSubtotal").textContent = money(subtotal);
  document.getElementById("sumTax").textContent = money(tax);
  document.getElementById("sumTotal").textContent = money(total);
}

document.addEventListener("DOMContentLoaded", ()=>{
  updateCartCount();
  bindAddButtons();
  listingSearchFilter();
  agentDetail();
  renderCart();
});
