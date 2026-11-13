// Verify the real local workbench using the project's existing dedicated browser.
import {chromium,expect} from '@playwright/test';
import {ensureChrome} from '../server/chrome-cdp.mjs';
const ep=await ensureChrome();
try{
 const browser=await chromium.connectOverCDP(ep.ws),context=browser.contexts()[0];
 const page=context.pages().find(p=>{try{const u=new URL(p.url());return ['localhost','127.0.0.1'].includes(u.hostname)&&u.port==='4318'}catch{return false}})||await context.newPage();
 await page.setViewportSize({width:1440,height:1050});await page.goto('http://localhost:4318/');await page.getByLabel('选择工作空间').selectOption('personal');await page.getByRole('navigation').getByRole('button',{name:'发现机会',exact:true}).click();await page.getByRole('button',{name:/^采集岗位/}).click();await page.getByRole('checkbox',{name:'查看全部',exact:true}).check();await page.getByLabel('采集岗位来源').selectOption({label:'BOSS直聘 · Chrome'});
 if(await page.getByRole('button',{name:'再看 24 个岗位',exact:false}).isVisible())await page.getByRole('button',{name:'再看 24 个岗位',exact:false}).click();
 const count=await page.locator('.discovered-card').count();expect(count).toBeGreaterThanOrEqual(1);expect(await page.locator('.discovered-card').filter({hasText:'薪资未标注'}).count()).toBe(0);
 await page.locator('.discovery-results-heading').evaluate(el=>el.scrollIntoView({block:'start'}));await page.evaluate(()=>window.scrollBy(0,-85));await page.screenshot({path:'artifacts/boss-chrome-live-workbench.png',fullPage:false,animations:'disabled'});await page.locator('.discovered-card .job-title').first().click();await expect(page.getByText('Chrome 已登录页面快照',{exact:true})).toBeVisible();await page.screenshot({path:'artifacts/boss-chrome-live-detail.png',fullPage:false,animations:'disabled'});await page.getByLabel('关闭采集岗位详情').click();await page.bringToFront();console.log(JSON.stringify({ui:'real local workbench with actual BOSS data',visibleJobCards:count,detailPanel:'Chrome source evidence visible'}));
 // Close this inspector process only; keep the user's dedicated browser open.
 process.exit(0);
}catch(e){console.error(e.message);process.exit(1)}
