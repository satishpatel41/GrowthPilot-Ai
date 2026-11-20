const { chromium } = require('playwright');
const assert = require('assert');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const stamp = Date.now();
  const email = `demo${stamp}@example.com`;
  const phone = `9${String(stamp).slice(-9)}`;
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('http://localhost:3000/register');
  await page.fill('input[name=name]', 'Demo Owner');
  await page.fill('input[name=email]', email);
  await page.fill('input[name=phone]', phone);
  await page.fill('input[name=password]', 'Passw0rdOK');
  await page.click('button[type=submit]');
  await page.waitForURL('**/verify');
  const code = (await page.locator('strong.tracking-widest').innerText()).trim();
  assert.match(code, /^\d{6}$/);
  await page.fill('input[name=code]', code === '000000' ? '111111' : '000000');
  await page.click('button[type=submit]');
  await page.getByText('That code is not correct').waitFor();
  await page.fill('input[name=code]', code);
  await page.click('button[type=submit]');
  await page.waitForURL('**/onboarding');

  // step 1
  await page.fill('input[name=name]', 'Demo Textiles');
  await page.selectOption('select[name=category]', 'retail');
  await page.fill('input[name=industry]', 'Textiles');
  await page.fill('textarea[name=description]', 'Fabric and clothing store');
  await page.getByRole('button', { name: 'Save and continue' }).click();
  // step 2
  await page.getByRole('heading', { name: 'Brand and voice' }).waitFor();
  await page.getByRole('radio', { name: 'ગુજરાતી' }).click();
  await page.getByRole('button', { name: 'Save and continue' }).click();
  // step 3
  await page.getByRole('heading', { name: 'Marketing goals' }).waitFor();
  await page.getByText('Get more leads').click();
  await page.fill('input[name=targetAudience]', 'Families');
  await page.fill('input[name=targetLocation]', 'Surat');
  await page.getByRole('button', { name: 'Save and continue' }).click();
  // step 4
  await page.getByRole('heading', { name: 'Business locations' }).waitFor();
  await page.fill('input[name=name]', 'Main store');
  await page.fill('input[name=city]', 'Surat');
  await page.getByRole('button', { name: 'Add location' }).click();
  await page.getByText('Main store').first().waitFor();
  await page.getByRole('button', { name: 'Continue' }).click();
  // review
  await page.getByRole('heading', { name: 'Review and finish' }).waitFor();
  await page.getByRole('button', { name: 'Finish setup' }).click();
  await page.waitForURL('**/dashboard');
  await page.getByRole('heading', { name: 'Demo Textiles' }).waitFor();
  console.log('customer flow ok');

  // reload keeps session
  await page.reload();
  await page.getByRole('heading', { name: 'Demo Textiles' }).waitFor();
  await page.getByRole('button', { name: 'Log out' }).click();
  await page.waitForURL('**/login');

  // customer cannot enter admin
  await page.fill('input[name=email]', email);
  await page.fill('input[name=password]', 'Passw0rdOK');
  await page.click('button[type=submit]');
  await page.waitForURL('**/dashboard');
  await page.goto('http://localhost:3000/admin');
  await page.waitForURL('**/dashboard');
  await page.getByRole('button', { name: 'Log out' }).click();
  await page.waitForURL('**/login');

  // wrong password message
  await page.fill('input[name=email]', 'admin@example.com');
  await page.fill('input[name=password]', 'nope');
  await page.click('button[type=submit]');
  await page.getByText('Incorrect email or password').waitFor();

  // admin
  const env = require('fs').readFileSync(require('path').join(__dirname, '../apps/api/.env') , 'utf8');
  const pw = env.match(/SEED_ADMIN_PASSWORD=(.*)/)[1].trim();
  await page.fill('input[name=password]', pw);
  await page.click('button[type=submit]');
  await page.waitForURL('**/admin');
  await page.getByRole('heading', { name: 'Agency dashboard' }).waitFor();
  await page.getByText('Total customers').waitFor();
  await page.getByRole('link', { name: 'Customers' }).click();
  await page.fill('input[aria-label="Search customers"]', 'Demo Textiles');
  await page.getByRole('link', { name: 'Demo Textiles' }).waitFor();
  await page.getByRole('link', { name: 'Demo Textiles' }).click();
  await page.getByRole('button', { name: 'Suspend customer' }).waitFor();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Suspend customer' }).click();
  await page.getByText('Customer suspended.').waitFor();
  await page.getByRole('button', { name: 'Restore customer' }).click();
  await page.getByText('Customer restored.').waitFor();
  await page.getByRole('link', { name: 'Team' }).click();
  await page.fill('input[name=name]', 'Priya Staff');
  await page.fill('input[name=email]', `priya${stamp}@example.com`);
  await page.fill('input[name=password]', 'StaffPassw0rd');
  await page.getByRole('button', { name: 'Add member' }).click();
  await page.getByText('Priya Staff').waitFor();
  await page.getByRole('link', { name: 'Audit logs' }).click();
  await page.getByText('customer.registered').first().waitFor();
  console.log('admin flow ok');
  assert.deepStrictEqual(errors, []);
  await browser.close();
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
