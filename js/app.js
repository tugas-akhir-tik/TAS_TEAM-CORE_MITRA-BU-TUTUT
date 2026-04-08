// Simple mobile web app for Mitra Kantin Bu Tutut
// Loads data from data/*.json and implements navigation, filtering, cart

const DATA_PATH = './data';
let products = [];
let categories = [];
let mitra = [];
let cart = [];

// DOM
const views = document.querySelectorAll('.view');
const navBtns = document.querySelectorAll('.nav-btn');
const productListEl = document.getElementById('productList');
const categoriesEl = document.getElementById('categories');
const searchInput = document.getElementById('searchInput');
const detailView = document.getElementById('detailView');
const detailContent = document.getElementById('detailContent');
const backToHome = document.getElementById('backToHome');
const cartListEl = document.getElementById('cartList');
const cartTotalEl = document.getElementById('cartTotal');
const cartCountEl = document.getElementById('cartCount');
const checkoutBtn = document.getElementById('checkoutBtn');
const openCategoriesBtn = document.getElementById('openCategories');

function setActiveView(id){
  views.forEach(v=>v.classList.toggle('active', v.id===id));
  navBtns.forEach(b=>b.classList.toggle('active', b.dataset.view===id));
}

navBtns.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    setActiveView(btn.dataset.view);
  });
});

openCategoriesBtn.addEventListener('click', ()=>{
  // scroll to categories section in home
  setActiveView('homeView');
  setTimeout(()=>{
    categoriesEl.scrollIntoView({behavior:'smooth',inline:'center'});
  },100);
});

backToHome.addEventListener('click', ()=>{
  setActiveView('homeView');
});

searchInput.addEventListener('input', ()=>{
  renderProducts();
});

