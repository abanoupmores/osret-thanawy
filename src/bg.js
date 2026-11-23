// خلفيات التطبيق: صور طبيعية من www/assets/backgrounds (غيّر الصورة بنفس الاسم وهتتغير في كل مكان)
const DIR = 'assets/backgrounds/';
export const BG = {
  sunset:    {n: 'الكنيسة وقت الغروب', img: 'church-sunset.webp'},
  sunrise:   {n: 'الدير وقت الشروق',   img: 'monastery-sunrise.webp'},
  interior:  {n: 'داخل الكنيسة',       img: 'church-interior.webp'},
  hymns:     {n: 'صحن الكنيسة', img: 'music-hymns.webp'},
  clouds:    {n: 'السماء والمدينة',    img: 'sky-competitions.webp'},
  book:      {n: 'الدير والسماء',      img: 'book-chat.webp'}
};
const url = f => `url('${DIR}${f}')`;
const thumb = f => `<div style="position:absolute;inset:0;background:${url(f)} center/cover no-repeat"></div>`;
// المفتاح الفارغ = تلقائي (خلفية مناسبة لكل صفحة من ملف style.css)
export const getBgKey = () => { let k = ''; try { k = localStorage.getItem('bgk') || ''; } catch (e) {} return BG[k] ? k : ''; };
export const setBg = (k, save = true) => {
  if (save) { try { BG[k] ? localStorage.setItem('bgk', k) : localStorage.removeItem('bgk'); } catch (e) {} }
  const key = getBgKey();
  document.body.classList.toggle('custom-bg', !!key);
  document.body.style.setProperty('--user-bg', key ? url(BG[key].img) : 'none');
  const el = document.getElementById('bg'); if (el) el.innerHTML = '';
};
export const preview = k => thumb(BG[k] ? BG[k].img : BG.sunset.img);
export const splashBg = () => thumb(BG.sunrise.img);
