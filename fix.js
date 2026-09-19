const fs = require("fs");
let content = fs.readFileSync("src/services/agentService.ts", "utf-8");
content = content.replace(/id: TC-\\,/g, "id: `TC-${String(idx + 1).padStart(2, \"0\")}`,\n");
content = content.replace(/\\$\\{API_BASE_URL\\}/g, "${API_BASE_URL}");
content = content.replace(/\\$\\{encodeURIComponent/g, "${encodeURIComponent");
fs.writeFileSync("src/services/agentService.ts", content);

