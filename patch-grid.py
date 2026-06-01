# -*- coding: utf-8 -*-
with open('src/index.css', 'r', encoding='utf-8') as f:
    content = f.read()

marker = 'Batman Dark Knight Design System'
parts = content.split(marker)
if len(parts) >= 2:
    old_css = parts[0]
    new_css = marker + parts[1]
    
    # Add overflow-y: auto to .cs-clips-grid
    target_grid = '.cs-clips-grid {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 10px;\n  padding: 8px 14px 14px;\n  flex: 1;\n}'
    replacement_grid = '.cs-clips-grid {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  grid-auto-rows: max-content;\n  align-content: start;\n  gap: 10px;\n  padding: 8px 14px 14px;\n  flex: 1;\n  overflow-y: auto;\n}'
    
    if target_grid in new_css:
        new_css = new_css.replace(target_grid, replacement_grid)
        with open('src/index.css', 'w', encoding='utf-8') as f:
            f.write(old_css + new_css)
        print('Grid patched successfully!')
    else:
        print('Target grid CSS not found exactly as expected. Let me try regex.')
        import re
        new_css = re.sub(
            r'(\.cs-clips-grid\s*\{[^}]*?)(flex:\s*1;)',
            r'\1\2\n  overflow-y: auto;\n  align-content: start;\n  grid-auto-rows: max-content;',
            new_css
        )
        with open('src/index.css', 'w', encoding='utf-8') as f:
            f.write(old_css + new_css)
        print('Grid patched with regex!')
else:
    print('Marker not found!')
