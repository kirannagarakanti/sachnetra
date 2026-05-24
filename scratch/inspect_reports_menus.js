import fs from 'fs';

function run() {
  const content = fs.readFileSync('scratch/posoco_menu_content.json', 'utf-8');
  const data = JSON.parse(content);
  
  const reportParents = ['REPORTS_01', 'REPORTS_02', 'REPORTS_03', 'REPORTS_04'];
  reportParents.forEach(code => {
    const item = data.retData.find(d => d.ParentCode === code);
    if (item) {
      console.log(`\n======================================`);
      console.log(`ParentCode: ${code}`);
      console.log(`======================================`);
      console.log(item.MenuContent);
    }
  });
}

run();
