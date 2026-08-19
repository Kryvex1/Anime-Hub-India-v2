// Obfuscated cryptographic security gateway for Admin Control Center

const VAULT_SALT = "cineanime_super_admin_vault_x92";

// Cryptographic hash helper using native Web Crypto API
async function sha256Hex(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Obfuscated signature verification table (multi-layer byte encoding)
const _0x4f12 = [
  0x75,
  0x6d,
  0x61,
  0x6e,
  0x67, // 'umang'
];
const _0x8b39 = [
  0x31,
  0x39,
  0x31,
  0x32,
  0x31,
  0x30, // '191210'
];

function decodeToken(bytes: number[]): string {
  return String.fromCharCode(...bytes);
}

const STORAGE_KEY = "ca_admin_session_sig";

export async function verifyAdminCredentials(user: string, pass: string): Promise<boolean> {
  if (!user || !pass) return false;

  const cleanUser = user.trim().toLowerCase().replace(/^@/, "");
  const cleanPass = pass.trim();

  const targetUser = decodeToken(_0x4f12);
  const targetPass = decodeToken(_0x8b39);

  // Compute cryptographic comparison
  const inputSig = await sha256Hex(`${cleanUser}:${cleanPass}:${VAULT_SALT}`);
  const targetSig = await sha256Hex(`${targetUser}:${targetPass}:${VAULT_SALT}`);

  if (inputSig === targetSig) {
    // Generate authorized session token
    const sessionToken = await sha256Hex(`${targetUser}:${Date.now()}:${VAULT_SALT}`);
    try {
      localStorage.setItem(STORAGE_KEY, sessionToken);
      sessionStorage.setItem(STORAGE_KEY, sessionToken);
      localStorage.setItem("ca_admin_user", "@Umang");
    } catch {
      /* ignore */
    }
    return true;
  }

  return false;
}

export function checkAdminSession(): boolean {
  try {
    const token = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
    return Boolean(token && token.length === 64);
  } catch {
    return false;
  }
}

export function clearAdminSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("ca_admin_user");
  } catch {
    /* ignore */
  }
}

export function getAdminDisplayName(): string {
  try {
    return localStorage.getItem("ca_admin_user") || "@Umang";
  } catch {
    return "@Umang";
  }
}
