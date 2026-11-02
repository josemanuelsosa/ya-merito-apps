// Convierte tus certificados PEM de Apple a base64 para pegarlos en .env.local / Vercel.
// Uso: npm run certs:base64 -- certs/wwdr.pem certs/signerCert.pem certs/signerKey.pem
import { readFileSync } from "node:fs";

const [wwdr, cert, key] = process.argv.slice(2);
if (!wwdr || !cert || !key) {
  console.error("Uso: npm run certs:base64 -- <wwdr.pem> <signerCert.pem> <signerKey.pem>");
  process.exit(1);
}
const b64 = (p) => readFileSync(p).toString("base64");
console.log(`APPLE_WWDR_CERT_BASE64=${b64(wwdr)}`);
console.log(`APPLE_SIGNER_CERT_BASE64=${b64(cert)}`);
console.log(`APPLE_SIGNER_KEY_BASE64=${b64(key)}`);
