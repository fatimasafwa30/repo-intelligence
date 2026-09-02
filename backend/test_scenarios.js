import { buildDocumentationAudit } from './services/evidenceEngine.js';

console.log("=== SCENARIO A: Correct README (React) ===");
const claimsA = [{ claim: "Uses React", category: "Frontend", subject: "React" }];
const techsA = [{ name: "React", category: "frontend" }];
const packageA = { dependencies: { "react": "^18.0.0" } };
const keyFilesA = [{ path: "src/App.jsx", content: "import React from 'react';" }];
const resultA = buildDocumentationAudit("Uses React", techsA, ["src/App.jsx"], keyFilesA, packageA, claimsA);
console.log(resultA.map(r => `[${r.verdict}] ${r.subject} -> ${r.interpretation}`));


console.log("\n=== SCENARIO B: Insufficient Evidence (Node 18+) ===");
const claimsB = [{ claim: "Requires Node.js 18+", category: "Runtime", subject: "Node.js" }];
const resultB = buildDocumentationAudit("Requires Node.js 18+", [], [], [], {}, claimsB);
console.log(resultB.map(r => `[${r.verdict}] ${r.subject} -> ${r.interpretation}`));


console.log("\n=== SCENARIO C: Genuine Contradiction (MongoDB vs Supabase) ===");
const claimsC = [{ claim: "Uses MongoDB", category: "Database", subject: "MongoDB" }];
const techsC = [{ name: "Supabase", category: "database" }]; 
const packageC = { dependencies: { "@supabase/supabase-js": "^2.0.0" } };
const keyFilesC = [{ path: "src/db.js", content: "import { createClient } from '@supabase/supabase-js';" }];
const resultC = buildDocumentationAudit("Uses MongoDB", techsC, ["src/db.js"], keyFilesC, packageC, claimsC);
console.log(resultC.map(r => `[${r.verdict}] ${r.subject} -> ${r.summary} | ${r.interpretation}`));
