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
const categoryPageCategoriesEl = document.getElementById('categoriesPage');
const categoryProductListEl = document.getElementById('categoryProductList');
const categoryProductsTitle = document.getElementById('categoryProductsTitle');
const searchInput = document.getElementById('searchInput');
const detailView = document.getElementById('detailView');
const detailContent = document.getElementById('detailContent');
const backToHome = document.getElementById('backToHome');
const cartListEl = document.getElementById('cartList');
const cartTotalEl = document.getElementById('cartTotal');
const cartCountEl = document.getElementById('cartCount');
const checkoutBtn = document.getElementById('checkoutBtn');
const openCategoriesBtn = document.getElementById('openCategories');

// Mitra views
const mitraListEl = document.getElementById('mitraList');
const mitraDetailContent = document.getElementById('mitraDetailContent');
const openMitraBtn = document.getElementById('openMitra');
const backToMitra = document.getElementById('backToMitra');

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
  setActiveView('categoryView');
  const firstCategory = categories[0];
  const activeCat = getActiveCategory();
  if(!activeCat && firstCategory){
    setActiveCategory(String(firstCategory.id||firstCategory.category_id||firstCategory.id_category||firstCategory.name||firstCategory.nama||firstCategory.kategori||firstCategory.title));
  } else {
    renderCategoryProducts();
  }
  setTimeout(()=>{
    categoryPageCategoriesEl.scrollIntoView({behavior:'smooth',inline:'center'});
  },100);
});

backToHome.addEventListener('click', ()=>{
  setActiveView('homeView');
});

searchInput.addEventListener('input', ()=>{
  renderProducts();
  renderCategoryProducts();
});

