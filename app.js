/* =====================================================================
   ELECTRIC EVENTS AZ  —  app.js
   ---------------------------------------------------------------------
   ▶ TO UPDATE THE WEEKLY CALENDAR: edit CONFIG.schedule below.
   ▶ TO GO LIVE WITH MERCH CHECKOUT: set CONFIG.checkout.mode = 'stripe'
     and paste each product's Stripe Payment Link into stripeLink.
   ▶ Accounts + newsletter are stored locally (prototype). Wire to a real
     backend / email provider before launch — see notes by each handler.
   ===================================================================== */

const CONFIG = {
  social: {
    instagram: "https://www.instagram.com/electriceventsaz",
    tiktok: "https://www.tiktok.com/@electriceventsaz",
  },

  /* --- WEEKLY SCHEDULE ---------------------------------------------
     One entry per weekday (0=Sun … 6=Sat). status:'on' shows the venue,
     status:'off' shows a rest night. mapsQuery feeds Google Maps
     directions (no street address is invented — confirm + add later).   */
  schedule: [
    { day:0, status:"on",  venue:"Bullshooters",  area:"Phoenix, AZ", time:"6:00 PM – Midnight", tag:"Sunday Funday", mapsQuery:"Bullshooters Sports Grill Phoenix AZ", note:"Our Sunday residency — easy vibes, big floor." },
    { day:1, status:"off" },
    { day:2, status:"on",  venue:"Bullshooters",  area:"Phoenix, AZ", time:"7:00 PM – Midnight", tag:"Tuesday Night", mapsQuery:"Bullshooters Sports Grill Phoenix AZ", note:"Mid-week reset. Come dance it out." },
    { day:3, status:"off" },
    { day:4, status:"off" },
    { day:5, status:"off" },
    { day:6, status:"off" },
  ],

  /* --- MERCH --------------------------------------------------------
     img:null renders the neon bolt as artwork. Replace with real photo
     paths (e.g. "assets/sometimes.jpg") as they come in.
     placeholder:true flags sample products to swap before launch.       */
  products: [
    { id:"sometimes", name:"Sometimes", price:20, stock:"Low stock", img:"assets/sometimes.jpg", placeholder:false },
    { id:"the-44",    name:"The 44",    price:10, stock:"",           img:null, placeholder:false },
  ],

  checkout: {
    mode: "demo",          // "demo" or "stripe"
    stripeLink: {          // productId -> Stripe Payment Link (used in 'stripe' mode)
      // sometimes: "https://buy.stripe.com/xxxx",
    },
  },
};

/* ======================= helpers ======================= */
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const DOW   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const DOW_S = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MON_S = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const money = n => "$" + n.toFixed(2);
const mapsUrl = q => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);
const boltImg = 'assets/bolt.png?v=3';

function toast(msg){
  const t = $("#toast");
  t.textContent = msg; t.hidden = false;
  requestAnimationFrame(()=> t.classList.add("show"));
  clearTimeout(toast._t);
  toast._t = setTimeout(()=>{ t.classList.remove("show"); setTimeout(()=>t.hidden=true,300); }, 2600);
}

/* week dates: Sunday..Saturday of the current week */
function weekDates(){
  const now = new Date();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay());
  sunday.setHours(0,0,0,0);
  return [...Array(7)].map((_,i)=>{ const d=new Date(sunday); d.setDate(sunday.getDate()+i); return d; });
}