function formatRupiah(n){
  return 'Rp '+n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function loadJSON(path){
  return fetch(path).then(r=>r.json());
}

async function loadData(){
  try{
    products = await loadJSON(DATA_PATH + '/Tabel_produk_rows.json');
    categories = await loadJSON(DATA_PATH + '/Produk_Category_rows.json');
    mitra = await loadJSON(DATA_PATH + '/Tabel_mitra_rows.json');
  }catch(e){
    console.error('Gagal load data', e);
  }
  renderCategories();
  renderProducts();
}

function renderCategories(){
  categoriesEl.innerHTML = '';
  // add "All" category
  const all = document.createElement('div');
  all.className = 'category active';
  all.textContent = 'Semua';
  all.dataset.cat = '';
  all.addEventListener('click', ()=>{
    document.querySelectorAll('.category').forEach(c=>c.classList.remove('active'));
    all.classList.add('active');
    renderProducts();
  });
  categoriesEl.appendChild(all);

  categories.forEach(cat=>{
    const d = document.createElement('div');
    d.className = 'category';
    d.textContent = cat.name || cat.nama || cat.product_category || 'Kategori';
    d.dataset.cat = cat.id || cat.ID || cat.id_produk_category || d.textContent;
    d.addEventListener('click', ()=>{
      document.querySelectorAll('.category').forEach(c=>c.classList.remove('active'));
      d.classList.add('active');
      renderProducts();
    });
    categoriesEl.appendChild(d);
  });
}

function getActiveCategory(){
  const el = document.querySelector('.category.active');
  return el?el.dataset.cat:'';
}

function renderProducts(){
  const q = searchInput.value.trim().toLowerCase();
  const activeCat = getActiveCategory();
  productListEl.innerHTML = '';
  let list = products.slice();
  if(activeCat){
    list = list.filter(p=>{
      return (p.category_id && p.category_id.toString()===activeCat.toString()) || (p.category && p.category.toString()===activeCat.toString()) || (p.product_category && p.product_category.toString()===activeCat.toString())
    });
  }
  if(q){
    list = list.filter(p=> (p.nama||p.name||p.product_name||'').toLowerCase().includes(q) || (p.deskripsi||p.description||'').toLowerCase().includes(q));
  }

  list.forEach(p=>{
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img src="${p.image || p.gambar || 'https://via.placeholder.com/300'}" alt="${p.nama||p.name||''}" />
      <div class="title">${p.nama||p.name||p.product_name||'Produk'}</div>
      <div class="price">${formatRupiah(Number(p.harga||p.price||p.price_sell||0))}</div>
    `;
    card.addEventListener('click', ()=>openDetail(p));
    productListEl.appendChild(card);
  });
}

function openDetail(p){
  setActiveView('detailView');
  detailContent.innerHTML = `
    <div class="detail-content">
      <img src="${p.image || p.gambar || 'https://via.placeholder.com/500'}" alt="" style="width:100%;border-radius:8px;max-height:300px;object-fit:cover" />
      <h3>${p.nama||p.name||p.product_name||'Produk'}</h3>
      <div class="price">${formatRupiah(Number(p.harga||p.price||0))}</div>
      <p>${p.deskripsi||p.description||'Tidak ada deskripsi.'}</p>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button id="addToCartBtn" class="btn primary">Tambah ke Keranjang</button>
        <button id="backBtn" class="btn">Tutup</button>
      </div>
    </div>
  `;

  document.getElementById('addToCartBtn').addEventListener('click', ()=>{
    addToCart(p);
  });
  document.getElementById('backBtn').addEventListener('click', ()=>{
    setActiveView('homeView');
  });
}

function addToCart(p){
  const existing = cart.find(c=>c.id===p.id || c.id_produk===p.id_produk || c.nama===p.nama);
  if(existing){
    existing.qty = (existing.qty||1) + 1;
  }else{
    cart.push({
      id: p.id || p.id_produk || (new Date()).getTime(),
      nama: p.nama||p.name||p.product_name||'Produk',
      price: Number(p.harga||p.price||0),
      qty: 1,
      image: p.image || p.gambar || 'https://via.placeholder.com/200'
    });
  }
  saveCart();
  renderCart();
  alert('Ditambahkan ke keranjang');
}

function renderCart(){
  cartListEl.innerHTML = '';
  let total = 0;
  if(cart.length===0){
    cartListEl.innerHTML = '<div>Keranjang kosong</div>';
  }
  cart.forEach(item=>{
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <img src="${item.image}" />
      <div style="flex:1">
        <div>${item.nama}</div>
        <div>${formatRupiah(item.price)} x ${item.qty}</div>
      </div>
      <div>
        <button class="btn" data-id="${item.id}" data-action="minus">-</button>
        <button class="btn" data-id="${item.id}" data-action="plus">+</button>
      </div>
    `;
    cartListEl.appendChild(div);
    total += item.price * item.qty;
  });
  cartTotalEl.textContent = formatRupiah(total);
  cartCountEl.textContent = cart.reduce((s,i)=>s+i.qty,0);

  cartListEl.querySelectorAll('button').forEach(b=>{
    b.addEventListener('click', ()=>{
      const id = b.dataset.id;
      const action = b.dataset.action;
      const it = cart.find(x=>x.id.toString()===id.toString());
      if(!it) return;
      if(action==='plus') it.qty++;
      if(action==='minus') it.qty = Math.max(0, it.qty-1);
      cart = cart.filter(x=>x.qty>0);
      saveCart();
      renderCart();
    });
  });
}

function saveCart(){
  localStorage.setItem('mt_cart', JSON.stringify(cart));
}
function loadCart(){
  try{cart = JSON.parse(localStorage.getItem('mt_cart'))||[]}catch(e){cart=[]}
  renderCart();
}

checkoutBtn.addEventListener('click', ()=>{
  if(cart.length===0){alert('Keranjang kosong');return}
  // simple checkout mock
  const order = {id: 'ORD'+Date.now(), items: cart.slice(), total: cart.reduce((s,i)=>s+i.price*i.qty,0), date: new Date().toISOString()};
  // store orders in localStorage
  const orders = JSON.parse(localStorage.getItem('mt_orders')||'[]');
  orders.unshift(order);
  localStorage.setItem('mt_orders', JSON.stringify(orders));
  cart = [];
  saveCart();
  renderCart();
  alert('Checkout berhasil. Terima kasih!');
  // update profile orders list
  renderOrders();
  setActiveView('profileView');
});

function renderOrders(){
  const orders = JSON.parse(localStorage.getItem('mt_orders')||'[]');
  const el = document.getElementById('ordersList');
  if(!orders || orders.length===0){el.innerHTML = 'Belum ada pesanan.';return}
  el.innerHTML = orders.map(o=>`<div style="background:#fff;padding:8px;border-radius:8px;margin-bottom:8px"><b>${o.id}</b><div>${new Date(o.date).toLocaleString()}</div><div>Total: ${formatRupiah(o.total)}</div></div>`).join('');
}

// init
loadCart();
loadData();
renderOrders();

// expose for debug
window.app = {products,categories,mitra,cart,addToCart,renderProducts};
