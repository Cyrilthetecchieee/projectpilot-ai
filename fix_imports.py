with open('src/components/IssueAnalysisResult.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace("import { Check, Plus } from 'lucide-react'", "import { Plus } from 'lucide-react'")
with open('src/components/IssueAnalysisResult.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

with open('src/components/ReportIssueModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace("import { X, Image as ImageIcon, UploadCloud, RefreshCw } from 'lucide-react'", "import { X, UploadCloud, RefreshCw } from 'lucide-react'")
with open('src/components/ReportIssueModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