/* Google Calendar add-link for an event day */
function gcalLink(ev, date){
  const d = new Date(date);
  const ymd = d.getFullYear()*10000 + (d.getMonth()+1)*100 + d.getDate();
  const pad = n => String(n).padStart(2,'0');
  const base = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
  // generic 6pm-midnight window for the add-to-cal link
  const dates = `${base}T180000/${base}T235900`;
  const text = encodeURIComponent(`Electric Events AZ @ ${ev.venue}`);
  const details = encodeURIComponent(`${ev.tag||''} — ${ev.time}. ${ev.note||''}`);
  const loc = encodeURIComponent(`${ev.venue}, ${ev.area}`);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&location=${loc}`;
}

/* ======================= CALENDAR ======================= */
function renderWeek(){
  const dates = weekDates();
  const today = new Date(); today.setHours(0,0,0,0);
  const todayIdx = today.getDay();
  const grid = $("#weekGrid");
  grid.innerHTML = "";

  dates.forEach((date, i) => {
    const ev = CONFIG.schedule[i];
    const isToday = date.getTime() === today.getTime();
    const on = ev.status === "on";
    const card = document.createElement("div");
    card.className = "day" + (isToday?" today":"") + (on?"":" is-off");
    card.dataset.idx = i;
    card.innerHTML = `
      <div class="dow">${DOW_S[i]}${isToday?' • Today':''}</div>
      <div class="date">${MON_S[date.getMonth()]} ${date.getDate()}</div>
      ${ on ? `
        <img class="mini-bolt" src="${boltImg}" alt="">
        <div class="venue">${ev.venue}</div>
        <div class="vtime">${ev.time}</div>
        <div class="vtag">${ev.tag||''}</div>
      ` : `
        <div class="off-label">No public set</div>
        <div class="vtag" style="margin-top:auto;color:var(--muted)">Rest night</div>
      `}`;
    card.addEventListener("click", ()=> openDay(i, date));
    grid.appendChild(card);
  });

  renderNowCard(dates, todayIdx);
}

function renderNowCard(dates, todayIdx){
  const card = $("#nowCard");
  // find today if 'on', else the next 'on' day within the week, else wrap to earliest
  let idx = -1, label = "";
  if (CONFIG.schedule[todayIdx].status === "on"){ idx = todayIdx; label = "Tonight"; }
  else {
    for(let k=1;k<=7;k++){ const j=(todayIdx+k)%7; if(CONFIG.schedule[j].status==="on"){ idx=j; label = k===1?"Tomorrow":`This ${DOW[j]}`; break; } }
  }
  if (idx === -1){ card.style.display="none"; return; }
  const ev = CONFIG.schedule[idx];
  const date = dates[idx];
  card.className = "now-card";
  card.innerHTML = `
    <div class="now-label">⚡ ${label} — ${DOW[idx]}, ${MON_S[date.getMonth()]} ${date.getDate()}</div>
    <div class="now-venue">${ev.venue}</div>
    <div class="now-meta">
      <span>🕒 ${ev.time}</span><span>📍 ${ev.area}</span>${ev.tag?`<span>✨ ${ev.tag}</span>`:''}
    </div>
    <div class="now-cta">
      <a class="btn btn-pink" href="${mapsUrl(ev.mapsQuery)}" target="_blank" rel="noopener">Get Directions</a>
      <a class="btn btn-ghost" href="${gcalLink(ev,date)}" target="_blank" rel="noopener">Add to Calendar</a>
    </div>`;

  // hero chip
  const chip = $("#tonightChip");
  $("#tonightChipText").textContent = `${label}: ${ev.venue} · ${ev.time}`;
  chip.hidden = false;
}

let openIdx = null;
function openDay(i, date){
  const ev = CONFIG.schedule[i];
  // remove any existing detail
  const existing = $(".day-detail");
  if (existing) existing.remove();
  if (openIdx === i){ openIdx = null; return; }
  openIdx = i;
  if (ev.status !== "on"){
    insertDetail(i, `
      <h4>${DOW[i]} — Rest night</h4>
      <p style="color:var(--muted)">No public set this day. Want Electric Events at your venue or party?
      <a href="#follow" style="color:var(--pink)">Book us →</a></p>`);
    return;
  }
  insertDetail(i, `
    <h4>${DOW[i]} · ${ev.venue}</h4>
    <div class="dd-meta"><span>🕒 ${ev.time}</span><span>📍 ${ev.area}</span>${ev.tag?`<span>✨ ${ev.tag}</span>`:''}</div>
    ${ev.note?`<p style="color:var(--muted);margin-bottom:1rem">${ev.note}</p>`:''}
    <div class="dd-cta">
      <a class="btn btn-pink btn-sm" href="${mapsUrl(ev.mapsQuery)}" target="_blank" rel="noopener">Get Directions</a>
      <a class="btn btn-ghost btn-sm" href="${gcalLink(ev,date)}" target="_blank" rel="noopener">Add to Calendar</a>
    </div>`);
}
function insertDetail(i, html){
  const grid = $("#weekGrid");
  const detail = document.createElement("div");
  detail.className = "day-detail open";
  detail.innerHTML = html;
  // insert after the end of the row containing card i (7-col grid -> after index)
  const cards = $$(".day", grid);
  const cols = window.innerWidth <= 480 ? 2 : (window.innerWidth <= 860 ? 2 : 7);
  const rowEnd = Math.min((Math.floor(i/cols)+1)*cols - 1, cards.length-1);
  cards[rowEnd].after(detail);
  detail.scrollIntoView({behavior:"smooth", block:"center"});
}

/* ======================= MERCH ======================= */
function renderMerch(){
  const grid = $("#merchGrid");
  grid.innerHTML = "";
  CONFIG.products.forEach(p=>{
    const el = document.createElement("div");
    el.className = "product";
    el.innerHTML = `
      <div class="product-img${p.img?' has-photo':''}">
        <img src="${p.img||boltImg}" alt="${p.name}">
        ${p.placeholder?'<span class="ph-tag">Sample</span>':''}
      </div>
      <div class="product-body">
        <div class="product-name">${p.name}</div>
        <div class="product-price">${money(p.price)}</div>
        <div class="product-stock">${p.stock||''}</div>
        <button class="btn btn-pink btn-sm" data-add="${p.id}">Add to Cart</button>
      </div>`;
    grid.appendChild(el);
  });
  $$("[data-add]", grid).forEach(b=> b.addEventListener("click", ()=> addToCart(b.dataset.add)));
}

/* ======================= CART ======================= */
let cart = JSON.parse(localStorage.getItem("eeaz_cart") || "[]");
const saveCart = () => localStorage.setItem("eeaz_cart", JSON.stringify(cart));

function addToCart(id){
  const p = CONFIG.products.find(x=>x.id===id); if(!p) return;
  const line = cart.find(x=>x.id===id);
  if(line) line.qty++; else cart.push({id, qty:1});
  saveCart(); renderCart(); toast(`Added ${p.name} ⚡`);
  openCart();
}
function changeQty(id, d){
  const line = cart.find(x=>x.id===id); if(!line) return;
  line.qty += d;
  if(line.qty<=0) cart = cart.filter(x=>x.id!==id);
  saveCart(); renderCart();
}
function removeLine(id){ cart = cart.filter(x=>x.id!==id); saveCart(); renderCart(); }

function cartTotal(){ return cart.reduce((s,l)=>{ const p=CONFIG.products.find(x=>x.id===l.id); return s + (p?p.price*l.qty:0); },0); }

function renderCart(){
  const count = cart.reduce((s,l)=>s+l.qty,0);
  const badge = $("#cartCount");
  badge.textContent = count; badge.hidden = count===0;
  const body = $("#cartItems");
  if(!cart.length){ body.innerHTML = `<p class="cart-empty">Your cart's empty.<br>Go grab the bolt ⚡</p>`; }
  else {
    body.innerHTML = cart.map(l=>{
      const p = CONFIG.products.find(x=>x.id===l.id); if(!p) return "";
      return `<div class="cart-item">
        <div class="ci-img"><img src="${p.img||boltImg}" alt=""></div>
        <div class="ci-info">
          <div class="ci-name">${p.name}</div>
          <div class="ci-price">${money(p.price)}</div>
          <div class="qty">
            <button data-dec="${p.id}">−</button><span>${l.qty}</span><button data-inc="${p.id}">+</button>
          </div>
        </div>
        <button class="ci-remove" data-rm="${p.id}">remove</button>
      </div>`;
    }).join("");
    $$("[data-inc]",body).forEach(b=>b.onclick=()=>changeQty(b.dataset.inc,1));
    $$("[data-dec]",body).forEach(b=>b.onclick=()=>changeQty(b.dataset.dec,-1));
    $$("[data-rm]",body).forEach(b=>b.onclick=()=>removeLine(b.dataset.rm));
  }
  $("#cartSubtotal").textContent = money(cartTotal());
  $("#checkoutNote").textContent = CONFIG.checkout.mode==="stripe"
    ? "Secure checkout via Stripe."
    : "Demo mode — connect Stripe Payment Links to take live orders.";
}

