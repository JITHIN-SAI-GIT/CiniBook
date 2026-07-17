import re

with open('backend/src/main/resources/data.sql', 'r', encoding='utf-8') as f:
    sql = f.read()

# Replace header
sql = sql.replace('show_time, price, rows_count', 'show_time, price_platinum, price_gold, price_silver, rows_count')

# We need to replace patterns like: '10:00:00', 450, 12, 14),
# The price varies. We want to take price P and map it to P, P-100, P-200.
# Example: '10:00:00', 450, 12, 14) -> '10:00:00', 450, 350, 250, 12, 14)

def replacer(m):
    time = m.group(1)
    p = int(m.group(2))
    rows = m.group(3)
    cols = m.group(4)
    # create gold and silver prices
    pg = max(100, p - 100)
    ps = max(50, p - 200)
    return f"{time}, {p}, {pg}, {ps}, {rows}, {cols})"

sql = re.sub(r"('[0-9]{2}:[0-9]{2}:[0-9]{2}'),\s*([0-9]+),\s*([0-9]+),\s*([0-9]+)\)", replacer, sql)

with open('backend/src/main/resources/data.sql', 'w', encoding='utf-8') as f:
    f.write(sql)

print("done updating data.sql for showtimes")
