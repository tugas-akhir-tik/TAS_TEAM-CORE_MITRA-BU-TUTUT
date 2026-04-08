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

// Mitra views
const mitraListEl = document.getElementById('mitraList');
const mitraDetailContent = document.getElementById('mitraDetailContent');
const openMitraBtn = document.getElementById('openMitra');
const backToMitra = document.getElementById('backToMitra');

// Review modal logic
const reviewModal = document.getElementById('reviewModal');
const closeReviewModal = document.getElementById('closeReviewModal');
const cancelReview = document.getElementById('cancelReview');
const submitReview = document.getElementById('submitReview');
const starInput = document.getElementById('starInput');
const reviewText = document.getElementById('reviewText');
let currentReviewProductId = null;
let currentRating = 5;

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
  n = Number(n) || 0;
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
  renderMitraList();
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

const SUPABASE_BASE = ''; // contoh: 'https://your-project.supabase.co/storage/v1/object/public'

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

  // add review button
  const reviewBtn = document.createElement('button'); reviewBtn.className='btn'; reviewBtn.textContent='Tulis Ulasan';
  reviewBtn.addEventListener('click', ()=>{
    const pid = p.id || p.id_produk || (p.nama||p.name||p.product_name);
    openReviewModal(pid);
  });
  addBtn.insertAdjacentElement('afterend', reviewBtn);

  // append reviews
  const container = document.createElement('div'); container.style.marginTop='12px';
  const title = document.createElement('div'); title.className='section-title'; title.textContent='Ulasan';
  detailContent.appendChild(title);
  renderReviewsForProduct(p.id || p.id_produk || (p.nama||p.name||p.product_name), detailContent);
}

// review modal functions
function openReviewModal(productId){
  currentReviewProductId = productId;
  reviewModal.setAttribute('aria-hidden', 'false');
  reviewText.value = '';
  renderStars(currentRating);
}
function closeReview(){
  reviewModal.setAttribute('aria-hidden', 'true');
}
function renderStars(r){
  starInput.innerHTML = '';
  for(let i=1;i<=5;i++){
    const s = document.createElement('span'); s.className='star'+(i<=r?' active':''); s.textContent='★'; s.dataset.val = i;
    s.addEventListener('click', ()=>{ currentRating = i; renderStars(currentRating); });
    starInput.appendChild(s);
  }
}

closeReviewModal.addEventListener('click', closeReview);
cancelReview.addEventListener('click', closeReview);
submitReview.addEventListener('click', ()=>{
  if(!currentReviewProductId) return;
  const text = reviewText.value.trim();
  const reviews = JSON.parse(localStorage.getItem('mt_reviews')||'{}');
  reviews[currentReviewProductId] = reviews[currentReviewProductId] || [];
  reviews[currentReviewProductId].push({rating: currentRating, text, date: new Date().toISOString()});
  localStorage.setItem('mt_reviews', JSON.stringify(reviews));
  alert('Terima kasih atas ulasannya');
  closeReview();
  // if detail open for this product, re-render reviews
  if(document.querySelector('.detail-content h3') && document.querySelector('.detail-content h3').textContent){
    // naive check: re-open detail to refresh reviews
    // better: inject reviews directly
  }
});

function renderReviewsForProduct(productId, container){
  const reviews = JSON.parse(localStorage.getItem('mt_reviews')||'{}');
  const list = reviews[productId] || [];
  const wrap = document.createElement('div'); wrap.className='reviews';
  if(list.length===0){ wrap.innerHTML = '<div>Belum ada ulasan.</div>'; container.appendChild(wrap); return }
  list.forEach(r=>{
    const d = document.createElement('div'); d.style.background='#fff'; d.style.padding='8px'; d.style.borderRadius='8px'; d.style.marginBottom='8px';
    d.innerHTML = `<div style="font-weight:700">${'★'.repeat(r.rating)}<span style="color:#666;font-weight:400;margin-left:6px;font-size:12px">${new Date(r.date).toLocaleString()}</span></div><div style="margin-top:6px">${r.text}</div>`;
    wrap.appendChild(d);
  });
  container.appendChild(wrap);
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
  const wrapper = document.createElement('div'); wrapper.className='detail-content';
  const img = createImageElement(resolveImage(m), m.nama||m.name||'Mitra'); img.style.width='100%'; img.style.height='160px'; img.style.objectFit='cover'; img.style.borderRadius='8px';
  const h3 = document.createElement('h3'); h3.textContent = m.nama || m.name || 'Mitra';
  const addr = document.createElement('div'); addr.textContent = m.alamat || m.address || '';
  const desc = document.createElement('p'); desc.textContent = m.keterangan || m.description || '';
  wrapper.appendChild(img); wrapper.appendChild(h3); wrapper.appendChild(addr); wrapper.appendChild(desc);

  // show products from this mitra
  const related = products.filter(p=> (p.mitra_id && (p.mitra_id==m.id || p.mitra_id==m.id_mitra)) || (p.id_mitra && (p.id_mitra==m.id || p.id_mitra==m.id_mitra)) || (p.mitra && (p.mitra==m.nama || p.mitra==m.name)) );
  const title = document.createElement('div'); title.className='section-title'; title.textContent='Produk dari Mitra';
  const grid = document.createElement('div'); grid.className='product-list';
  related.forEach(p=>{
    const card = document.createElement('div'); card.className='card';
    const imgEl = createImageElement(resolveImage(p));
    const titleP = document.createElement('div'); titleP.className='title'; titleP.textContent = p.nama||p.name||'Produk';
    const price = document.createElement('div'); price.className='price'; price.textContent = formatRupiah(p.harga||p.price||0);
    card.appendChild(imgEl); card.appendChild(titleP); card.appendChild(price);
    card.addEventListener('click', ()=>openDetail(p));
    grid.appendChild(card);
  });

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
