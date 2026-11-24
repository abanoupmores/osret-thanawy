# اختبار دخان للواجهة 5.0.0 (Firebase مُستبدل بـ stub في الذاكرة) — لا يختبر قواعد Firestore.
import asyncio, subprocess, sys, time, os
from playwright.async_api import async_playwright
SEED='''
const D=Date.now();
window.__DB={
 users:{
  adm:{name:'المدير',role:'admin',section:'general',status:'active',memberId:''},
  bs:{name:'خادم بنين',role:'servant',section:'boys',status:'active',memberId:'',phone:'0100'},
  gs:{name:'خادمة بنات',role:'servant',section:'girls',status:'active',memberId:''},
  bm:{name:'مينا',role:'member',section:'boys',status:'active',memberId:'M1'},
  gm:{name:'مريم',role:'member',section:'girls',status:'active',memberId:'M2'},
  pm:{name:'بيشوي',role:'member',section:'boys',status:'pending',memberId:'M3'},
  ps:{name:'خادمة جديدة',role:'servant',section:'girls',status:'pending',memberId:''},
  sus:{name:'موقوف',role:'member',section:'boys',status:'suspended',memberId:'M4'},
  bad:{name:'غلط',role:'servant',section:'general',status:'active',memberId:''}
 },
 members:{
  M1:{name:'مينا',section:'boys',points:7,attended:1,uid:'bm',added:1,phone:'01011111111',approved:true},
  M2:{name:'مريم',section:'girls',points:9,attended:1,uid:'gm',added:1,phone:'01022222222',approved:true},
  M3:{name:'بيشوي',section:'boys',points:0,attended:0,uid:'pm',added:1,phone:'01033333333',approved:false},
  M4:{name:'موقوف',section:'boys',points:0,attended:0,uid:'sus',added:1,approved:true}
 },
 events:{
  E1:{type:'rehearsal',title:'اجتماع البنين',when:D+2*864e5,section:'boys'},
  E2:{type:'rehearsal',title:'اجتماع البنات',when:D+2*864e5,section:'girls'},
  E3:{type:'other',title:'رحلة مشتركة',when:D+3*864e5,section:'both'}
 },
 linkContests:{C1:{section:'boys',title:'مسابقة الرؤيا',description:'',url:'https://forms.gle/abc123',deadline:0,maxPts:10,closed:false,createdAt:D},C2:{section:'girls',title:'مسابقة البنات',url:'https://forms.gle/zzz',deadline:0,maxPts:5,closed:false,createdAt:D}},
 attendance:{}, adjustments:{}, notifs:{
  N1:{to:'all',section:'boys',kind:'msg',title:'إشعار للبنين',body:'x',at:D},
  N2:{to:'all',section:'girls',kind:'msg',title:'إشعار للبنات',body:'x',at:D}
 }, config:{main:{}}
};'''
errs=[];R={}
def ok(k,v): R[k]=bool(v)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':420,'height':850})
    pg.on('pageerror',lambda e:errs.append('PAGEERR '+str(e)))
    pg.on('console',lambda m:errs.append('CONSOLE '+m.text) if m.type=='error' else None)
    pg.on('dialog',lambda d:asyncio.ensure_future(d.accept()))
    await pg.add_init_script(SEED)
    await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(2600)
    ev=pg.evaluate
    txt=lambda: pg.inner_text('#app')
    async def login(u,wait=900):
      await ev(f"window.__login('{u}')"); await pg.wait_for_timeout(wait)
    # --- شاشة الدخول ---
    t=await txt()
    ok('login_has_sections','قسم البنين' in t and 'قسم البنات' in t and 'دخول المدير العام' in t)
    ok('rtl', await ev("document.documentElement.dir")=='rtl' and await ev("document.documentElement.lang")=='ar')
    ok('login_logos', await ev("[...document.images].filter(i=>/logo-(boys|girls)\\.png/.test(i.src)&&i.naturalWidth>0).length")>=2)
    await ev("pe('boys')"); t=await txt(); ok('boys_roles','مخدوم' in t and 'خادم' in t)
    await ev("pr('member');tg()"); t=await txt(); ok('register_form_notice','موافقة' in t)
    await ev("pe(null)")
    # --- خادم بنين ---
    await login('bs')
    t=await txt(); ok('bs_home','قسم البنين' in t)
    await ev("go('members')"); await pg.wait_for_timeout(300); t=await txt()
    ok('bs_sees_boys_member','مينا' in t); ok('bs_not_girls_member','مريم' not in t); ok('bs_hides_pending_member','بيشوي' not in t)
    await ev("go('sched')"); await pg.wait_for_timeout(300); t=await txt()
    ok('bs_events','اجتماع البنين' in t and 'رحلة مشتركة' in t and 'اجتماع البنات' not in t)
    await ev("go('notifs')"); await pg.wait_for_timeout(300); t=await txt()
    ok('bs_notifs','إشعار للبنين' in t and 'إشعار للبنات' not in t)
    await ev("go('requests')"); await pg.wait_for_timeout(300); t=await txt()
    ok('bs_requests_member_only','بيشوي' in t and 'خادمة جديدة' not in t and 'طلبات الخدام' not in t)
    await ev("rqOk('m','M3')"); await pg.wait_for_timeout(500)
    ok('approve_member', await ev("window.__DB.users.pm.status")=='active' and await ev("window.__DB.members.M3.approved")==True)
    await ev("go('accounts')"); await pg.wait_for_timeout(300); t=await txt()
    ok('bs_accounts_scope','مينا' in t and 'مريم' not in t)
    await ev("go('competitions')"); await pg.wait_for_timeout(300); t=await txt()
    ok('contest_list_scoped','مسابقة الرؤيا' in t and 'مسابقة البنات' not in t)
    ok('contest_link_present', await ev("[...document.querySelectorAll('a')].some(a=>a.href==='https://forms.gle/abc123')"))
    await ev("go('contest','C1')"); await pg.wait_for_timeout(300)
    await ev("document.querySelector('#lp_M1').value='8';lcAward('C1','M1')"); await pg.wait_for_timeout(600)
    ok('contest_score_to_points', await ev("window.__DB.members.M1.points")==15 and await ev("window.__DB.adjustments['lc_C1_M1'].pts")==8)
    await ev("document.querySelector('#lp_M1').value='5';lcAward('C1','M1')"); await pg.wait_for_timeout(600)
    ok('contest_score_correction', await ev("window.__DB.members.M1.points")==12)
    await ev("document.querySelector('#lp_M1').value='99';lcAward('C1','M1')"); await pg.wait_for_timeout(500)
    ok('contest_over_max_rejected', await ev("window.__DB.members.M1.points")==12)
    await ev("go('admin')"); await pg.wait_for_timeout(200); t=await txt(); ok('bs_no_admin_dashboard','للمدير العام فقط' in t)
    await ev("go('set')"); await pg.wait_for_timeout(200); ok('bs_settings_readonly', await ev("document.querySelectorAll('input[disabled]').length")>3)
    await ev("go('chat')"); await pg.wait_for_timeout(300); t=await txt(); ok('bs_chat_rooms','محادثة قسم البنين' in t and 'قسم البنات' not in t.replace('اجتماع الخدام','') )
    await ev("out()"); await pg.wait_for_timeout(600)
    # --- مخدومة بنات ---
    await login('gm')
    ok('gm_home','قسم البنات' in await txt() and await ev("document.body.dataset.sec")=='girls')
    await ev("go('sched')"); await pg.wait_for_timeout(300); t=await txt()
    ok('gm_events','اجتماع البنات' in t and 'رحلة مشتركة' in t and 'اجتماع البنين' not in t)
    await ev("go('notifs')"); await pg.wait_for_timeout(300); t=await txt(); ok('gm_notifs','إشعار للبنات' in t and 'إشعار للبنين' not in t)
    await ev("go('competitions')"); await pg.wait_for_timeout(300); t=await txt(); ok('gm_contests','مسابقة البنات' in t and 'مسابقة الرؤيا' not in t and 'نسخ' in t)
    await ev("go('requests')"); await pg.wait_for_timeout(200); ok('gm_no_requests','للخدام فقط' in await txt())
    await ev("go('accounts')"); await pg.wait_for_timeout(200); ok('gm_no_accounts','للخدام فقط' in await txt())
    await ev("out()"); await pg.wait_for_timeout(600)
    # --- المدير العام ---
    await login('adm')
    t=await txt(); ok('admin_home','لوحة المدير العام' in t and 'أهلاً بالمدير العام' in t)
    await ev("go('members')"); await pg.wait_for_timeout(300); t=await txt(); ok('admin_boys_view','مينا' in t and 'مريم' not in t)
    await ev("back();setW('girls')"); await pg.wait_for_timeout(700); await ev("go('members')"); await pg.wait_for_timeout(300); t=await txt(); ok('admin_girls_view','مريم' in t and 'مينا' not in t)
    await ev("back();setW('all')"); await pg.wait_for_timeout(700); await ev("go('members')"); await pg.wait_for_timeout(300); t=await txt(); ok('admin_all_view','مريم' in t and 'مينا' in t)
    await ev("go('admin')"); await pg.wait_for_timeout(300); t=await txt(); ok('admin_dashboard','قسم البنين' in t and 'قسم البنات' in t)
    await ev("go('requests')"); await pg.wait_for_timeout(300); t=await txt(); ok('admin_sees_servant_requests','خادمة جديدة' in t)
    await ev("rqOk('u','ps')"); await pg.wait_for_timeout(400); ok('approve_servant', await ev("window.__DB.users.ps.status")=='active')
    await ev("go('set')"); await pg.wait_for_timeout(200); ok('admin_settings_editable', await ev("document.querySelectorAll('input[disabled]').length")==0)
    await ev("out()"); await pg.wait_for_timeout(600)
    # --- حالات الحساب ---
    await ev("window.__DB.users.pm.status='pending'"); await login('pm'); t=await txt(); ok('pending_screen','قيد المراجعة' in t)
    await ev("out()"); await pg.wait_for_timeout(600)
    await login('sus',1200); t=await txt(); ok('suspended_blocked','اختر قسمك' in t or 'قسمك' in t)
    await login('bad',1200); t=await txt(); ok('bad_shape_blocked','اختر قسمك' in t or 'قسمك' in t)
    # --- لا علامات قديمة ظاهرة ---
    await ev("window.__login(null)"); await pg.wait_for_timeout(500)
    full=await pg.inner_text('body')+await pg.content()
    ok('no_old_branding', not any(w in full for w in ['كورال','كاراس','Karas','أصواتنا تسبيح']))
    await b.close()
subprocess.Popen([sys.executable,'-m','http.server','8765','-d','/home/claude/work/test/www'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
time.sleep(1.2)
try: asyncio.run(main())
finally: subprocess.run(['pkill','-f','http.server 8765'])
bad=[k for k,v in R.items() if not v]
for k,v in R.items(): print(('PASS ' if v else 'FAIL ')+k)
print('ERRORS:',errs[:8]); print('RESULT:',len(R)-len(bad),'/',len(R),'passed')
sys.exit(1 if bad or errs else 0)