function formatRupiah(n){
  n = Number(n) || 0;
  return 'Rp '+n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function loadJSON(path){
  return fetch(path).then(r=>r.json());
}

function normalizeData(x){
  if(!x) return [];
  if(Array.isArray(x)) return x;
  if(x.data && Array.isArray(x.data)) return x.data;
  if(x.rows && Array.isArray(x.rows)) return x.rows;
  if(x.items && Array.isArray(x.items)) return x.items;
  if(x.result && Array.isArray(x.result)) return x.result;
  // sometimes Supabase returns { body: [...]} or similar
  for(const k of Object.keys(x)){
    if(Array.isArray(x[k])) return x[k];
  }
  return [];
}

function getActiveCategory(){
  const active = document.querySelector('.category.active');
  return active ? active.dataset.cat : null;
}

function setActiveCategory(catId){
  document.querySelectorAll('.category').forEach(el=>{
    el.classList.toggle('active', el.dataset.cat === String(catId));
  });
  const selected = categories.find(c=>String(c.id||c.category_id||c.id_category||c.name||c.nama||c.kategori||c.title)===String(catId));
  categoryProductsTitle.textContent = selected ? `Menu ${selected.nama||selected.name||selected.kategori||selected.title}` : 'Menu Kategori';
  renderProducts();
  renderCategoryProducts();
}

function renderCategories(){
  if(!categoriesEl || !categoryPageCategoriesEl) return;
  categoriesEl.innerHTML = '';
  categoryPageCategoriesEl.innerHTML = '';
  const list = Array.isArray(categories) ? categories : [];
  if(list.length===0){
    categoriesEl.innerHTML = '<div style="padding:12px;color:#666">Kategori belum tersedia.</div>';
    categoryPageCategoriesEl.innerHTML = '<div style="padding:12px;color:#666">Kategori belum tersedia.</div>';
    return;
  }

  list.forEach((cat, idx)=>{
    const label = cat.nama||cat.name||cat.kategori||cat.title||cat.category||`Kategori ${idx+1}`;
    const id = String(cat.id||cat.category_id||cat.id_category||label);

    const homeCard = document.createElement('div');
    homeCard.className = 'category';
    homeCard.dataset.cat = id;
    homeCard.textContent = label;
    homeCard.addEventListener('click', ()=>{
      setActiveView('categoryView');
      setActiveCategory(id);
    });

    const pageCard = document.createElement('div');
    pageCard.className = 'category';
    pageCard.dataset.cat = id;
    pageCard.textContent = label;
    pageCard.addEventListener('click', ()=>{
      setActiveCategory(id);
    });

    categoriesEl.appendChild(homeCard);
    categoryPageCategoriesEl.appendChild(pageCard);
  });
}

function renderCategoryProducts(){
  if(!categoryProductListEl) return;
  const activeCat = getActiveCategory();
  categoryProductListEl.innerHTML = '';
  let list = Array.isArray(products) ? products.slice() : [];
  if(activeCat){
    list = list.filter(p=>{
      return (p.category_id && p.category_id.toString()===activeCat.toString()) || (p.category && p.category.toString()===activeCat.toString()) || (p.product_category && p.product_category.toString()===activeCat.toString()) || (p.kategori && p.kategori.toString()===activeCat.toString());
    });
  }

  if(list.length===0){
    categoryProductListEl.innerHTML = '<div style="padding:18px;text-align:center;color:#666">Tidak ada produk untuk kategori ini.</div>';
    return;
  }

  list.forEach((p, idx)=>{
    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('data-index', idx);
    const imgSrc = resolveImage(p);
    const imgEl = createImageElement(imgSrc, p.nama||p.name||p.product_name||'Produk');
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = p.nama||p.name||p.product_name||'Produk';
    const price = document.createElement('div');
    price.className = 'price';
    price.textContent = formatRupiah(p.harga||p.price||p.price_sell||0);

    card.appendChild(imgEl);
    card.appendChild(title);
    card.appendChild(price);
    card.addEventListener('click', ()=>openDetail(p));
    categoryProductListEl.appendChild(card);
  });
  observeCards();
}

function showMessage(text, type='info', timeout=8000){
  let el = document.getElementById('appMessage');
  if(!el){
    el = document.createElement('div'); el.id = 'appMessage';
    el.style.position = 'fixed'; el.style.left='12px'; el.style.right='12px'; el.style.bottom='86px'; el.style.zIndex=9999; el.style.padding='10px 12px'; el.style.borderRadius='10px'; el.style.boxShadow='0 8px 24px rgba(0,0,0,0.12)'; el.style.fontWeight=700; el.style.display='flex'; el.style.justifyContent='space-between'; el.style.alignItems='center';
    document.body.appendChild(el);
  }
  el.textContent = text;
  if(type==='error') el.style.background='#ffe6e6', el.style.color='#7a1f1f';
  else el.style.background='rgba(255,255,255,0.95)', el.style.color='#123';
  if(timeout>0){
    clearTimeout(el._t);
    el._t = setTimeout(()=>{ try{el.remove()}catch(e){} }, timeout);
  }
}

async function loadData(){
  try{
    let rawProducts = await loadJSON(DATA_PATH + '/Tabel_produk_rows.json');
    let rawCategories = await loadJSON(DATA_PATH + '/Produk_Category_rows.json');
    let rawMitra = await loadJSON(DATA_PATH + '/Tabel_mitra_rows.json');

    products = normalizeData(rawProducts);
    categories = normalizeData(rawCategories);
    mitra = normalizeData(rawMitra);

    console.info('Data loaded:', {products: products.length, categories: categories.length, mitra: mitra.length});

    if(products.length===0){
      showMessage('Tidak ada produk terdeteksi. Jika Anda membuka file langsung (file://), jalankan server lokal: python -m http.server', 'info', 10000);
    }
  }catch(e){
    console.error('Gagal load data', e);
    products = []; categories = []; mitra = [];
    showMessage('Gagal memuat data. Pastikan menjalankan server lokal atau periksa path data. Cek Console untuk detail.', 'error', 15000);
  }
  renderCategories();
  renderProducts();
  renderCategoryProducts();
  renderMitraList();
}

// renderProducts - show message when empty
function renderProducts(){
  const q = searchInput.value.trim().toLowerCase();
  const activeCat = getActiveCategory();
  if(!productListEl) return;
  productListEl.innerHTML = '';
  let list = Array.isArray(products) ? products.slice() : [];
  if(activeCat){
    list = list.filter(p=>{
      return (p.category_id && p.category_id.toString()===activeCat.toString()) || (p.category && p.category.toString()===activeCat.toString()) || (p.product_category && p.product_category.toString()===activeCat.toString())
    });
  }
  if(q){
    list = list.filter(p=> (String(p.nama||p.name||p.product_name||'').toLowerCase().includes(q) || String(p.deskripsi||p.description||'').toLowerCase().includes(q)));
  }

  if(list.length===0){
    productListEl.innerHTML = '<div style="padding:18px;text-align:center;color:#666">Tidak ada produk.</div>';
    return;
  }

  list.forEach((p, idx)=>{
    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('data-index', idx);
    const imgSrc = resolveImage(p);
    const imgEl = createImageElement(imgSrc, p.nama||p.name||'Produk');
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = p.nama||p.name||p.product_name||'Produk';
    const price = document.createElement('div');
    price.className = 'price';
    price.textContent = formatRupiah(p.harga||p.price||p.price_sell||0);

    card.appendChild(imgEl);
    card.appendChild(title);
    card.appendChild(price);
    card.addEventListener('click', ()=>openDetail(p));
    productListEl.appendChild(card);
  });

  // observe newly added cards for reveal animation
  observeCards();
}

function resolveImage(p){
  // try many common fields and shapes used by APIs / Supabase
  const possibleKeys = ['image','gambar','photo','foto','img','thumbnail','picture','image_url','url','public_url','file','gambar_url'];

  function normalizeVal(val){
    if(!val) return null;
    if(typeof val === 'string') return val.trim();
    if(typeof val === 'object'){
      // try common object shapes
      return val.url || val.path || val.publicURL || val.public_url || val.storage_path || val.file || null;
    }
    return null;
  }

  // check direct keys
  for(const k of possibleKeys){
    if(p[k]){
      const v = normalizeVal(p[k]);
      if(v) return makeFullUrl(v);
    }
  }

  // check arrays (e.g., images: [{url: ...}])
  if(Array.isArray(p.images) && p.images.length){
    const v = normalizeVal(p.images[0]);
    if(v) return makeFullUrl(v);
  }

  if(Array.isArray(p.gambar) && p.gambar.length){
    const v = normalizeVal(p.gambar[0]);
    if(v) return makeFullUrl(v);
  }

  // fallback to placeholder local image
  return './img/taplak.jpg';

  function makeFullUrl(v){
    if(!v) return './img/taplak.jpg';
    // already absolute
    if(v.startsWith('http') || v.startsWith('data:')) return v;
    // absolute path on server, keep as-is (prepend dot to use relative)
    if(v.startsWith('/')) return '.' + v;
    // if looks like supabase storage path (e.g., 'public/produk/image.jpg' or 'bucket/..') and SUPABASE_BASE configured
    if((v.includes('public/') || v.includes('storage') || v.includes('bucket') || v.match(/\.jpg$|\.png$|\.webp$|\.jpeg$/i)) && SUPABASE_BASE){
      return SUPABASE_BASE.replace(/\/$/, '') + '/' + v.replace(/^\/?/, '');
    }
    // try local img folder
    return './img/' + v;
  }
}

function createImageElement(src, alt){
  const img = document.createElement('img');
  img.className = 'loading';
  // set a tiny transparent placeholder first to reserve layout (optional)
  img.src = src || './img/taplak.jpg';
  img.alt = alt||'';
  img.loading = 'lazy';
  img.addEventListener('load', ()=>{
    img.classList.remove('loading');
  });
  img.addEventListener('error', ()=>{
    if(!img._retried){
      img._retried = true;
      img.src = './img/taplak.jpg';
    } else {
      img.classList.remove('loading');
    }
  });
  return img;
}

// reveal cards when in viewport
const io = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{
    if(e.isIntersecting){
      e.target.classList.add('in-view');
    }
  });
},{threshold:0.15});

