with open('app/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

if "import os" not in content:
    content = "import os\n" + content

with open('app/main.py', 'w', encoding='utf-8') as f:
    f.write(content)
