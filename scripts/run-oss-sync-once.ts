import { syncService } from "../src/lib/services/sync.service";
async function main() {
  const r = await syncService.syncFromOSS();
  console.log(JSON.stringify(r, null, 2));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
