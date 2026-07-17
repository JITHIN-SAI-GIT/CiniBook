import re
import os

filepath = r'backend\src\main\resources\data.sql'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the header
content = content.replace('cast_list, is_trending', 'is_trending')

# Replace the data lines using regex
# Look for pattern: , '["..."]', true)
content = re.sub(r",\n?'\[.*?\]',\s*(true|false)\)", r", \1)", content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("done")
