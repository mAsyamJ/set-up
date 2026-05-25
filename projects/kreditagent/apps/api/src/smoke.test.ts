import { scoreTransactions } from "@kreditagent/shared";
import { demoTransactions } from "./state.js";
const result = scoreTransactions("bor_bu_siti", demoTransactions, 0);
if (!result.evidenceHash.startsWith("0x")) throw new Error("Expected evidence hash");
console.log("smoke ok", result.score, result.band);
