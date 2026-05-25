import { scoreTransactions } from "./scoring.js";
import { syntheticBuSitiTransactions } from "./fixtures.js";

const score = scoreTransactions("bor_bu_siti", syntheticBuSitiTransactions(), 1);
console.log(JSON.stringify(score, null, 2));
if (score.score < 650 || score.score > 850) {
  throw new Error(`Unexpected score ${score.score}`);
}
if (!score.features.warnings.length) {
  throw new Error("Expected sanitizer warning for adversarial row");
}