// apply observer after rendering products
const observeCards = ()=>{
  document.querySelectorAll('.card').forEach((c,idx)=>{
    c.style.setProperty('--i', idx);
    io.observe(c);
  });
};

function saveCart(){
  localStorage.setItem('mt_cart', JSON.stringify(cart));
}

function loadCart(){
  cart = JSON.parse(localStorage.getItem('mt_cart')||'[]');
  renderCart();
}

function renderCart(){
  if(!cartListEl) return;
  cartListEl.innerHTML = '';
  if(cart.length===0){
    cartListEl.innerHTML = '<div style="padding:18px;text-align:center;color:#666">Keranjang kosong.</div>';
    cartTotalEl.textContent = formatRupiah(0);
    cartCountEl.textContent = '0';
    return;
  }

  let total = 0;
  cart.forEach((item, idx)=>{
    const row = document.createElement('div'); row.className='cart-item';
    const img = createImageElement(resolveImage(item), item.nama||item.name||item.product_name||'Produk');
    img.style.width='64px'; img.style.height='64px'; img.style.borderRadius='10px';
    const info = document.createElement('div'); info.style.flex='1';
    const title = document.createElement('div'); title.className='title'; title.textContent = item.nama||item.name||item.product_name||'Produk';
    const qty = document.createElement('div'); qty.textContent = `x${item.qty||1}`;
    const price = document.createElement('div'); price.className='price'; price.textContent = formatRupiah((item.harga||item.price||item.price_sell||0) * (item.qty||1));
    info.appendChild(title); info.appendChild(qty); info.appendChild(price);
    const removeBtn = document.createElement('button'); removeBtn.className='btn'; removeBtn.textContent='Hapus';
    removeBtn.addEventListener('click', ()=>{
      cart.splice(idx,1);
      saveCart();
      renderCart();
      cartCountEl.textContent = cart.reduce((sum, x)=>sum+(x.qty||1),0);
    });
    row.appendChild(img); row.appendChild(info); row.appendChild(removeBtn);
    cartListEl.appendChild(row);
    total += (item.harga||item.price||item.price_sell||0) * (item.qty||1);
  });
  cartTotalEl.textContent = formatRupiah(total);
  cartCountEl.textContent = cart.reduce((sum, x)=>sum+(x.qty||1),0);
}

