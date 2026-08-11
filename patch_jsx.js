import fs from 'fs';
let code = fs.readFileSync('src/views/DashboardView.tsx', 'utf8');

const targetStr = `        <div>
          <span style={{ fontSize: '12px', letterSpacing: '0.08em', fontWeight: 700, color: '#6b7280', margin: '16px 0 12px', textTransform: 'uppercase', display: 'block' }}>
            CATEGORY ALLOCATION LIST
          </span>
          <div>
            {categoriesList.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">No spending in this period.</p>
            ) : (
              categoriesList.map(cat => (
                <div 
                  key={cat.name} 
                  style={{ padding: '16px', borderRadius: '16px', background: '#1e1e1e', border: '1px solid #2a2a2a', marginBottom: '10px', minHeight: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: cat.color, flexShrink: 0 }} />
                    <div>
                      <span style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff', display: 'block' }}>{cat.name}</span>
                      <span style={{ fontSize: '13px', color: '#9ca3af', marginTop: '2px', display: 'block' }}>
                        {cat.subtitle} ({cat.percentage}%)
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', display: 'block' }}>{formatCurrency(cat.amount)}</span>
                    {cat.fullAmount > cat.amount && (
                      <span style={{ fontSize: '13px', color: '#9ca3af', marginTop: '2px', display: 'block' }}>(Full {formatCurrency(cat.fullAmount)})</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>`;

const replacement = `        <div className="category-allocation-dropdown">
          <button 
            className="w-full flex items-center justify-between cursor-pointer focus:outline-none bg-transparent border-none p-0" 
            onClick={() => setShowCategoryList(!showCategoryList)}
            style={{ margin: '16px 0 12px' }}
          >
            <span style={{ fontSize: '12px', letterSpacing: '0.08em', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>
              CATEGORY ALLOCATION LIST ({categoriesList.length}) - Total {formatCurrency(totalPeriodAmount)}
            </span>
            <span className="text-zinc-500" style={{ fontSize: '12px' }}>{showCategoryList ? '▲' : '▼'}</span>
          </button>

          {showCategoryList && (
            <div>
              {categoriesList.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">No spending in this period.</p>
              ) : (
                categoriesList.map(cat => (
                  <div 
                    key={cat.name} 
                    className="mb-2.5 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] overflow-hidden"
                  >
                    <div 
                      onClick={() => setExpandedCategories(prev => ({ ...prev, [cat.name]: !prev[cat.name] }))}
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#222222] transition-colors"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: cat.color, flexShrink: 0 }} />
                        <div>
                          <span style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff', display: 'block' }}>{cat.name}</span>
                          <span style={{ fontSize: '13px', color: '#9ca3af', marginTop: '2px', display: 'block' }}>
                            {cat.subtitle} ({cat.percentage}%)
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-right">
                        <div>
                          <span style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', display: 'block' }}>{formatCurrency(cat.amount)}</span>
                          {cat.fullAmount > cat.amount && (
                            <span style={{ fontSize: '13px', color: '#9ca3af', marginTop: '2px', display: 'block' }}>(Full {formatCurrency(cat.fullAmount)})</span>
                          )}
                        </div>
                        <div className="text-zinc-500 text-[10px]">
                          {expandedCategories[cat.name] ? '▼' : '▶'}
                        </div>
                      </div>
                    </div>

                    {expandedCategories[cat.name] && (
                      <div className="px-4 pb-4 pt-1">
                        <div className="pl-4 border-l border-zinc-800 space-y-2.5 mt-2">
                          {cat.items.map((item: any, idx: number) => (
                            <div key={\`\${item.id}-\${idx}\`} className="flex justify-between items-center text-[13px]">
                              <span className="text-zinc-300">{item.emoji || ''} {item.name}</span>
                              <span className="text-zinc-400 font-medium">{formatCurrency(item.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacement);
  fs.writeFileSync('src/views/DashboardView.tsx', code);
  console.log("Patched JSX successfully");
} else {
  console.log("JSX target not found");
}
