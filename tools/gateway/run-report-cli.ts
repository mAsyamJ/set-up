#!/usr/bin/env node
import path from "node:path";
import { renderRunReport } from "../../core/observability/run-report.js";

const projectRoot = path.resolve(process.argv[2] ?? ".");
const runId = process.argv[3];
console.log(renderRunReport(projectRoot, runId));
