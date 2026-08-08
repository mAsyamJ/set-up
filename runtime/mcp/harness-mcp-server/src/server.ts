import { fixedPrincipal } from "../../../../core/auth/principal.js";
import { startHarnessMcp } from "./server-factory.js";

startHarnessMcp({ mode: "audit", principal: fixedPrincipal("audit") }).catch((error) => {
  console.error(error);
  process.exit(1);
});
