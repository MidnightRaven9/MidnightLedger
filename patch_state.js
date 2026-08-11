import fs from 'fs';
let code = fs.readFileSync('src/views/DashboardView.tsx', 'utf8');

code = code.replace(
  '  const [editItemsDate, setEditItemsDate] = useState<string | null>(null);',
  '  const [editItemsDate, setEditItemsDate] = useState<string | null>(null);\n  const [showCategoryList, setShowCategoryList] = useState(false);\n  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});'
);

fs.writeFileSync('src/views/DashboardView.tsx', code);
console.log("Patched state");
