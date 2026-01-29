import "dotenv/config";
import { app } from "./app";
import { startExportWorker } from "./utils/exportQueue";
import { startRetentionJob } from "./utils/retention";

const PORT = process.env.PORT || 8787;

app.listen(PORT, () => {
  console.log(`PhishGuard-ET API running on http://localhost:${PORT}`);
  startExportWorker();
  startRetentionJob();
});
