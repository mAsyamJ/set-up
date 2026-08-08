import { fixedPrincipal } from "../../../../../core/auth/principal.js";
import { startHarnessMcp } from "../server-factory.js";

startHarnessMcp({ mode: "cursor", principal: fixedPrincipal("cursor") }).catch((error) => {
  console.error(error);
  process.exit(1);
});