function openCart(){ $("#cartDrawer").classList.add("open"); $("#cartDrawer").setAttribute("aria-hidden","false"); showOverlay(); }
function closeCart(){ $("#cartDrawer").classList.remove("open"); $("#cartDrawer").setAttribute("aria-hidden","true"); hideOverlay(); }

function checkout(){
  if(!cart.length){ toast("Cart's empty ⚡"); return; }
  if(CONFIG.checkout.mode==="stripe"){
    // single-item Payment Link demo; for multi-item use a Stripe Checkout Session backend.
    const first = cart[0];
    const link = CONFIG.checkout.stripeLink[first.id];
    if(link){ window.open(link, "_blank"); return; }
    toast("Add Stripe links in CONFIG to go live");
    return;
  }
  // demo: record a local order + clear
  const orders = JSON.parse(localStorage.getItem("eeaz_orders")||"[]");
  orders.unshift({ date:new Date().toLocaleDateString(), total:cartTotal(),
    items:cart.map(l=>{const p=CONFIG.products.find(x=>x.id===l.id);return `${l.qty}× ${p?p.name:l.id}`;}) });
  localStorage.setItem("eeaz_orders", JSON.stringify(orders));
  cart = []; saveCart(); renderCart();
  closeCart();
  toast("Order placed (demo) ⚡ — wire Stripe to go live");
}

