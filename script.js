(() => {
  'use strict';
  const $ = (selector, root=document) => root.querySelector(selector);
  const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
  const STORAGE_KEY = 'kampusLostDataV1';
  const readStore = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { reports: [], claims: [], profile: { name: 'Fahri', nim: '' } }; }
    catch { return { reports: [], claims: [], profile: { name: 'Fahri', nim: '' } }; }
  };
  const saveStore = data => localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  let store = readStore();
  let selectedItem = null;
  let lastAction = 'report';

  const initialItems = [
    {name:'Dompet Hitam',status:'Hilang',category:'Aksesori',location:'Perpustakaan',description:'Dompet berwarna hitam dengan ukuran kecil. Memiliki beberapa kartu di dalamnya.',date:'24 Oktober 2026',time:'14.30 WIB'},
    {name:'Botol Minum',status:'Ditemukan',category:'Barang Pribadi',location:'Kantin',description:'Botol minum yang ditemukan di area kantin kampus.',date:'25 Oktober 2026',time:'10.00 WIB'},
    {name:'Flashdisk',status:'Hilang',category:'Elektronik',location:'Gedung A',description:'Flashdisk yang terakhir digunakan di Gedung A.',date:'25 Oktober 2026',time:'13.00 WIB'},
    {name:'Kartu Mahasiswa',status:'Ditemukan',category:'Dokumen',location:'Gedung B',description:'Kartu mahasiswa ditemukan di sekitar Gedung B.',date:'26 Oktober 2026',time:'09.00 WIB'}
  ];
  const getItems = () => [...initialItems, ...store.reports];

  function showPage(id) {
    const target = document.getElementById(id);
    if (!target) return;
    $$('.page').forEach(page => page.hidden = page.id !== id);
    window.scrollTo({top:0, behavior:'smooth'});
    $$('.nav-links a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + id));
    if (id === 'profil') renderHistory();
    if (id === 'cari') renderItems();
  }
  function navigate(id) {
    if (!document.getElementById(id)) return;
    if (location.hash !== '#' + id) history.pushState(null, '', '#' + id);
    showPage(id);
  }
  window.addEventListener('hashchange', () => showPage(location.hash.slice(1) || 'beranda'));
  window.addEventListener('popstate', () => showPage(location.hash.slice(1) || 'beranda'));
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute('href').slice(1);
    if (!document.getElementById(id)) return;
    event.preventDefault();
    navigate(id);
  });

  function cardData(card) {
    const name = card.dataset.name || $('h3', card)?.textContent.trim() || 'Barang';
    const tags = $$('.tag', card).map(el => el.textContent.trim());
    return {
      name,
      status: card.dataset.status || (tags[0] || 'Hilang'),
      category: card.dataset.category || (tags[1] || 'Lainnya'),
      location: card.dataset.location || 'Kampus',
      description: $('p', card)?.textContent.trim() || 'Informasi barang belum tersedia.',
      date: card.dataset.date || 'Belum dicantumkan',
      time: card.dataset.time || 'Belum dicantumkan'
    };
  }
  function renderItems() {
    const grid = $('.result-grid', $('#cari'));
    if (!grid) return;
    const items = getItems();
    // Rebuild cards so newly submitted reports are available immediately.
    grid.innerHTML = '';
    items.forEach((item, index) => {
      const card = document.createElement('a');
      card.href = '#detail';
      card.className = 'item-card';
      card.dataset.name = item.name;
      card.dataset.status = item.status;
      card.dataset.category = item.category;
      card.dataset.location = item.location;
      card.dataset.date = item.date;
      card.dataset.time = item.time;
      const image = document.createElement('div'); image.className = 'item-image'; image.textContent = 'Foto Barang';
      const info = document.createElement('div'); info.className = 'item-info';
      const title = document.createElement('h3'); title.textContent = item.name;
      const meta = document.createElement('div'); meta.className = 'item-meta';
      [item.status, item.category].forEach(value => { const tag=document.createElement('span'); tag.className='tag'; tag.textContent=value; meta.append(tag); });
      const desc = document.createElement('p'); desc.textContent = item.description;
      info.append(title, meta, desc); card.append(image, info); grid.append(card);
    });
    applyFilters();
  }
  function parseIndonesianDate(value) {
    const match = String(value || '').match(/^(\d{1,2})\s+([\p{L}]+)\s+(\d{4})$/u);
    if (!match) return null;
    const months = {januari:0,februari:1,maret:2,april:3,mei:4,juni:5,juli:6,agustus:7,september:8,oktober:9,november:10,desember:11};
    const month = months[match[2].toLowerCase()];
    if (month === undefined) return null;
    return new Date(Number(match[3]), month, Number(match[1]));
  }
  function applyFilters() {
    const status = $('#filterStatus')?.value || 'all';
    const category = $('#filterCategory')?.value || 'all';
    const location = $('#filterLocation')?.value || 'all';
    const time = $('#filterTime')?.value || 'all';
    const today = new Date();
    today.setHours(0,0,0,0);
    let shown = 0;
    $$('.item-card', $('#cari')).forEach(card => {
      const item = cardData(card);
      let ok = (status === 'all' || item.status === status) &&
        (category === 'all' || item.category === category) &&
        (location === 'all' || item.location.toLowerCase().includes(location.toLowerCase()));
      if (time !== 'all') {
        const itemDate = parseIndonesianDate(item.date);
        if (!itemDate) ok = false;
        else {
          const ageDays = Math.floor((today - itemDate) / 86400000);
          if (time === 'today') ok = ok && ageDays === 0;
          if (time === '7days') ok = ok && ageDays >= 0 && ageDays < 7;
          if (time === '30days') ok = ok && ageDays >= 0 && ageDays < 30;
        }
      }
      card.hidden = !ok;
      if (ok) shown++;
    });
    $('#resultCount').textContent = `${shown} hasil`;
    const grid = $('.result-grid', $('#cari'));
    let empty = $('.empty-state', grid);
    if (!shown) {
      if (!empty) { empty=document.createElement('div'); empty.className='empty-state'; empty.textContent='Tidak ada barang yang sesuai dengan filter.'; grid.append(empty); }
    } else if (empty) empty.remove();
  }
  $('#applyFilters')?.addEventListener('click', applyFilters);
  ['filterStatus','filterCategory','filterLocation','filterTime'].forEach(id => $('#'+id)?.addEventListener('change', applyFilters));

  function openDetail(card) {
    selectedItem = cardData(card);
    $('#detailName').textContent = selectedItem.name;
    $('#detailStatus').textContent = 'Barang ' + selectedItem.status;
    $('#detailCategory').textContent = selectedItem.category;
    $('#detailLocation').textContent = selectedItem.location;
    $('#detailDate').textContent = selectedItem.date;
    $('#detailTime').textContent = selectedItem.time;
    const desc = $('.detail-info > p'); if (desc) desc.textContent = selectedItem.description;
    navigate('detail');
  }
  $('#cari')?.addEventListener('click', event => {
    const card = event.target.closest('.item-card');
    if (!card) return;
    event.preventDefault(); openDetail(card);
  });
  // If the detail page is opened directly, use the first listed item.
  if (!selectedItem) selectedItem = initialItems[0];
  $('#detail .btn[href="#klaim"]')?.addEventListener('click', () => { if (!selectedItem) selectedItem=initialItems[0]; });

  function fieldValues(container) {
    return $$('input:not([type=radio]):not([type=file]), select, textarea', container).map(el => el.value.trim());
  }
  function flash(message, container) {
    let notice = $('.notice', container);
    if (!notice) { notice=document.createElement('div'); notice.className='notice'; container.prepend(notice); }
    notice.textContent=message;
  }
  function renderHistory() {
    const list = $('#historyList'); if (!list) return;
    list.innerHTML='';
    const entries = [
      ...store.reports.map(r => ({name:r.name, detail:'Laporan barang '+r.status.toLowerCase(), status:'Diproses', date:r.createdAt})),
      ...store.claims.map(c => ({name:c.itemName, detail:'Pengajuan klaim', status:'Menunggu verifikasi', date:c.createdAt}))
    ];
    if (!entries.length) {
      const empty=document.createElement('div'); empty.className='history-item'; empty.textContent='Belum ada riwayat laporan.'; list.append(empty); return;
    }
    entries.slice().reverse().forEach(entry => {
      const row=document.createElement('div'); row.className='history-item';
      const left=document.createElement('div'); const h=document.createElement('h3'); h.textContent=entry.name;
      const p=document.createElement('p'); p.textContent=entry.detail + (entry.date ? ' • '+entry.date : ''); left.append(h,p);
      const tag=document.createElement('span'); tag.className='tag'; tag.textContent=entry.status; row.append(left,tag); list.append(row);
    });
  }
  function confirmation(title, message, action) {
    $('#confirmationTitle').textContent=title;
    $('#confirmationMessage').textContent=message;
    lastAction=action;
    navigate('konfirmasi');
  }

  $('#submitClaim')?.addEventListener('click', () => {
    const card=$('#klaim .form-card');
    const fields=fieldValues(card);
    const [name,nim,ownership,extra] = fields;
    if (!name || !nim || !ownership) { flash('Isi nama, NIM, dan deskripsi kepemilikan terlebih dahulu.', card); return; }
    store.claims.push({itemName:selectedItem?.name || 'Barang', name,nim,ownership,extra,createdAt:new Date().toLocaleString('id-ID')});
    saveStore(store);
    confirmation('Klaim Berhasil Dikirim','Pengajuan klaim untuk '+(selectedItem?.name || 'barang')+' sudah tersimpan di riwayat profil.','claim');
  });

  $('#submitReport')?.addEventListener('click', () => {
    const card=$('#lapor .form-card');
    const kind=$('input[name="jenis"]:checked', card)?.parentElement?.textContent.trim() || 'Barang Hilang';
    const fields=fieldValues(card);
    const [name,category,location,date,time,description] = fields;
    if (!name || !category || category==='Pilih kategori' || !location || location==='Pilih lokasi' || !date || !description) {
      flash('Lengkapi nama barang, kategori, lokasi, tanggal, dan deskripsi.', card); return;
    }
    const status = kind.includes('Ditemukan') ? 'Ditemukan' : 'Hilang';
    const item={name,status,category,location, date:new Date(date+'T00:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}),time:time || 'Tidak dicantumkan',description,createdAt:new Date().toLocaleString('id-ID')};
    store.reports.push(item); saveStore(store);
    renderItems();
    confirmation('Laporan Berhasil Dikirim','Laporan '+name+' berhasil disimpan dan sekarang tersedia di daftar barang. Kamu bisa melihat riwayatnya melalui Profil.','report');
    card.reset?.();
  });

  // Basic profile setting: allow changing the displayed name.
  const settingsLink = $$('#profil a').find(a => a.textContent.trim()==='Pengaturan');
  settingsLink?.addEventListener('click', event => {
    event.preventDefault();
    const current=store.profile?.name || 'Fahri';
    const next=window.prompt('Masukkan nama yang ingin ditampilkan:', current);
    if (next && next.trim()) { store.profile={...store.profile,name:next.trim()}; saveStore(store); $('#profileName').textContent=next.trim(); }
  });
  $('#profileName').textContent = store.profile?.name || 'Fahri';

  // Ensure all pages behave as a single-page website.
  const initial = location.hash.slice(1) || 'beranda';
  showPage(document.getElementById(initial) ? initial : 'beranda');
  renderItems();
  renderHistory();
})();