function addToCart(product){
  const found = cart.find(item=> item.id === product.id || item.id === product.id_produk || item.id === product.product_id || item.name === product.name || item.nama === product.nama);
  if(found){
    found.qty = (found.qty||1) + 1;
  } else {
    cart.push({
      ...product,
      qty: 1,
      price: Number(product.harga||product.price||product.price_sell||0)
    });
  }
  saveCart();
  renderCart();
  cartCountEl.textContent = cart.reduce((sum, x)=>sum+(x.qty||1),0);
  showMessage('Produk ditambahkan ke keranjang.', 'info', 2000);
}

// banner parallax on scroll
const mainEl = document.querySelector('main');
mainEl.addEventListener('scroll', ()=>{
  const banner = document.querySelector('.banner');
  if(!banner) return;
  const scrolled = Math.min(1, window.scrollY / 120);
  if(scrolled>0.02) banner.classList.add('scrolled'); else banner.classList.remove('scrolled');
});

// modify renderProducts to call observeCards
function renderProducts(){
  const q = searchInput.value.trim().toLowerCase();
  const activeCat = getActiveCategory();
  if(!productListEl) return;
  productListEl.innerHTML = '';
  let list = Array.isArray(products) ? products.slice() : [];
  if(activeCat){
    list = list.filter(p=>{
      return (p.category_id && p.category_id.toString()===activeCat.toString()) || (p.category && p.category.toString()===activeCat.toString()) || (p.product_category && p.product_category.toString()===activeCat.toString())
    });
  }
  if(q){
    list = list.filter(p=> (String(p.nama||p.name||p.product_name||'').toLowerCase().includes(q) || String(p.deskripsi||p.description||'').toLowerCase().includes(q)));
  }

  if(list.length===0){
    productListEl.innerHTML = '<div style="padding:18px;text-align:center;color:#666">Tidak ada produk.</div>';
    return;
  }

  list.forEach((p, idx)=>{
    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('data-index', idx);
    const imgSrc = resolveImage(p);
    const imgEl = createImageElement(imgSrc, p.nama||p.name||'Produk');
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = p.nama||p.name||p.product_name||'Produk';
    const price = document.createElement('div');
    price.className = 'price';
    price.textContent = formatRupiah(p.harga||p.price||p.price_sell||0);

    card.appendChild(imgEl);
    card.appendChild(title);
    card.appendChild(price);
    card.addEventListener('click', ()=>openDetail(p));
    productListEl.appendChild(card);
  });

  // observe newly added cards for reveal animation
  observeCards();
}

