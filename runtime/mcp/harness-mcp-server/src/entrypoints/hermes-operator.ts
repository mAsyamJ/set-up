import { fixedPrincipal } from "../../../../../core/auth/principal.js";
import { startHarnessMcp } from "../server-factory.js";

startHarnessMcp({
  mode: "hermes-operator",
  principal: fixedPrincipal("hermes-operator"),
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
