import fs from 'fs';

function run() {
  const content = fs.readFileSync('scratch/posoco_menu_content.json', 'utf-8');
  const data = JSON.parse(content);
  console.log("Structure of first menu item:", JSON.stringify(data.retData[0], null, 2));
  
  // Let's print all titles and keys
  console.log("\nAll Menu Titles:");
  data.retData.forEach((item, i) => {
    console.log(`[${i+1}] Title: "${item.Title_}" | Title_hi: "${item.Title_hi}" | MenuCode: "${item.MenuCode}" | UIType: "${item.UIType}" | ParentCode: "${item.ParentCode}"`);
    if (item.ChildMenu && item.ChildMenu.length > 0) {
      item.ChildMenu.forEach((child, j) => {
        console.log(`   └─ [${i+1}.${j+1}] Title: "${child.Title_}" | MenuCode: "${child.MenuCode}" | UIType: "${child.UIType}" | ParentCode: "${child.ParentCode}"`);
        if (child.ChildMenu && child.ChildMenu.length > 0) {
          child.ChildMenu.forEach((gchild, k) => {
            console.log(`      └─ [${i+1}.${j+1}.${k+1}] Title: "${gchild.Title_}" | MenuCode: "${gchild.MenuCode}" | UIType: "${gchild.UIType}" | ParentCode: "${gchild.ParentCode}"`);
          });
        }
      });
    }
  });
}

run();
