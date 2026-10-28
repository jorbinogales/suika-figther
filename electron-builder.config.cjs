// electron-builder config (npm run desktop:dist). Unsigned by default; signing is added only when its env vars exist. See DEPLOY.md "Firmar el instalador".
const e = process.env;
const win = { target: [{ target: 'nsis', arch: ['x64'] }] };

if (e.SUIKA_AZURE_ENDPOINT && e.SUIKA_AZURE_ACCOUNT && e.SUIKA_AZURE_PROFILE && e.SUIKA_AZURE_PUBLISHER) {
  // Azure Trusted Signing; credentials come from AZURE_TENANT_ID / AZURE_CLIENT_ID / AZURE_CLIENT_SECRET (read by the signer)
  win.azureSignOptions = { endpoint: e.SUIKA_AZURE_ENDPOINT, codeSigningAccountName: e.SUIKA_AZURE_ACCOUNT, certificateProfileName: e.SUIKA_AZURE_PROFILE, publisherName: e.SUIKA_AZURE_PUBLISHER };
} else if (e.SUIKA_SIGN_SHA1 || e.SUIKA_SIGN_SUBJECT) {
  // certificate (e.g. USB/EV token) installed in the Windows certificate store, signed with signtool
  win.signtoolOptions = { ...(e.SUIKA_SIGN_SHA1 ? { certificateSha1: e.SUIKA_SIGN_SHA1 } : { certificateSubjectName: e.SUIKA_SIGN_SUBJECT }), rfc3161TimeStampServer: e.SUIKA_TIMESTAMP_URL || 'http://timestamp.digicert.com', signingHashAlgorithms: ['sha256'] };
}
// otherwise: a .pfx via CSC_LINK + CSC_KEY_PASSWORD is picked up by electron-builder itself; with none of them the installer is unsigned

module.exports = {
  appId: 've.com.hayai.suikafigther',
  productName: 'Suika Figther',
  directories: { output: 'release' },
  // only the launcher shell: the game itself is downloaded at run time (no dist/, art/, server code or screenshots)
  files: ['desktop/**/*', '!desktop/test-*', 'package.json', '!node_modules/**', 'node_modules/ws/**/*', '!**/*.{md,map,ts}'],
  asar: true,
  npmRebuild: false,   // no native modules ship in the launcher (better-sqlite3 is server-only)
  win,
  nsis: { oneClick: false, allowToChangeInstallationDirectory: true, perMachine: false },
};
