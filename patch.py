# -*- coding: utf-8 -*-
import re
with open('src/index.css', 'r', encoding='utf-8') as f:
    content = f.read()

marker = 'Batman Dark Knight Design System'
parts = content.split(marker)
if len(parts) >= 2:
    old_css = parts[0]
    new_css = marker + parts[1]
    
    new_css = new_css.replace('.cs-page', '.cs-creator-page')
    new_css = new_css.replace('.cs-workspace', '.cs-creator-workspace')
    new_css = new_css.replace('align-items: start;', 'align-items: stretch;\n  height: calc(100vh - var(--nav-height) - 80px);\n  min-height: 600px;')
    new_css = new_css.replace('min-height: 500px;', '')
    new_css = new_css.replace('max-height: calc(100vh - var(--nav-height) - 140px);', 'max-height: 100%;')
    
    with open('src/index.css', 'w', encoding='utf-8') as f:
        f.write(old_css + new_css)
    print('Patched successfully!')
else:
    print('Marker not found!')