/* ======================= ACCOUNTS (prototype) =======================
   Stored in localStorage so the flow is fully clickable. Before launch,
   replace getUser/login/signup with a real auth backend (no real password
   security here).                                                        */
const getUser   = () => JSON.parse(localStorage.getItem("eeaz_user")||"null");
const setUser   = u  => localStorage.setItem("eeaz_user", JSON.stringify(u));
const clearUser = () => localStorage.removeItem("eeaz_user");

function openAccount(){ renderAccount(); $("#accountModal").classList.add("open"); $("#accountModal").setAttribute("aria-hidden","false"); }
function closeAccount(){ $("#accountModal").classList.remove("open"); $("#accountModal").setAttribute("aria-hidden","true"); }

function renderAccount(mode){
  const view = $("#accountView");
  const user = getUser();
  if(user){
    const orders = JSON.parse(localStorage.getItem("eeaz_orders")||"[]");
    view.innerHTML = `
      <h3>Hey, ${user.name.split(" ")[0]} ⚡</h3>
      <p class="sub">You're signed in.</p>
      <div class="acct-row"><span>Name</span><strong>${user.name}</strong></div>
      <div class="acct-row"><span>Email</span><strong>${user.email}</strong></div>
      <div class="order-hist">
        <h4>Order history</h4>
        ${orders.length? orders.map(o=>`<div class="acct-row"><span>${o.date} · ${o.items.join(", ")}</span><strong>${money(o.total)}</strong></div>`).join("")
          : '<p style="color:var(--muted);font-size:.9rem">No orders yet.</p>'}
      </div>
      <button class="btn btn-ghost btn-block" id="logoutBtn" style="margin-top:1.2rem">Log out</button>`;
    $("#logoutBtn").onclick = ()=>{ clearUser(); renderAccount(); toast("Logged out"); };
    return;
  }
  if(mode==="signup"){
    view.innerHTML = `
      <h3>Join the Crew</h3>
      <p class="sub">Save your info + track merch orders.</p>
      <div class="field"><label>Name</label><input id="suName" placeholder="Your name"></div>
      <div class="field"><label>Email</label><input id="suEmail" type="email" placeholder="you@email.com"></div>
      <div class="field"><label>Password</label><input id="suPass" type="password" placeholder="••••••••"></div>
      <button class="btn btn-pink btn-block" id="suBtn">Create account</button>
      <p class="modal-switch">Already with us? <a id="toLogin">Log in</a></p>`;
    $("#suBtn").onclick = ()=>{
      const name=$("#suName").value.trim(), email=$("#suEmail").value.trim();
      if(!name||!email){ toast("Name + email please"); return; }
      setUser({name,email}); renderAccount(); toast("Welcome to the crew ⚡");
    };
    $("#toLogin").onclick = ()=>renderAccount("login");
    return;
  }
  // login (default)
  view.innerHTML = `
    <h3>Welcome Back</h3>
    <p class="sub">Sign in to your Electric Events account.</p>
    <div class="field"><label>Email</label><input id="liEmail" type="email" placeholder="you@email.com"></div>
    <div class="field"><label>Password</label><input id="liPass" type="password" placeholder="••••••••"></div>
    <button class="btn btn-pink btn-block" id="liBtn">Log in</button>
    <p class="modal-switch">New here? <a id="toSignup">Create an account</a></p>`;
  $("#liBtn").onclick = ()=>{
    const email=$("#liEmail").value.trim();
    if(!email){ toast("Enter your email"); return; }
    const name = email.split("@")[0].replace(/[^a-z]/gi," ").trim() || "Friend";
    setUser({name:name.charAt(0).toUpperCase()+name.slice(1), email});
    renderAccount(); toast("Signed in ⚡");
  };
  $("#toSignup").onclick = ()=>renderAccount("signup");
}

