import fs from 'fs';
let code = fs.readFileSync('src/views/PaydaysView.tsx', 'utf8');

const target = `  React.useEffect(() => {
    if (summaries.length > 0 && !expandedId) {
      const current = summaries[0]?.payday?.id || summaries[0]?.payday?.date;
      if (current) {
        setExpandedId(current);
      }
    }
  }, [summaries, expandedId]);`;

const replacement = `  const hasAutoExpanded = React.useRef(false);
  React.useEffect(() => {
    if (summaries.length > 0 && !hasAutoExpanded.current) {
      const current = summaries[0]?.payday?.id || summaries[0]?.payday?.date;
      if (current) {
        setExpandedId(current);
        hasAutoExpanded.current = true;
      }
    }
  }, [summaries]);`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/views/PaydaysView.tsx', code);
  console.log("Patched successfully");
} else {
  console.log("Target not found");
}