function openDetail(p){
  setActiveView('detailView');
  const imgSrc = resolveImage(p);
  detailContent.innerHTML = '';
  const wrapper = document.createElement('div');
  wrapper.className = 'detail-content';
  const img = createImageElement(imgSrc, p.nama||p.name||'Produk');
  img.style.maxHeight = '300px'; img.style.width = '100%'; img.style.objectFit = 'cover'; img.style.borderRadius = '8px';
  const h3 = document.createElement('h3'); h3.textContent = p.nama||p.name||p.product_name||'Produk';
  const pr = document.createElement('div'); pr.className='price'; pr.textContent = formatRupiah(p.harga||p.price||0);
  const desc = document.createElement('p'); desc.textContent = p.deskripsi||p.description||'Tidak ada deskripsi.';
  const actions = document.createElement('div'); actions.style.display='flex'; actions.style.gap='8px'; actions.style.marginTop='8px';
  const addBtn = document.createElement('button'); addBtn.className='btn primary'; addBtn.textContent='Tambah ke Keranjang';
  const closeBtn = document.createElement('button'); closeBtn.className='btn'; closeBtn.textContent='Tutup';
  addBtn.addEventListener('click', ()=>addToCart(p));
  closeBtn.addEventListener('click', ()=>setActiveView('homeView'));
  actions.appendChild(addBtn); actions.appendChild(closeBtn);
  wrapper.appendChild(img); wrapper.appendChild(h3); wrapper.appendChild(pr); wrapper.appendChild(desc); wrapper.appendChild(actions);
  detailContent.appendChild(wrapper);
}

// checkout and orders logic
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

// Mitra functions
function renderMitraList(){
  if(!mitraListEl) return;
  mitraListEl.innerHTML = '';
  const list = Array.isArray(mitra) ? mitra : [];
  list.forEach(m=>{
    const card = document.createElement('div');
    card.className = 'mitra-card';
    const imgSrc = resolveImage(m) || './img/taplak.jpg';
    const img = createImageElement(imgSrc, m.nama || m.name || 'Mitra');
    img.style.width='64px'; img.style.height='64px'; img.style.borderRadius='10px';
    const info = document.createElement('div'); info.className='mitra-info';
    const t = document.createElement('div'); t.className='title'; t.textContent = m.nama || m.name || 'Mitra';
    const s = document.createElement('div'); s.className='subtitle'; s.textContent = m.alamat || m.address || m.keterangan || '';
    info.appendChild(t); info.appendChild(s);
    card.appendChild(img); card.appendChild(info);
    card.addEventListener('click', ()=>openMitraDetail(m));
    mitraListEl.appendChild(card);
  });
}

