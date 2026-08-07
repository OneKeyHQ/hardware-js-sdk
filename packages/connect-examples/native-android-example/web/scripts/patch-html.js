const fs = require('fs');
const path = require('path')
const cheerio = require('cheerio');

const html = fs.readFileSync(path.join(__dirname, '../dist/index.html'), 'utf8');

const $ = cheerio.load(html);

$('script[type="module"]').each((index, element) => {
  $(element).removeAttr('type');
});

fs.writeFileSync(path.join(__dirname, '../dist/index.html'), $.html(), 'utf8');

console.log('remove type="module" from script tag done!');
