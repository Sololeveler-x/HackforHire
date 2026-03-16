const fs = require('fs');
const parts = ['sd_p1.txt','sd_p2.txt','sd_p3.txt','sd_p4.txt','sd_p5.txt','sd_p6.txt','sd_p7.txt','sd_p8.txt','sd_p9.txt'];
const base = 'sgb-order-hub-c9cf5da2-main/';
const content = parts.map(p => fs.readFileSync(base + p, 'utf8')).join('');
fs.writeFileSync(base + 'src/pages/ShippingDashboard.tsx', content, 'utf8');
parts.forEach(p => fs.unlinkSync(base + p));
console.log('Done. Lines:', content.split('\n').length);