function openMitraDetail(m){
  setActiveView('mitraDetailView');
  mitraDetailContent.innerHTML = '';
  const wrapper = document.createElement('div'); wrapper.className='detail-content mitra-detail-card';
  const img = createImageElement(resolveImage(m), m.nama||m.name||'Mitra'); img.style.width='100%'; img.style.height='180px'; img.style.objectFit='cover'; img.style.borderRadius='16px';
  const h3 = document.createElement('h3'); h3.textContent = m.nama || m.name || 'Mitra';
  const meta = document.createElement('div'); meta.className='mitra-detail-meta';
  const badge = document.createElement('span'); badge.className='mitra-badge'; badge.textContent = m.rating ? `${m.rating.toFixed(1)} ★` : 'Mitra Unggulan';
  const location = document.createElement('span'); location.className='subtitle'; location.textContent = m.alamat || m.address || 'Lokasi mitra tidak tersedia';
  meta.appendChild(badge); meta.appendChild(location);
  const desc = document.createElement('p'); desc.textContent = m.keterangan || m.description || 'Mitra ini menghadirkan menu segar dengan rasa khas Bu Tutut.';
  wrapper.appendChild(img); wrapper.appendChild(h3); wrapper.appendChild(meta); wrapper.appendChild(desc);

  // show products from this mitra
  const related = products.filter(p=> (p.mitra_id && (p.mitra_id==m.id || p.mitra_id==m.id_mitra)) || (p.id_mitra && (p.id_mitra==m.id || p.id_mitra==m.id_mitra)) || (p.mitra && (p.mitra==m.nama || p.mitra==m.name)) );
  const title = document.createElement('div'); title.className='section-title'; title.textContent='Menu Pilihan dari Mitra';
  const grid = document.createElement('div'); grid.className='mitra-menu-grid';

  if(related.length === 0){
    const empty = document.createElement('div'); empty.className='mitra-empty';
    empty.textContent = 'Belum ada menu terdaftar untuk mitra ini. Coba mitra lain untuk melihat pilihan menu lengkap.';
    grid.appendChild(empty);
  } else {
    related.forEach((p, idx)=>{
      const card = document.createElement('div'); card.className='mitra-product-card';
      const imgEl = createImageElement(resolveImage(p), p.nama||p.name||p.product_name||'Produk');
      const body = document.createElement('div'); body.className='card-body';
      const titleP = document.createElement('div'); titleP.className='title'; titleP.textContent = p.nama||p.name||p.product_name||'Produk';
      const subtitle = document.createElement('div'); subtitle.className='subtitle'; subtitle.textContent = p.kategori||p.category||p.product_category||String(p.deskripsi||p.description||'').slice(0, 40) || 'Menu favorit dari mitra ini';
      const price = document.createElement('div'); price.className='price'; price.textContent = formatRupiah(p.harga||p.price||p.price_sell||0);
      const actions = document.createElement('div'); actions.className='card-actions';
      const orderBtn = document.createElement('button'); orderBtn.className='btn primary'; orderBtn.textContent='Lihat';
      orderBtn.addEventListener('click', ()=>openDetail(p));
      actions.appendChild(orderBtn);
      body.appendChild(titleP);
      body.appendChild(subtitle);
      body.appendChild(price);
      body.appendChild(actions);
      card.appendChild(imgEl);
      card.appendChild(body);
      grid.appendChild(card);
    });
  }
  mitraDetailContent.appendChild(wrapper);
  mitraDetailContent.appendChild(title);
  mitraDetailContent.appendChild(grid);

  // observe new cards
  observeCards();
}

if(openMitraBtn) openMitraBtn.addEventListener('click', ()=>{ setActiveView('mitraView'); renderMitraList(); });
if(backToMitra) backToMitra.addEventListener('click', ()=>{ setActiveView('mitraView'); });

// init
loadCart();
loadData();
renderOrders();

// expose for debug
window.app = {products,categories,mitra,cart,addToCart,renderProducts};

// Swipe gesture navigation (touch) untuk pengalaman mobile lebih smooth
(function(){
  const mainArea = document.querySelector('main');
  if(!mainArea) return;
  let startX = 0, startY = 0;
  const THRESHOLD = 50; // px

  function getViewOrder(){
    const btns = Array.from(document.querySelectorAll('.bottom-nav .nav-btn'));
    const views = [];
    btns.forEach(b=>{
      const v = b.dataset.view;
      if(v && !views.includes(v)) views.push(v);
    });
    return views.length ? views : ['homeView','cartView','profileView'];
  }

  function focusViewIndex(i){
    const order = getViewOrder();
    const idx = (i + order.length) % order.length;
    setActiveView(order[idx]);
  }

  function goNextView(){
    const order = getViewOrder();
    const current = order.indexOf(document.querySelector('.view.active')?.id);
    focusViewIndex(current + 1);
  }
  function goPrevView(){
    const order = getViewOrder();
    const current = order.indexOf(document.querySelector('.view.active')?.id);
    focusViewIndex(current - 1);
  }

  mainArea.addEventListener('touchstart', (e)=>{
    const t = e.touches[0]; startX = t.clientX; startY = t.clientY;
  }, {passive:true});

  mainArea.addEventListener('touchend', (e)=>{
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if(Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > THRESHOLD){
      if(dx < 0) goNextView(); else goPrevView();
    }
  }, {passive:true});

  // also support keyboard arrows for convenience during desktop testing
  window.addEventListener('keydown', (e)=>{
    if(e.key === 'ArrowLeft') goPrevView();
    if(e.key === 'ArrowRight') goNextView();
  });
})();
