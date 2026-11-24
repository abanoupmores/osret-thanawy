// خلفيات التطبيق: صور طبيعية من www/assets/backgrounds (غيّر الصورة بنفس الاسم وهتتغير في كل مكان)
const DIR = 'assets/backgrounds/';
export const BG = {
  light:   {n: 'أشعة النور', img: 'heaven-1.webp'},
  rainbow: {n: 'القوس حول العرش', img: 'heaven-2.webp'},
  gold:    {n: 'بحر زجاج وذهب', img: 'heaven-3.webp'}
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
export const preview = k => thumb(BG[k] ? BG[k].img : BG.light.img);
export const splashBg = () => thumb(BG.light.img);
