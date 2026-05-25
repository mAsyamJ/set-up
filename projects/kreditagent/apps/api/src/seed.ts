import { scoreTransactions } from "@kreditagent/shared";
import { demoTransactions, state } from "./state.js";
const score = scoreTransactions("bor_bu_siti", demoTransactions, state.repaymentCount);
console.log(JSON.stringify(score, null, 2));