/* ======================= overlay / drawers ======================= */
function showOverlay(){ $("#overlay").hidden=false; }
function hideOverlay(){ $("#overlay").hidden=true; }

/* ======================= reveal on scroll ======================= */
function initReveal(){
  const io = new IntersectionObserver(es=>{
    es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target);} });
  }, {threshold:.12});
  $$(".reveal").forEach(el=>io.observe(el));
}

/* ======================= hero equalizer ======================= */
function initEq(){
  const eq = $("#eq"); if(!eq) return;
  const n = Math.min(40, Math.floor(window.innerWidth/26));
  for(let i=0;i<n;i++){ const s=document.createElement("span"); s.style.animationDelay = (Math.sin(i)*0.5 + i*0.05).toFixed(2)+"s"; s.style.animationDuration=(0.7+ (i%5)*0.12).toFixed(2)+"s"; eq.appendChild(s); }
}

/* ======================= boot ======================= */
document.addEventListener("DOMContentLoaded", ()=>{
  $("#year").textContent = new Date().getFullYear();
  renderWeek();
  renderMerch();
  renderCart();
  initReveal();
  initEq();

  // nav scroll state + mobile toggle
  const nav = $("#nav");
  addEventListener("scroll", ()=> nav.classList.toggle("scrolled", scrollY>30));
  $("#navToggle").onclick = ()=> $("#navLinks").classList.toggle("open");
  $$("#navLinks a").forEach(a=>a.onclick=()=>$("#navLinks").classList.remove("open"));

  // cart
  $("#cartBtn").onclick = openCart;
  $("#cartClose").onclick = closeCart;
  $("#checkoutBtn").onclick = checkout;

  // account
  $("#accountBtn").onclick = openAccount;
  $("#accountClose").onclick = closeAccount;

  // overlay closes whatever's open
  $("#overlay").onclick = ()=>{ closeCart(); };
  $("#accountModal").onclick = e=>{ if(e.target.id==="accountModal") closeAccount(); };
  addEventListener("keydown", e=>{ if(e.key==="Escape"){ closeCart(); closeAccount(); } });

  // newsletter
  $("#newsletterForm").onsubmit = e=>{
    e.preventDefault();
    const email = $("#newsEmail").value.trim(); if(!email) return;
    const list = JSON.parse(localStorage.getItem("eeaz_news")||"[]");
    if(!list.includes(email)) list.push(email);
    localStorage.setItem("eeaz_news", JSON.stringify(list));   // TODO: POST to email provider
    $("#newsEmail").value=""; toast("You're on the list ⚡");
  };

  // re-render calendar at midnight-ish / on resize for column math
  let rt; addEventListener("resize", ()=>{ clearTimeout(rt); rt=setTimeout(()=>{ if(openIdx!==null){ const d=weekDates()[openIdx]; const cur=openIdx; openIdx=null; openDay(cur,d);} }, 200); });
});
