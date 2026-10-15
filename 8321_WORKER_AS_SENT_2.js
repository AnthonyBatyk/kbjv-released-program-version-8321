const PASSWORD_ITERATIONS = 100000;
const MAX_PBKDF2_ITERATIONS = 100000;
const MAX_PASSWORD_LENGTH = 128;
const MAX_SYNC_BYTES = 12 * 1024 * 1024;
const SNAPSHOT_CHUNK_BYTES = 512 * 1024;
const MAX_DEFAULT_JSON_BYTES = 512 * 1024;
const MAX_SYNC_REQUEST_BYTES = 16 * 1024 * 1024;
const LOGIN_RATE_LIMIT_ATTEMPTS = 8;
const LOGIN_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const SESSION_HOURS = 12;
const REMEMBER_DAYS = 30;
const MAX_AUDIT_MESSAGE = 1000;
const MAX_AUDIT_METADATA = 6000;
const RECOVERY_REQUEST_RETENTION = 100;
const MAX_PENDING_RECOVERY_REQUESTS = 250;
const AUDIT_WINDOW_MS = 10 * 60 * 1000;
const ADMIN_DELETE_CONFIRMATION_CODE = "8321";
// v92/8321 test environment: owner-authorized account deletion requires confirmation code 8321.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      if (url.pathname === "/health" && request.method === "GET") {
        return reply({
          ok: true,
          service: "kbjv-auth-api-dev",
          version: 95,
          password_iterations: PASSWORD_ITERATIONS,
          recovery_request_retention: RECOVERY_REQUEST_RETENTION,
          owner_recovery_configured: Boolean(String(env.OWNER_RECOVERY_PASSWORD || env.ADMIN_ACCESS_CODE || "").trim())
        }, 200, cors);
      }

      if (url.pathname === "/public/recovery-contact" && request.method === "GET") {
        return reply({
          ok: true,
          telegram: String(env.OWNER_TELEGRAM || "").trim(),
          phone: String(env.OWNER_PHONE || "").trim()
        }, 200, cors);
      }

      await ensureSchema(env);

      const needsRecoveryRequestSchema =
        url.pathname === "/auth/recovery/request" ||
        url.pathname.startsWith("/admin/recovery-requests");

      if (needsRecoveryRequestSchema) {
        await ensureRecoveryRequestSchema(env);
      }

      if (url.pathname === "/auth/register" && request.method === "POST") {
        return await register(request, env, cors);
      }

      if (url.pathname === "/auth/login" && request.method === "POST") {
        return await login(request, env, cors);
      }

      if (url.pathname === "/auth/recovery/request" && request.method === "POST") {
        return await requestOwnerRecovery(request, env, cors);
      }

      if (url.pathname === "/auth/me" && request.method === "GET") {
        const session = await requireSession(request, env);
        return reply({ ok: true, user: await publicUser(env, session) }, 200, cors);
      }

      if (url.pathname === "/auth/logout" && request.method === "POST") {
        return await logout(request, env, cors);
      }

      if (url.pathname === "/auth/account" && request.method === "DELETE") {
        return await deleteAccount(request, env, cors);
      }

      if (url.pathname === "/audit/action" && request.method === "POST") {
        return await auditAction(request, env, cors);
      }

      if (url.pathname === "/audit/batch" && request.method === "POST") {
        return await auditBatch(request, env, cors);
      }

      if (url.pathname === "/audit/state" && request.method === "POST") {
        return await auditState(request, env, cors);
      }

      // v95 DEV only: isolated training plan and PDF synchronisation.
      if (url.pathname.startsWith("/training/")) {
        return await trainingRoute(request, url, env, cors);
      }

      if (url.pathname === "/sync/state" && request.method === "GET") {
        return await syncStateGet(request, env, cors);
      }

      if (url.pathname === "/sync/state" && request.method === "POST") {
        return await syncStatePost(request, env, cors);
      }

      if (url.pathname === "/admin/recovery-requests" && request.method === "GET") {
        return await adminRecoveryRequests(request, url, env, cors);
      }

      let recoveryMatch = url.pathname.match(/^\/admin\/recovery-requests\/(\d+)\/reset$/);
      if (recoveryMatch && request.method === "POST") {
        return await adminResetRecoveryRequest(request, Number(recoveryMatch[1]), env, cors);
      }

      recoveryMatch = url.pathname.match(/^\/admin\/recovery-requests\/(\d+)\/reject$/);
      if (recoveryMatch && request.method === "POST") {
        return await adminRejectRecoveryRequest(request, Number(recoveryMatch[1]), env, cors);
      }

      if (url.pathname === "/admin/audit" && request.method === "GET") {
        return await adminAudit(request, url, env, cors);
      }

      if (url.pathname === "/admin/users" && request.method === "GET") {
        return await adminUsers(request, env, cors);
      }

      let match = url.pathname.match(/^\/admin\/users\/(\d+)\/avatar$/);
      if (match && request.method === "GET") {
        return await adminUserAvatar(request, Number(match[1]), env, cors);
      }

      match = url.pathname.match(/^\/admin\/users\/(\d+)\/logins$/);
      if (match && request.method === "GET") {
        return await adminUserLogins(request, Number(match[1]), url, env, cors);
      }

      match = url.pathname.match(/^\/admin\/users\/(\d+)\/activity$/);
      if (match && request.method === "GET") {
        return await adminUserActivity(request, Number(match[1]), url, env, cors);
      }

      match = url.pathname.match(/^\/admin\/users\/(\d+)\/export-meta$/);
      if (match && request.method === "GET") {
        return await adminUserExportMeta(request, Number(match[1]), env, cors);
      }

      match = url.pathname.match(/^\/admin\/users\/(\d+)\/role$/);
      if (match && request.method === "PATCH") {
        return await adminChangeRole(request, Number(match[1]), env, cors);
      }

      match = url.pathname.match(/^\/admin\/users\/(\d+)$/);
      if (match && request.method === "DELETE") {
        return await adminDeleteUser(request, Number(match[1]), env, cors);
      }

      return reply({ ok: false, error: "\u041c\u0430\u0440\u0448\u0440\u0443\u0442 \u043d\u0435 \u0437\u043d\u0430\u0439\u0434\u0435\u043d\u043e." }, 404, cors);
    } catch (error) {
      if (error instanceof HttpError) {
        return reply({ ok: false, error: error.message }, error.status, cors);
      }

      console.error(error);

      return reply({
        ok: false,
        error: "\u0412\u043d\u0443\u0442\u0440\u0456\u0448\u043d\u044f \u043f\u043e\u043c\u0438\u043b\u043a\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430."
      }, 500, cors);
    }
  }
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

let schemaPromise = null;

async function ensureSchema(env) {
  if (schemaPromise) return schemaPromise;

  schemaPromise = (async () => {
    await env.DB.batch([
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL,
          username_norm TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          password_salt TEXT NOT NULL,
          password_iterations INTEGER NOT NULL,
          role TEXT NOT NULL DEFAULT 'member',
          created_at TEXT NOT NULL,
          last_login_at TEXT,
          last_seen_at TEXT
        )
      `),

      env.DB.prepare(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_norm
        ON users(username_norm)
      `),

      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          token_hash TEXT NOT NULL UNIQUE,
          created_at TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          remember_me INTEGER NOT NULL DEFAULT 0
        )
      `),

      env.DB.prepare(`
        CREATE INDEX IF NOT EXISTS idx_sessions_user_id
        ON sessions(user_id)
      `),

      env.DB.prepare(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_token_hash
        ON sessions(token_hash)
      `),

      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS login_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          login_at TEXT NOT NULL
        )
      `),

      env.DB.prepare(`
        CREATE INDEX IF NOT EXISTS idx_login_events_user_id
        ON login_events(user_id)
      `),

      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS user_audit_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          username TEXT NOT NULL,
          event_type TEXT NOT NULL,
          message TEXT NOT NULL,
          metadata TEXT,
          created_at TEXT NOT NULL
        )
      `),

      env.DB.prepare(`
        CREATE INDEX IF NOT EXISTS idx_user_audit_created_at
        ON user_audit_events(created_at)
      `),

      env.DB.prepare(`
        CREATE INDEX IF NOT EXISTS idx_user_audit_user_id
        ON user_audit_events(user_id)
      `),

      env.DB.prepare(`
        CREATE INDEX IF NOT EXISTS idx_user_audit_event_type
        ON user_audit_events(event_type)
      `),

      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS user_state_snapshots (
          user_id INTEGER PRIMARY KEY,
          snapshot TEXT NOT NULL DEFAULT '',
          updated_at TEXT NOT NULL,
          revision INTEGER NOT NULL DEFAULT 0,
          snapshot_key TEXT,
          chunk_count INTEGER NOT NULL DEFAULT 0,
          byte_size INTEGER NOT NULL DEFAULT 0
        )
      `),

      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS user_state_snapshot_chunks (
          user_id INTEGER NOT NULL,
          snapshot_key TEXT NOT NULL,
          chunk_index INTEGER NOT NULL,
          chunk TEXT NOT NULL,
          created_at TEXT,
          PRIMARY KEY (user_id, snapshot_key, chunk_index)
        )
      `),

      env.DB.prepare(`
        CREATE INDEX IF NOT EXISTS idx_state_chunks_user
        ON user_state_snapshot_chunks(user_id)
      `),

      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS training_plans (
          user_id INTEGER PRIMARY KEY, revision INTEGER NOT NULL DEFAULT 0,
          content TEXT, updated_at TEXT
        )
      `),
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS training_pdfs (
          user_id INTEGER NOT NULL, slot INTEGER NOT NULL,
          revision INTEGER NOT NULL DEFAULT 0, name TEXT,
          byte_size INTEGER, chunk_count INTEGER, file_key TEXT, updated_at TEXT,
          PRIMARY KEY (user_id, slot)
        )
      `),
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS training_pdf_chunks (
          user_id INTEGER NOT NULL, slot INTEGER NOT NULL, file_key TEXT NOT NULL,
          chunk_index INTEGER NOT NULL, payload TEXT NOT NULL,
          PRIMARY KEY (user_id, slot, file_key, chunk_index)
        )
      `),
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS training_uploads (
          user_id INTEGER NOT NULL, upload_id TEXT NOT NULL, slot INTEGER NOT NULL,
          name TEXT NOT NULL, byte_size INTEGER NOT NULL, chunk_count INTEGER NOT NULL,
          base_revision INTEGER NOT NULL, created_at TEXT NOT NULL,
          PRIMARY KEY (user_id, upload_id)
        )
      `),
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS training_upload_chunks (
          user_id INTEGER NOT NULL, upload_id TEXT NOT NULL,
          chunk_index INTEGER NOT NULL, payload TEXT NOT NULL,
          PRIMARY KEY (user_id, upload_id, chunk_index)
        )
      `),
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS worker_migrations (
          name TEXT PRIMARY KEY,
          applied_at TEXT NOT NULL
        )
      `),

      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS auth_rate_limits (
          rate_key TEXT PRIMARY KEY,
          attempts INTEGER NOT NULL,
          window_start TEXT NOT NULL,
          blocked_until TEXT,
          updated_at TEXT NOT NULL
        )
      `)
    ]);

    await ensureColumn(env, "users", "last_seen_at", "TEXT");
    await ensureColumn(env, "user_audit_events", "metadata", "TEXT");
    await ensureColumn(env, "user_state_snapshots", "revision", "INTEGER NOT NULL DEFAULT 0");
    await ensureColumn(env, "user_state_snapshots", "snapshot_key", "TEXT");
    await ensureColumn(env, "user_state_snapshots", "chunk_count", "INTEGER NOT NULL DEFAULT 0");
    await ensureColumn(env, "user_state_snapshots", "byte_size", "INTEGER NOT NULL DEFAULT 0");
    await ensureColumn(env, "user_state_snapshot_chunks", "created_at", "TEXT");
    await runOneTimeMigrations(env);
    await purgeLegacyEmailData(env);
  })().catch(error => {
    schemaPromise = null;
    throw error;
  });

  return schemaPromise;
}

async function runOneTimeMigrations(env) {
  const name =
    "v69_registration_is_not_password_login";

  const done =
    await env.DB.prepare(`
      SELECT name
      FROM worker_migrations
      WHERE name = ?
    `).bind(name).first();

  if (done) return;

  const now =
    new Date().toISOString();

  await env.DB.batch([
    env.DB.prepare(`
      DELETE FROM login_events

      WHERE EXISTS (
        SELECT 1
        FROM users u

        WHERE u.id = login_events.user_id
          AND u.created_at = login_events.login_at
      )
    `),

    env.DB.prepare(`
      UPDATE users

      SET last_login_at = NULL

      WHERE last_login_at = created_at
    `),

    env.DB.prepare(`
      DELETE FROM user_audit_events

      WHERE event_type = 'login'
        AND message = '\u0412\u0445\u0456\u0434 \u043f\u0456\u0441\u043b\u044f \u0440\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u0457.'
    `),

    env.DB.prepare(`
      INSERT OR IGNORE INTO worker_migrations (
        name,
        applied_at
      )

      VALUES (?, ?)
    `).bind(
      name,
      now
    )
  ]);
}

async function ensureColumn(
  env,
  table,
  column,
  definition
) {
  const info =
    await env.DB.prepare(
      `PRAGMA table_info(${table})`
    ).all();

  const exists =
    (info.results || []).some(
      row =>
        String(row.name) === column
    );

  if (exists) return;

  try {
    await env.DB.prepare(
      `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`
    ).run();
  } catch (error) {
    if (
      !/duplicate column/i.test(
        String(
          error?.message || error
        )
      )
    ) {
      throw error;
    }
  }
}





async function purgeLegacyEmailData(env) {
  const marker = "v79_disable_legacy_email";
  const done = await env.DB.prepare("SELECT name FROM worker_migrations WHERE name = ?").bind(marker).first();
  if (done) return;

  // Empty legacy structures keep v77 rollback safe. No email routes/providers remain active.
    await env.DB.batch([
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS user_recovery_emails (
          user_id INTEGER PRIMARY KEY,
          email TEXT NOT NULL,
          email_norm TEXT NOT NULL UNIQUE,
          verified_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `),

      env.DB.prepare(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_recovery_email_norm
        ON user_recovery_emails(email_norm)
      `),

      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          token_hash TEXT NOT NULL UNIQUE,
          created_at TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          used_at TEXT
        )
      `),

      env.DB.prepare(`
        CREATE INDEX IF NOT EXISTS idx_password_reset_user
        ON password_reset_tokens(user_id)
      `),

      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS email_verification_tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          email_norm TEXT NOT NULL,
          token_hash TEXT NOT NULL UNIQUE,
          created_at TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          used_at TEXT
        )
      `),

      env.DB.prepare(`
        CREATE INDEX IF NOT EXISTS idx_email_verify_user
        ON email_verification_tokens(user_id)
      `)
    ]);
  const info = await env.DB.prepare("PRAGMA table_info(users)").all();
  const clears = (info.results || []).filter(row => ["email", "email_norm", "email_verified_at"].includes(row.name));
  const statements = [
    env.DB.prepare("DELETE FROM password_reset_tokens"),
    env.DB.prepare("DELETE FROM email_verification_tokens"),
    env.DB.prepare("DELETE FROM user_recovery_emails")
  ];
  for (const row of clears) {
    // Preserve old column constraints without retaining personal addresses.
    const value = Number(row.notnull) ? "'removed-' || id" : "NULL";
    statements.push(env.DB.prepare(`UPDATE users SET ${row.name} = ${value}`));
  }
  statements.push(env.DB.prepare("INSERT OR IGNORE INTO worker_migrations (name, applied_at) VALUES (?, ?)").bind(marker, new Date().toISOString()));
  await env.DB.batch(statements);
}

let recoveryRequestSchemaPromise = null;

async function ensureRecoveryRequestSchema(env) {
  if (recoveryRequestSchemaPromise) return recoveryRequestSchemaPromise;

  recoveryRequestSchemaPromise = (async () => {
    await env.DB.batch([
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS password_recovery_requests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          username TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          resolved_at TEXT,
          resolved_by_user_id INTEGER
        )
      `),

      env.DB.prepare(`
        CREATE INDEX IF NOT EXISTS idx_password_recovery_status
        ON password_recovery_requests(status, id DESC)
      `),

      env.DB.prepare(`
        CREATE INDEX IF NOT EXISTS idx_password_recovery_user
        ON password_recovery_requests(user_id, status)
      `)
    ]);
    await recoveryPruneStatement(env).run();
  })().catch(error => {
    recoveryRequestSchemaPromise = null;
    throw error;
  });

  return recoveryRequestSchemaPromise;
}

function recoveryPruneStatement(env) {
  return env.DB.prepare(`
    DELETE FROM password_recovery_requests
    WHERE (status = 'pending' AND created_at < datetime('now', '-60 days'))
       OR (status <> 'pending' AND id NOT IN (
      SELECT id FROM password_recovery_requests
      WHERE status <> 'pending'
      ORDER BY created_at DESC, id DESC LIMIT ?
    ))
  `).bind(RECOVERY_REQUEST_RETENTION);
}

async function requestOwnerRecovery(request, env, cors) {
  const body =
    await readJson(
      request,
      32 * 1024
    );

  const username =
    normalizeUsername(
      body.username
    );

  if (
    !username ||
    username.length < 3 ||
    username.length > 32
  ) {
    throw new HttpError(
      400,
      "\u0412\u0432\u0435\u0434\u0456\u0442\u044c \u043a\u043e\u0440\u0435\u043a\u0442\u043d\u0438\u0439 \u043b\u043e\u0433\u0456\u043d \u0430\u043a\u0430\u0443\u043d\u0442\u0430."
    );
  }

  const usernameNorm =
    username.toLocaleLowerCase(
      "uk-UA"
    );

  const rateKey =
    `owner-recovery:${await sha256(`${clientIp(request)}|${usernameNorm}`)}`;

  await enforceSimpleRateLimit(
    env,
    rateKey,
    5,
    15 * 60 * 1000,
    "\u0417\u0430\u0431\u0430\u0433\u0430\u0442\u043e \u0437\u0430\u043f\u0438\u0442\u0456\u0432 \u043d\u0430 \u0432\u0456\u0434\u043d\u043e\u0432\u043b\u0435\u043d\u043d\u044f. \u0421\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u043f\u0456\u0437\u043d\u0456\u0448\u0435."
  );

  const user =
    await env.DB.prepare(`
      SELECT
        id,
        username

      FROM users

      WHERE username_norm = ?

      LIMIT 1
    `).bind(
      usernameNorm
    ).first();

  if (user) {
    const now =
      new Date()
        .toISOString();

    // Refresh/insert/prune as one transaction: concurrent submissions cannot create duplicates.
    await env.DB.batch([
      env.DB.prepare(`
        UPDATE password_recovery_requests
        SET username = ?, created_at = ?, updated_at = ?
        WHERE user_id = ? AND status = 'pending'
      `).bind(String(user.username), now, now, Number(user.id)),
      env.DB.prepare(`
        INSERT INTO password_recovery_requests
          (user_id, username, status, created_at, updated_at, resolved_at, resolved_by_user_id)
        SELECT ?, ?, 'pending', ?, ?, NULL, NULL
        WHERE EXISTS (SELECT 1 FROM users WHERE id = ?)
          AND NOT EXISTS (SELECT 1 FROM password_recovery_requests WHERE user_id = ? AND status = 'pending')
          AND (SELECT COUNT(*) FROM password_recovery_requests WHERE status = 'pending'
               AND created_at >= datetime('now', '-60 days')) < ?
      `).bind(Number(user.id), String(user.username), now, now, Number(user.id), Number(user.id), MAX_PENDING_RECOVERY_REQUESTS),
      recoveryPruneStatement(env)
    ]);
    // A full queue must be reported rather than silently pretending the request
    // was inserted. The capacity check is inside the atomic INSERT ... SELECT.
    const pending = await env.DB.prepare(`
      SELECT id FROM password_recovery_requests
      WHERE user_id = ? AND status = 'pending' LIMIT 1
    `).bind(Number(user.id)).first();
    if(!pending)throw new HttpError(503,
      "Р§РµСЂРіР° РІС–РґРЅРѕРІР»РµРЅРЅСЏ РґРѕСЃС‚СѓРїСѓ С‚РёРјС‡Р°СЃРѕРІРѕ Р·Р°РїРѕРІРЅРµРЅР°. Р—РІРµСЂРЅС–С‚СЊСЃСЏ РґРѕ РІР»Р°СЃРЅРёРєР° С‡РµСЂРµР· Telegram Р°Р±Рѕ С‚РµР»РµС„РѕРЅ.");
  }

  return reply({
    ok: true,
    message:
      "\u0417\u0430\u043f\u0438\u0442 \u0432\u043b\u0430\u0441\u043d\u0438\u043a\u0443 \u0441\u0430\u0439\u0442\u0443 \u043d\u0430\u0434\u0456\u0441\u043b\u0430\u043d\u043e. \u0417\u0432\u2019\u044f\u0436\u0456\u0442\u044c\u0441\u044f \u0437 \u043d\u0438\u043c \u0447\u0435\u0440\u0435\u0437 Telegram \u0430\u0431\u043e \u0442\u0435\u043b\u0435\u0444\u043e\u043d.",
    telegram:
      String(
        env.OWNER_TELEGRAM || ""
      ).trim(),
    phone:
      String(
        env.OWNER_PHONE || ""
      ).trim()
  }, 200, cors);
}

async function adminRecoveryRequests(request, url, env, cors) {
  await requireOwner(request, env);

  const requestedLimit =
    Number(
      url.searchParams.get("limit") || RECOVERY_REQUEST_RETENTION
    );

  const limit =
    Math.max(
      1,
      Math.min(
        MAX_PENDING_RECOVERY_REQUESTS + RECOVERY_REQUEST_RETENTION,
        Number.isFinite(requestedLimit)
          ? Math.floor(requestedLimit)
          : MAX_PENDING_RECOVERY_REQUESTS + RECOVERY_REQUEST_RETENTION
      )
    );

  const [result, countRow] = await Promise.all([
    env.DB.prepare(`
      SELECT
        r.id,
        r.user_id,
        r.username,
        r.status,
        r.created_at,
        r.updated_at,
        r.resolved_at,
        r.resolved_by_user_id,
        u.role

      FROM password_recovery_requests r

      LEFT JOIN users u
        ON u.id = r.user_id

      ORDER BY
        CASE
          WHEN r.status = 'pending' THEN 0
          ELSE 1
        END,
        r.created_at DESC, r.id DESC

      LIMIT ?
    `).bind(
      limit
    ).all(),

    env.DB.prepare(`
      SELECT COUNT(*) AS total
      FROM password_recovery_requests
    `).first()
  ]);

  return reply({
    ok: true,
    requests:
      result.results || [],
    total_count:
      Number(
        countRow?.total || 0
      )
  }, 200, cors);
}

function generateNewPassword() {
  const upper =
    "ABCDEFGHJKLMNPQRSTUVWXYZ";

  const lower =
    "abcdefghijkmnopqrstuvwxyz";

  const digits =
    "23456789";

  const specials =
    "!@#$%_-+";

  const all =
    upper +
    lower +
    digits +
    specials;

  const randomIndex =
    max => {
      const bytes =
        crypto.getRandomValues(
          new Uint32Array(1)
        );

      return bytes[0] % max;
    };

  const chars = [
    upper[
      randomIndex(
        upper.length
      )
    ],

    lower[
      randomIndex(
        lower.length
      )
    ],

    digits[
      randomIndex(
        digits.length
      )
    ],

    specials[
      randomIndex(
        specials.length
      )
    ]
  ];

  while (
    chars.length < 16
  ) {
    chars.push(
      all[
        randomIndex(
          all.length
        )
      ]
    );
  }

  for (
    let i =
      chars.length - 1;
    i > 0;
    i--
  ) {
    const j =
      randomIndex(
        i + 1
      );

    [
      chars[i],
      chars[j]
    ] = [
      chars[j],
      chars[i]
    ];
  }

  return chars.join("");
}

async function adminResetRecoveryRequest(request, requestId, env, cors) {
  const owner = await requireOwner(request, env);
  const row = await env.DB.prepare(`
    SELECT r.id, r.user_id, r.username, r.status,
           u.id AS existing_user_id, u.username AS current_username
    FROM password_recovery_requests r
    LEFT JOIN users u ON u.id = r.user_id
    WHERE r.id = ? LIMIT 1
  `).bind(requestId).first();
  if (!row) throw new HttpError(404, "\u0417\u0430\u043f\u0438\u0442 \u043d\u0430 \u0432\u0456\u0434\u043d\u043e\u0432\u043b\u0435\u043d\u043d\u044f \u043d\u0435 \u0437\u043d\u0430\u0439\u0434\u0435\u043d\u043e.");
  if (row.status !== "pending") throw new HttpError(409, "\u0426\u0435\u0439 \u0437\u0430\u043f\u0438\u0442 \u0443\u0436\u0435 \u043e\u043f\u0440\u0430\u0446\u044c\u043e\u0432\u0430\u043d\u043e.");
  if (!row.existing_user_id) throw new HttpError(404, "\u0410\u043a\u0430\u0443\u043d\u0442 \u043a\u043e\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447\u0430 \u0432\u0436\u0435 \u043d\u0435 \u0456\u0441\u043d\u0443\u0454.");

  const newPassword = generateNewPassword();
  const { hash, salt } = await hashPassword(newPassword);
  const now = new Date().toISOString();
  const claim = `reset:${randomToken()}`;
  const username = row.current_username || row.username;
  const metadata = JSON.stringify({recovery_request_id: requestId, reset_by_user_id: owner.id, reset_by_username: owner.username});

  // A unique claim lives only inside this atomic batch. A losing request changes nothing.
  const results = await env.DB.batch([
    env.DB.prepare(`
      UPDATE password_recovery_requests SET status = ?
      WHERE id = ? AND status = 'pending'
        AND EXISTS (SELECT 1 FROM users WHERE id = password_recovery_requests.user_id)
    `).bind(claim, requestId),
    env.DB.prepare(`
      UPDATE users SET password_hash = ?, password_salt = ?, password_iterations = ?
      WHERE id = ? AND EXISTS (SELECT 1 FROM password_recovery_requests WHERE id = ? AND status = ?)
    `).bind(hash, salt, PASSWORD_ITERATIONS, Number(row.user_id), requestId, claim),
    env.DB.prepare(`
      DELETE FROM sessions WHERE user_id = ?
        AND EXISTS (SELECT 1 FROM password_recovery_requests WHERE id = ? AND status = ?)
    `).bind(Number(row.user_id), requestId, claim),
    env.DB.prepare(`
      INSERT INTO user_audit_events (user_id, username, event_type, message, metadata, created_at)
      SELECT ?, ?, 'site_action', ?, ?, ?
      WHERE EXISTS (SELECT 1 FROM password_recovery_requests WHERE id = ? AND status = ?)
    `).bind(Number(row.user_id), String(username).slice(0,64),
      `\u0413\u043e\u043b\u043e\u0432\u043d\u0438\u0439 \u0430\u0434\u043c\u0456\u043d\u0456\u0441\u0442\u0440\u0430\u0442\u043e\u0440 \u00ab${owner.username}\u00bb \u0441\u0442\u0432\u043e\u0440\u0438\u0432 \u043d\u043e\u0432\u0438\u0439 \u043f\u0430\u0440\u043e\u043b\u044c \u0434\u043b\u044f \u0432\u0456\u0434\u043d\u043e\u0432\u043b\u0435\u043d\u043d\u044f \u0434\u043e\u0441\u0442\u0443\u043f\u0443.`, metadata, now, requestId, claim),
    env.DB.prepare(`
      UPDATE password_recovery_requests
      SET status = 'resolved', updated_at = ?, resolved_at = ?, resolved_by_user_id = ?
      WHERE id = ? AND status = ?
    `).bind(now, now, Number(owner.id), requestId, claim)
  ]);
  if (!Number(results[0]?.meta?.changes)) throw new HttpError(409, "\u0426\u0435\u0439 \u0437\u0430\u043f\u0438\u0442 \u0443\u0436\u0435 \u043e\u043f\u0440\u0430\u0446\u044c\u043e\u0432\u0430\u043d\u043e \u0430\u0431\u043e \u0430\u043a\u0430\u0443\u043d\u0442 \u0432\u0438\u0434\u0430\u043b\u0435\u043d\u043e.");
  return reply({ok: true, username, new_password: newPassword,
    temporary_password: newPassword, // Response alias for a still-cached v77 frontend.
    shown_once: true}, 200, cors);
}

async function adminRejectRecoveryRequest(
  request,
  requestId,
  env,
  cors
) {
  const owner =
    await requireOwner(
      request,
      env
    );

  const row =
    await env.DB.prepare(`
      SELECT
        r.id,
        r.user_id,
        r.username,
        r.status,
        u.id AS existing_user_id,
        u.username AS current_username

      FROM password_recovery_requests r

      LEFT JOIN users u
        ON u.id = r.user_id

      WHERE r.id = ?

      LIMIT 1
    `).bind(
      requestId
    ).first();

  if (!row) {
    throw new HttpError(
      404,
      "\u0417\u0430\u043f\u0438\u0442 \u043d\u0430 \u0432\u0456\u0434\u043d\u043e\u0432\u043b\u0435\u043d\u043d\u044f \u043d\u0435 \u0437\u043d\u0430\u0439\u0434\u0435\u043d\u043e."
    );
  }

  if (
    row.status !== "pending"
  ) {
    throw new HttpError(
      409,
      "\u0426\u0435\u0439 \u0437\u0430\u043f\u0438\u0442 \u0443\u0436\u0435 \u043e\u043f\u0440\u0430\u0446\u044c\u043e\u0432\u0430\u043d\u043e."
    );
  }

  const now = new Date().toISOString();
  const claim = `reject:${randomToken()}`;
  // Update, audit and final status commit together or not at all.
  const statements = [
    env.DB.prepare(`UPDATE password_recovery_requests SET status = ?
       WHERE id = ? AND status = 'pending'`).bind(claim,requestId)
  ];
  if (row.existing_user_id) {
    statements.push(env.DB.prepare(`
      INSERT INTO user_audit_events (user_id, username, event_type, message, metadata, created_at)
      SELECT ?, ?, 'site_action', ?, ?, ?
      WHERE EXISTS (SELECT 1 FROM password_recovery_requests WHERE id = ? AND status = ?)
    `).bind(Number(row.user_id),String(row.current_username||row.username).slice(0,64),
      `Р“РѕР»РѕРІРЅРёР№ Р°РґРјС–РЅС–СЃС‚СЂР°С‚РѕСЂ В«${owner.username}В» РІС–РґРјРѕРІРёРІ Сѓ Р·Р°РїРёС‚С– РЅР° РІС–РґРЅРѕРІР»РµРЅРЅСЏ РґРѕСЃС‚СѓРїСѓ.`,
      JSON.stringify({recovery_request_id:requestId,rejected_by_user_id:owner.id}),now,requestId,claim));
  }
  statements.push(env.DB.prepare(`UPDATE password_recovery_requests
    SET status = 'rejected', updated_at = ?, resolved_at = ?, resolved_by_user_id = ?
    WHERE id = ? AND status = ?`).bind(now,now,Number(owner.id),requestId,claim));
  const results = await env.DB.batch(statements);
  if (!Number(results[0]?.meta?.changes)) throw new HttpError(409,"Р¦РµР№ Р·Р°РїРёС‚ СѓР¶Рµ РѕРїСЂР°С†СЊРѕРІР°РЅРѕ.");

  return reply({
    ok: true,
    request_id:
      requestId,
    status:
      "rejected"
  }, 200, cors);
}

async function adminUserExportMeta(request, userId, env, cors) {
  await requireOwner(request, env);
  await ensureRecoveryRequestSchema(env);
  const user = await env.DB.prepare(`
    SELECT id, username, role, created_at, last_login_at, last_seen_at, password_iterations
    FROM users WHERE id = ?
  `).bind(userId).first();
  if (!user) throw new HttpError(404, "\u041a\u043e\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447\u0430 \u043d\u0435 \u0437\u043d\u0430\u0439\u0434\u0435\u043d\u043e.");
  const now = new Date().toISOString();
  const [sessions, recovery, state] = await Promise.all([
    env.DB.prepare("SELECT created_at, expires_at, remember_me FROM sessions WHERE user_id = ? AND expires_at > ? ORDER BY id DESC").bind(userId, now).all(),
    env.DB.prepare("SELECT id, user_id, username, status, created_at, updated_at, resolved_at, resolved_by_user_id FROM password_recovery_requests WHERE user_id = ? ORDER BY created_at DESC, id DESC").bind(userId).all(),
    env.DB.prepare("SELECT updated_at, revision, byte_size, chunk_count FROM user_state_snapshots WHERE user_id = ?").bind(userId).first()
  ]);
  return reply({ok: true, user, active_session_count: (sessions.results || []).length,
    active_sessions: sessions.results || [], recovery_requests: recovery.results || [], state: state || null}, 200, cors);
}

async function register(
  request,
  env,
  cors
) {
  const body =
    await readJson(
      request,
      64 * 1024
    );

  const username =
    normalizeUsername(
      body.username
    );

  const usernameNorm =
    username.toLocaleLowerCase(
      "uk-UA"
    );

  const password =
    String(
      body.password || ""
    );

  const accessCode =
    String(
      body.accessCode || ""
    ).trim();

  const rememberMe =
    Boolean(
      body.rememberMe
    );

  validateUsername(
    username
  );

  validatePassword(
    password
  );

  // Limit PBKDF2-heavy anonymous registrations independently of login attempts.
  await enforceSimpleRateLimit(
    env, `register:${await sha256(clientIp(request))}`,
    15, 60 * 60 * 1000,
    "Р—Р°Р±Р°РіР°С‚Рѕ СЃРїСЂРѕР± СЂРµС”СЃС‚СЂР°С†С–С— Р· С†С–С”С— РјРµСЂРµР¶С–. РЎРїСЂРѕР±СѓР№С‚Рµ РїС–Р·РЅС–С€Рµ."
  );


  const exists =
    await env.DB.prepare(`
      SELECT id

      FROM users

      WHERE username_norm = ?
    `).bind(
      usernameNorm
    ).first();

  if (exists) {
    throw new HttpError(
      409,
      "\u0422\u0430\u043a\u0438\u0439 \u043b\u043e\u0433\u0456\u043d \u0443\u0436\u0435 \u0437\u0430\u0439\u043d\u044f\u0442\u0438\u0439."
    );
  }

  let role =
    "member";

  if (accessCode) {
    const adminExists =
      await env.DB.prepare(`
        SELECT id

        FROM users

        WHERE role = 'admin'

        ORDER BY id ASC

        LIMIT 1
      `).first();

    if (
      !adminExists &&
      env.ADMIN_ACCESS_CODE &&
      safeEqualText(
        accessCode,
        String(
          env.ADMIN_ACCESS_CODE
        )
      )
    ) {
      role =
        "admin";
    }
  }

  const {
    hash,
    salt
  } =
    await hashPassword(
      password
    );

  const now =
    new Date()
      .toISOString();

  let user;
  try {
    user = await env.DB.prepare(`
      INSERT INTO users (
        username,
        username_norm,
        password_hash,
        password_salt,
        password_iterations,
        role,
        created_at,
        last_login_at,
        last_seen_at
      )

      VALUES (
        ?, ?, ?, ?, ?, ?, ?, NULL, ?
      )

      RETURNING
        id,
        username,
        role,
        created_at,
        last_login_at,
        last_seen_at
    `).bind(
      username,
      usernameNorm,
      hash,
      salt,
      PASSWORD_ITERATIONS,
      role,
      now,
      now
    ).first();

  } catch (error) {
    if (/unique.*users\.username_norm|users\.username_norm.*unique/i.test(String(error?.message || error))) {
      throw new HttpError(409, "\u0422\u0430\u043a\u0438\u0439 \u043b\u043e\u0433\u0456\u043d \u0443\u0436\u0435 \u0437\u0430\u0439\u043d\u044f\u0442\u0438\u0439.");
    }
    throw error;
  }

  const session =
    await createSession(
      env,
      user.id,
      rememberMe
    );

  await writeAuditEvent(
    env,
    user,
    "account_created",
    "\u0421\u0442\u0432\u043e\u0440\u0435\u043d\u043e \u0430\u043a\u0430\u0443\u043d\u0442.",
    now
  );

  return reply({
    ok: true,

    token:
      session.token,

    expires_at:
      session.expiresAt,


    user:
      await publicUser(
        env,
        user
      )
  }, 201, cors);
}

async function login(
  request,
  env,
  cors
) {
  const body =
    await readJson(
      request,
      64 * 1024
    );

  const username =
    normalizeUsername(
      body.username
    );

  const usernameNorm =
    username.toLocaleLowerCase(
      "uk-UA"
    );

  const password =
    String(
      body.password || ""
    );

  const rememberMe =
    Boolean(
      body.rememberMe
    );

  if (
    !username ||
    !password ||
    password.length >
      MAX_PASSWORD_LENGTH
  ) {
    throw new HttpError(
      401,
      "\u041d\u0435\u043f\u0440\u0430\u0432\u0438\u043b\u044c\u043d\u0438\u0439 \u043b\u043e\u0433\u0456\u043d \u0430\u0431\u043e \u043f\u0430\u0440\u043e\u043b\u044c."
    );
  }

  const rateKey =
    await loginRateKey(
      request,
      usernameNorm
    );

  await enforceLoginRateLimit(
    env,
    rateKey
  );

  const user =
    await env.DB.prepare(`
      SELECT *

      FROM users

      WHERE username_norm = ?
    `).bind(
      usernameNorm
    ).first();

  if (!user) {
    await pbkdf2(
      password,
      new Uint8Array(16),
      PASSWORD_ITERATIONS
    );

    await recordLoginFailure(
      env,
      rateKey
    );

    throw new HttpError(
      401,
      "\u041d\u0435\u043f\u0440\u0430\u0432\u0438\u043b\u044c\u043d\u0438\u0439 \u043b\u043e\u0433\u0456\u043d \u0430\u0431\u043e \u043f\u0430\u0440\u043e\u043b\u044c."
    );
  }

  const storedIterations =
    Number(
      user.password_iterations || 0
    );

  const ownerId =
    await resolveOwnerId(
      env
    );

  const isOwner =
    ownerId !== null &&
    Number(user.id) ===
      Number(ownerId);

  let valid =
    false;

  let ownerRecovered =
    false;

  let passwordWasRehashed =
    false;

  if (
    Number.isInteger(
      storedIterations
    ) &&
    storedIterations > 0 &&
    storedIterations <=
      MAX_PBKDF2_ITERATIONS
  ) {
    valid =
      await verifyPassword(
        password,
        user.password_salt,
        user.password_hash,
        storedIterations
      );
  } else if (
    storedIterations >
      MAX_PBKDF2_ITERATIONS
  ) {
    const emergencySecret =
      isOwner
        ? String(
            env.OWNER_RECOVERY_PASSWORD ||
            env.ADMIN_ACCESS_CODE ||
            ""
          )
        : "";

    if (
      emergencySecret &&
      safeEqualText(
        password,
        emergencySecret
      )
    ) {
      const replacement =
        await hashPassword(
          password
        );

      await env.DB.batch([
        env.DB.prepare(`
          UPDATE users

          SET
            password_hash = ?,
            password_salt = ?,
            password_iterations = ?,
            role = 'admin'

          WHERE id = ?
        `).bind(
          replacement.hash,
          replacement.salt,
          PASSWORD_ITERATIONS,
          Number(user.id)
        ),

        env.DB.prepare(`
          DELETE FROM sessions

          WHERE user_id = ?
        `).bind(
          Number(user.id)
        )
      ]);

      user.password_hash =
        replacement.hash;

      user.password_salt =
        replacement.salt;

      user.password_iterations =
        PASSWORD_ITERATIONS;

      user.role =
        "admin";

      valid =
        true;

      ownerRecovered =
        true;

      passwordWasRehashed =
        true;
    } else {
      await recordLoginFailure(
        env,
        rateKey
      );

      throw new HttpError(
        409,

        isOwner
          ? "\u041f\u0430\u0440\u043e\u043b\u044c \u0433\u043e\u043b\u043e\u0432\u043d\u043e\u0433\u043e \u0430\u0434\u043c\u0456\u043d\u0456\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u0430 \u043f\u043e\u0442\u0440\u0435\u0431\u0443\u0454 \u043e\u0434\u043d\u043e\u0440\u0430\u0437\u043e\u0432\u043e\u0433\u043e \u0432\u0456\u0434\u043d\u043e\u0432\u043b\u0435\u043d\u043d\u044f \u043f\u0456\u0441\u043b\u044f \u043f\u043e\u043c\u0438\u043b\u043a\u0438 v69. \u0412\u0438\u043a\u043e\u0440\u0438\u0441\u0442\u0430\u0439\u0442\u0435 \u0430\u0432\u0430\u0440\u0456\u0439\u043d\u0438\u0439 \u043f\u0430\u0440\u043e\u043b\u044c \u0432\u043b\u0430\u0441\u043d\u0438\u043a\u0430."
          : "\u041f\u0430\u0440\u043e\u043b\u044c \u0446\u044c\u043e\u0433\u043e \u0430\u043a\u0430\u0443\u043d\u0442\u0430 \u043f\u043e\u0442\u0440\u0435\u0431\u0443\u0454 \u0432\u0456\u0434\u043d\u043e\u0432\u043b\u0435\u043d\u043d\u044f. \u0421\u043a\u043e\u0440\u0438\u0441\u0442\u0430\u0439\u0442\u0435\u0441\u044f \u00ab\u0417\u0430\u0431\u0443\u043b\u0438 \u043f\u0430\u0440\u043e\u043b\u044c?\u00bb."
      );
    }
  }

  if (
    !valid &&
    isOwner
  ) {
    const explicitRecovery =
      String(
        env.OWNER_RECOVERY_PASSWORD ||
        ""
      );

    if (
      explicitRecovery &&
      safeEqualText(
        password,
        explicitRecovery
      )
    ) {
      const replacement =
        await hashPassword(
          password
        );

      await env.DB.batch([
        env.DB.prepare(`
          UPDATE users

          SET
            password_hash = ?,
            password_salt = ?,
            password_iterations = ?,
            role = 'admin'

          WHERE id = ?
        `).bind(
          replacement.hash,
          replacement.salt,
          PASSWORD_ITERATIONS,
          Number(user.id)
        ),

        env.DB.prepare(`
          DELETE FROM sessions

          WHERE user_id = ?
        `).bind(
          Number(user.id)
        )
      ]);

      user.password_hash =
        replacement.hash;

      user.password_salt =
        replacement.salt;

      user.password_iterations =
        PASSWORD_ITERATIONS;

      user.role =
        "admin";

      valid =
        true;

      ownerRecovered =
        true;

      passwordWasRehashed =
        true;
    }
  }

  if (!valid) {
    await recordLoginFailure(
      env,
      rateKey
    );

    throw new HttpError(
      401,
      "\u041d\u0435\u043f\u0440\u0430\u0432\u0438\u043b\u044c\u043d\u0438\u0439 \u043b\u043e\u0433\u0456\u043d \u0430\u0431\u043e \u043f\u0430\u0440\u043e\u043b\u044c."
    );
  }

  await clearLoginRateLimit(
    env,
    rateKey
  );

  const now =
    new Date()
      .toISOString();

  const statements = [
    env.DB.prepare(`
      UPDATE users

      SET
        last_login_at = ?,
        last_seen_at = ?

      WHERE id = ?
    `).bind(
      now,
      now,
      user.id
    ),

    env.DB.prepare(`
      INSERT INTO login_events (
        user_id,
        login_at
      )

      VALUES (?, ?)
    `).bind(
      user.id,
      now
    ),

    env.DB.prepare(`
      DELETE FROM sessions

      WHERE expires_at <= ?
    `).bind(
      now
    )
  ];

  if (
    isOwner &&
    user.role !== "admin"
  ) {
    statements.push(
      env.DB.prepare(`
        UPDATE users

        SET role = 'admin'

        WHERE id = ?
      `).bind(
        Number(user.id)
      )
    );

    user.role =
      "admin";
  }

  if (
    !passwordWasRehashed &&
    storedIterations > 0 &&
    storedIterations <
      PASSWORD_ITERATIONS
  ) {
    const upgraded =
      await hashPassword(
        password
      );

    statements.push(
      env.DB.prepare(`
        UPDATE users

        SET
          password_hash = ?,
          password_salt = ?,
          password_iterations = ?

        WHERE id = ?
      `).bind(
        upgraded.hash,
        upgraded.salt,
        PASSWORD_ITERATIONS,
        user.id
      )
    );

    user.password_iterations =
      PASSWORD_ITERATIONS;
  }

  await env.DB.batch(
    statements
  );

  const session =
    await createSession(
      env,
      user.id,
      rememberMe
    );

  const currentUser = {
    ...user,

    last_login_at:
      now,

    last_seen_at:
      now
  };

  await writeAuditEvent(
    env,
    currentUser,
    "login",
    "\u0412\u0445\u0456\u0434 \u0434\u043e \u0430\u043a\u0430\u0443\u043d\u0442\u0430 \u0447\u0435\u0440\u0435\u0437 \u043b\u043e\u0433\u0456\u043d \u0456 \u043f\u0430\u0440\u043e\u043b\u044c.",
    now
  );

  if (
    ownerRecovered
  ) {
    await writeAuditEvent(
      env,
      currentUser,
      "site_action",
      "\u0412\u0456\u0434\u043d\u043e\u0432\u043b\u0435\u043d\u043e \u043f\u0430\u0440\u043e\u043b\u044c \u0433\u043e\u043b\u043e\u0432\u043d\u043e\u0433\u043e \u0430\u0434\u043c\u0456\u043d\u0456\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u0430 \u043f\u0456\u0441\u043b\u044f \u043d\u0435\u0441\u0443\u043c\u0456\u0441\u043d\u043e\u0457 PBKDF2-\u043c\u0456\u0433\u0440\u0430\u0446\u0456\u0457 v69.",
      now
    );
  }

  return reply({
    ok: true,

    token:
      session.token,

    expires_at:
      session.expiresAt,

    user:
      await publicUser(
        env,
        currentUser
      )
  }, 200, cors);
}

async function logout(
  request,
  env,
  cors
) {
  const token =
    getToken(
      request
    );

  if (token) {
    const hash =
      await sha256(
        token
      );

    const user =
      await env.DB.prepare(`
        SELECT
          u.id,
          u.username,
          u.role,
          u.created_at,
          u.last_login_at,
          u.last_seen_at

        FROM sessions s

        JOIN users u
          ON u.id = s.user_id

        WHERE s.token_hash = ?

        LIMIT 1
      `).bind(
        hash
      ).first();

    await env.DB.prepare(`
      DELETE FROM sessions

      WHERE token_hash = ?
    `).bind(
      hash
    ).run();

    if (user) {
      await writeAuditEvent(
        env,
        user,
        "logout",
        "\u0412\u0438\u0445\u0456\u0434 \u0437 \u0430\u043a\u0430\u0443\u043d\u0442\u0430."
      );
    }
  }

  return reply({
    ok: true
  }, 200, cors);
}

async function deleteAccount(
  request,
  env,
  cors
) {

  await ensureRecoveryRequestSchema(
    env
  );

  const user =
    await requireSession(
      request,
      env
    );

  const userId =
    Number(
      user.id
    );

  const ownerId =
    await resolveOwnerId(
      env
    );

  if (
    ownerId !== null &&
    userId ===
      Number(ownerId)
  ) {
    throw new HttpError(
      409,
      "\u0413\u043e\u043b\u043e\u0432\u043d\u0438\u0439 \u0430\u0434\u043c\u0456\u043d\u0456\u0441\u0442\u0440\u0430\u0442\u043e\u0440 \u043d\u0435 \u043c\u043e\u0436\u0435 \u0432\u0438\u0434\u0430\u043b\u0438\u0442\u0438 \u0441\u0432\u0456\u0439 \u0430\u043a\u0430\u0443\u043d\u0442. \u0421\u043f\u043e\u0447\u0430\u0442\u043a\u0443 \u043f\u0440\u0438\u0437\u043d\u0430\u0447\u0442\u0435 \u0456\u043d\u0448\u043e\u0433\u043e \u0432\u043b\u0430\u0441\u043d\u0438\u043a\u0430 \u0432 OWNER_USERNAME \u0430\u0431\u043e OWNER_USER_ID."
    );
  }

  await env.DB.batch([
    env.DB.prepare(`
      DELETE FROM sessions
      WHERE user_id = ?
    `).bind(
      userId
    ),

    env.DB.prepare(`
      DELETE FROM login_events
      WHERE user_id = ?
    `).bind(
      userId
    ),

    env.DB.prepare("DELETE FROM training_upload_chunks WHERE user_id = ?").bind(userId),
    env.DB.prepare("DELETE FROM training_uploads WHERE user_id = ?").bind(userId),
    env.DB.prepare("DELETE FROM training_pdf_chunks WHERE user_id = ?").bind(userId),
    env.DB.prepare("DELETE FROM training_pdfs WHERE user_id = ?").bind(userId),
    env.DB.prepare("DELETE FROM training_plans WHERE user_id = ?").bind(userId),
    env.DB.prepare(`
      DELETE FROM user_state_snapshot_chunks
      WHERE user_id = ?
    `).bind(
      userId
    ),

    env.DB.prepare(`
      DELETE FROM user_state_snapshots
      WHERE user_id = ?
    `).bind(
      userId
    ),




    env.DB.prepare(`
      DELETE FROM password_recovery_requests
      WHERE user_id = ?
    `).bind(
      userId
    ),

    env.DB.prepare(`
      UPDATE user_audit_events
      SET username = 'Р’РёРґР°Р»РµРЅРёР№ РєРѕСЂРёСЃС‚СѓРІР°С‡',
          message = 'Р†СЃС‚РѕСЂРёС‡РЅР° РїРѕРґС–СЏ РІРёРґР°Р»РµРЅРѕРіРѕ Р°РєР°СѓРЅС‚Р°.',
          metadata = NULL
      WHERE user_id = ?
    `).bind(userId),

    env.DB.prepare(`INSERT INTO user_audit_events
      (user_id,username,event_type,message,metadata,created_at)
      VALUES (?,'Р’РёРґР°Р»РµРЅРёР№ РєРѕСЂРёСЃС‚СѓРІР°С‡','account_deleted','РљРѕСЂРёСЃС‚СѓРІР°С‡ РІРёРґР°Р»РёРІ СЃРІС–Р№ Р°РєР°СѓРЅС‚.',NULL,?)
    `).bind(userId,new Date().toISOString()),

    env.DB.prepare(`
      DELETE FROM users
      WHERE id = ?
    `).bind(
      userId
    )
  ]);

  return reply({
    ok: true,

    deleted_user: {
      id:
        user.id,

      username:
        user.username
    }
  }, 200, cors);
}















function normalizeMetadataText(
  value
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  let text;

  try {
    text =
      typeof value ===
        "string"
        ? value
        : JSON.stringify(
            value
          );
  } catch (_) {
    return null;
  }

  if (
    text.length <=
      MAX_AUDIT_METADATA
  ) {
    return text;
  }

  const rawPreview =
    text.slice(
      0,
      Math.max(
        0,
        Math.floor(
          MAX_AUDIT_METADATA /
          2
        )
      )
    );

  let fallback =
    JSON.stringify({
      truncated:
        true,

      note:
        "\u041c\u0435\u0442\u0430\u0434\u0430\u043d\u0456 \u043f\u043e\u0434\u0456\u0457 \u043f\u0435\u0440\u0435\u0432\u0438\u0449\u0438\u043b\u0438 \u043b\u0456\u043c\u0456\u0442 \u0456 \u0431\u0443\u043b\u0438 \u0441\u043a\u043e\u0440\u043e\u0447\u0435\u043d\u0456.",

      preview:
        rawPreview
    });

  while (
    fallback.length >
      MAX_AUDIT_METADATA
  ) {
    const parsed =
      JSON.parse(
        fallback
      );

    parsed.preview =
      String(
        parsed.preview ||
        ""
      ).slice(
        0,
        Math.max(
          0,
          String(
            parsed.preview ||
            ""
          ).length -
          250
        )
      );

    fallback =
      JSON.stringify(
        parsed
      );
  }

  return fallback;
}

function normalizeAuditInput(
  item
) {
  const source =
    item &&
    typeof item ===
      "object"
      ? item
      : {};

  const eventType =
    [
      "site_action",
      "client_action",
      "visit"
    ].includes(
      String(
        source.event_type ||
        ""
      )
    )
      ? String(
          source.event_type
        )
      : "site_action";

  const message =
    String(
      source.message ||
      ""
    )
      .trim()
      .slice(
        0,
        MAX_AUDIT_MESSAGE
      );

  if (!message) {
    throw new HttpError(
      400,
      "\u041f\u043e\u0440\u043e\u0436\u043d\u044f \u0434\u0456\u044f."
    );
  }

  let occurredAt =
    String(
      source.occurred_at ||
      ""
    ).trim();

  if (
    !occurredAt ||
    Number.isNaN(
      Date.parse(
        occurredAt
      )
    )
  ) {
    occurredAt =
      new Date()
        .toISOString();
  }

  occurredAt =
    new Date(
      occurredAt
    ).toISOString();

  const nowMs =
    Date.now();

  if (
    Date.parse(
      occurredAt
    ) >
    nowMs +
      5 * 60 * 1000
  ) {
    occurredAt =
      new Date(
        nowMs
      ).toISOString();
  }

  const metadata =
    source.metadata &&
    typeof source.metadata ===
      "object"
      ? normalizeMetadataText(
          source.metadata
        )
      : null;

  return {
    // Untrusted browsers cannot claim the same type as verified Worker actions.
    eventType: eventType === "visit" ? "visit" : "client_action",
    message: eventType === "visit" ? "Р’С–РґРІС–РґСѓРІР°РЅРЅСЏ СЃР°Р№С‚Сѓ (Р·Р° РїРѕРІС–РґРѕРјР»РµРЅРЅСЏРј Р±СЂР°СѓР·РµСЂР°)." : message,
    occurredAt: eventType === "visit" ? new Date().toISOString() : occurredAt,
    metadata
  };
}

async function auditAction(
  request,
  env,
  cors
) {
  const user =
    await requireSession(
      request,
      env
    );

  await enforceSimpleRateLimit(env, `audit-action:${Number(user.id)}`, 80, AUDIT_WINDOW_MS,
    "Р—Р°Р±Р°РіР°С‚Рѕ РїРѕРґС–Р№ Р·Р° РєРѕСЂРѕС‚РєРёР№ С‡Р°СЃ. РЎРїСЂРѕР±СѓР№С‚Рµ РїС–Р·РЅС–С€Рµ.");
  const item =
    normalizeAuditInput(
      await readJson(
        request
      )
    );

  await writeAuditEvent(
    env,
    user,
    item.eventType,
    item.message,
    item.occurredAt,
    item.metadata
  );

  if (
    item.eventType ===
      "visit"
  ) {
    await updateLastSeen(
      env,
      user.id,
      item.occurredAt
    );
  }

  return reply({
    ok: true
  }, 201, cors);
}

async function auditBatch(
  request,
  env,
  cors
) {
  const user =
    await requireSession(
      request,
      env
    );

  await enforceSimpleRateLimit(env, `audit-batch:${Number(user.id)}`, 60, AUDIT_WINDOW_MS,
    "Р—Р°Р±Р°РіР°С‚Рѕ РїР°РєРµС‚С–РІ Р¶СѓСЂРЅР°Р»Сѓ. РџРѕРІС‚РѕСЂС–С‚СЊ РїС–Р·РЅС–С€Рµ.");
  const body =
    await readJson(
      request,
      512 * 1024
    );
  if(!Array.isArray(body.events) || body.events.length > 15){
    throw new HttpError(400, "РџР°РєРµС‚ Р¶СѓСЂРЅР°Р»Сѓ РјР°С” РјС–СЃС‚РёС‚Рё РІС–Рґ 1 РґРѕ 15 РїРѕРґС–Р№.");
  }

  const raw =
    Array.isArray(
      body.events
    )
      ? body.events.slice(
          0,
          15
        )
      : [];

  if (
    !raw.length
  ) {
    throw new HttpError(
      400,
      "\u041d\u0435\u043c\u0430\u0454 \u043f\u043e\u0434\u0456\u0439 \u0434\u043b\u044f \u0437\u0430\u043f\u0438\u0441\u0443."
    );
  }

  const items =
    raw.map(
      normalizeAuditInput
    );

  const statements =
    items.map(
      item =>
        env.DB.prepare(`
          INSERT INTO user_audit_events (
            user_id,
            username,
            event_type,
            message,
            metadata,
            created_at
          )

          SELECT ?, ?, ?, ?, ?, ?
          WHERE ? = 0 OR NOT EXISTS (
            SELECT 1 FROM user_audit_events
            WHERE user_id = ? AND event_type = 'visit' AND created_at > ?
          )
        `).bind(
          Number(user.id),

          String(
            user.username ||
            "\u2014"
          ).slice(
            0,
            64
          ),

          item.eventType,

          item.message,

          item.metadata,

          item.occurredAt,
          item.eventType === "visit" ? 1 : 0,
          Number(user.id),
          new Date(Date.now()-30*60*1000).toISOString()
        )
    );

  await env.DB.batch(
    statements
  );

  const visits =
    items
      .filter(
        item =>
          item.eventType ===
            "visit"
      )
      .map(
        item =>
          item.occurredAt
      )
      .sort();

  if (
    visits.length
  ) {
    await updateLastSeen(
      env,
      user.id,
      visits[
        visits.length -
        1
      ]
    );
  }

  return reply({
    ok: true,

    accepted:
      items.length
  }, 201, cors);
}

async function auditState(
  request,
  env,
  cors
) {
  const user =
    await requireSession(
      request,
      env
    );

  const current =
    await env.DB.prepare(`
      SELECT revision

      FROM user_state_snapshots

      WHERE user_id = ?
    `).bind(
      Number(user.id)
    ).first();

  if (
    Number(
      current?.revision ||
      0
    ) > 0
  ) {
    throw new HttpError(
      409,
      "\u041d\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0456 \u0432\u0436\u0435 \u0432\u0438\u043a\u043e\u0440\u0438\u0441\u0442\u043e\u0432\u0443\u0454\u0442\u044c\u0441\u044f \u043d\u043e\u0432\u0430 \u0441\u0438\u043d\u0445\u0440\u043e\u043d\u0456\u0437\u0430\u0446\u0456\u044f. \u041e\u043d\u043e\u0432\u0456\u0442\u044c \u0441\u0430\u0439\u0442."
    );
  }

  const body =
    await readJson(
      request,
      2 * 1024 * 1024
    );

  const serialized =
    serializeStateSnapshot(
      body.snapshot,
      1500000
    );

  const updatedAt =
    new Date()
      .toISOString();

  await env.DB.prepare(`
    INSERT INTO user_state_snapshots (
      user_id,
      snapshot,
      updated_at,
      revision,
      snapshot_key,
      chunk_count,
      byte_size
    )

    VALUES (
      ?, ?, ?, 0, NULL, 0, ?
    )

    ON CONFLICT(user_id)

    DO UPDATE SET
      snapshot =
        excluded.snapshot,
      updated_at =
        excluded.updated_at,
      snapshot_key = NULL,
      chunk_count = 0,
      byte_size =
        excluded.byte_size

    WHERE
      user_state_snapshots.revision =
        0
  `).bind(
    Number(user.id),
    serialized.text,
    updatedAt,
    serialized.byteSize
  ).run();

  return reply({
    ok: true,

    updated_at:
      updatedAt,

    revision:
      0
  }, 200, cors);
}

function validateSyncSnapshotV91(snapshot){
  const obj=v=>v!==null&&typeof v==="object"&&!Array.isArray(v);
  const text=v=>typeof v==="string";
  const number=v=>v===undefined||v===null||v===""||((typeof v==="number"||typeof v==="string")&&String(v).trim()!==""&&Number.isFinite(Number(String(v).trim().replace(",",".")))&&Number(String(v).trim().replace(",","."))>=0);
  const pairs=[["protein","proteins"],["fat","fats"],["carb","carbs"],["sugar","sugars"],["fiber","fibre"]];
  const metrics=["kcal","protein","proteins","fat","fats","carb","carbs","sugar","sugars","salt","fiber","fibre"];
  const nutrition=row=>{
    if(!obj(row)||metrics.some(k=>!number(row[k]))||!number(row.weight))return false;
    for(const [a,b] of pairs){
      if(row[a]!==undefined&&row[a]!==null&&row[b]!==undefined&&row[b]!==null&&Number(String(row[a]).replace(",","."))!==Number(String(row[b]).replace(",",".")))return false;
    }
    return true;
  };
  if(!obj(snapshot))return false;
  // Synchronization must be a complete snapshot. A partial object could wipe local data.
  if(snapshot.schema_version!==1)return false;
  for(const key of ["products","calculator","archive","calculator_quick_presets"]){
    if(!Array.isArray(snapshot[key]))return false;
  }
  if(!text(snapshot.calculator_draft)||!obj(snapshot.profile)||!obj(snapshot.settings)||!obj(snapshot.daily_goal))return false;
  if(snapshot.daily_goal!==undefined){
    if(!obj(snapshot.daily_goal))return false;
    if(snapshot.daily_goal.enabled!==undefined&&typeof snapshot.daily_goal.enabled!=="boolean")return false;
    if(!nutrition(snapshot.daily_goal))return false;
  }
  if(snapshot.settings!==undefined){
    const setting=snapshot.settings;
    if(!obj(setting))return false;
    for(const key of ["custom_categories","category_order","deleted_default_categories"]){
      if(setting[key]!==undefined&&!Array.isArray(setting[key]))return false;
    }
    if(Array.isArray(setting.custom_categories)&&setting.custom_categories.some(c=>!obj(c)||!text(c.id)||!text(c.label)||!c.id.trim()||!c.label.trim()))return false;
    for(const key of ["category_order","deleted_default_categories"]){
      if(Array.isArray(setting[key])&&setting[key].some(c=>!text(c)))return false;
    }
    for(const key of ["departments_enabled","stats_to_today","site_data_visible","archive_note_visible"]){
      if(setting[key]!==undefined&&typeof setting[key]!=="boolean")return false;
    }
    if(setting.sort_mode!==undefined&&!text(setting.sort_mode))return false;
    if(setting.archive_note!==undefined&&(!text(setting.archive_note)||setting.archive_note.length>30000))return false;
  }
  if(Array.isArray(snapshot.products)&&snapshot.products.some(row=>{
    if(!nutrition(row)||!text(row.name)||!row.name.trim())return true;
    if(row.display!==undefined){
      if(!obj(row.display)||!nutrition(row.display))return true;
      for(const k of ["kcal","protein","fat","carb","sugar","salt","fiber"]){
        if(row.display[k]!==undefined&&Number(row.display[k])!==Number(row[k]??row[k==="protein"?"proteins":k==="fat"?"fats":k==="carb"?"carbs":k==="sugar"?"sugars":k==="fiber"?"fibre":k]??0))return true;
      }
    }
    return false;
  }))return false;
  if(Array.isArray(snapshot.calculator)&&snapshot.calculator.some(row=>!nutrition(row)||!text(row.text??row.name??"")||!(row.text??row.name??"").trim()))return false;
  if(Array.isArray(snapshot.archive)&&snapshot.archive.some(row=>{
    if(!nutrition(row)||!text(row.text)||!row.text.trim()||!text(row.date)||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(row.date))return true;
    if(row.comment!==undefined&&!text(row.comment))return true;
    if(row.composition!==undefined&&(!Array.isArray(row.composition)||row.composition.some(r=>!nutrition(r)||!text(r.text??r.name??"")||!(r.text??r.name??"").trim())))return true;
    return false;
  }))return false;
  if(Array.isArray(snapshot.calculator_quick_presets)&&snapshot.calculator_quick_presets.some(p=>!obj(p)||!number(p.amount)))return false;
  return true;
}

function serializeStateSnapshot(
  value,
  maxBytes =
    MAX_SYNC_BYTES
) {
  if(!validateSyncSnapshotV91(value)){
    throw new HttpError(400,"РќРµРєРѕСЂРµРєС‚РЅРёР№ Р·РЅС–РјРѕРє РґР°РЅРёС… СЃРёРЅС…СЂРѕРЅС–Р·Р°С†С–С—. РџРµСЂРµРІС–СЂС‚Рµ РїСЂРѕРґСѓРєС‚Рё, РєР°Р»СЊРєСѓР»СЏС‚РѕСЂ С– Р°СЂС…С–РІ.");
  }
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value
    )
  ) {
    throw new HttpError(
      400,
      "\u041d\u0435\u043a\u043e\u0440\u0435\u043a\u0442\u043d\u0438\u0439 \u0437\u043d\u0456\u043c\u043e\u043a \u0434\u0430\u043d\u0438\u0445."
    );
  }

  let text;

  try {
    text =
      JSON.stringify(
        value
      );
  } catch (_) {
    throw new HttpError(
      400,
      "\u041d\u0435 \u0432\u0434\u0430\u043b\u043e\u0441\u044f \u043e\u0431\u0440\u043e\u0431\u0438\u0442\u0438 \u0437\u043d\u0456\u043c\u043e\u043a \u0434\u0430\u043d\u0438\u0445."
    );
  }

  const byteSize =
    new TextEncoder()
      .encode(
        text
      )
      .byteLength;

  if (
    byteSize >
      maxBytes
  ) {
    throw new HttpError(
      413,
      `\u0417\u043d\u0456\u043c\u043e\u043a \u0434\u0430\u043d\u0438\u0445 \u0437\u0430\u0432\u0435\u043b\u0438\u043a\u0438\u0439 \u0434\u043b\u044f \u0441\u0438\u043d\u0445\u0440\u043e\u043d\u0456\u0437\u0430\u0446\u0456\u0457 (${Math.ceil(byteSize / 1024)} \u041a\u0411).`
    );
  }

  return {
    text,
    byteSize
  };
}

async function syncStateGet(
  request,
  env,
  cors
) {
  const user =
    await requireSession(
      request,
      env
    );

  const state =
    await readStoredSnapshot(
      env,
      Number(user.id)
    );

  return reply({
    ok: true,

    snapshot:
      state.snapshot,

    updated_at:
      state.updatedAt,

    revision:
      state.revision,

    byte_size:
      state.byteSize
  }, 200, cors);
}

async function syncStatePost(
  request,
  env,
  cors
) {
  const user =
    await requireSession(
      request,
      env
    );

  const body =
    await readJson(
      request,
      MAX_SYNC_REQUEST_BYTES
    );

  const serialized =
    serializeStateSnapshot(
      body.snapshot
    );

  const force =
    body.force === true;

  const baseRevisionRaw =
    Number(
      body.base_revision ??
      0
    );

  const baseRevision =
    Number.isInteger(
      baseRevisionRaw
    ) &&
    baseRevisionRaw >= 0
      ? baseRevisionRaw
      : 0;

  const userId =
    Number(
      user.id
    );

  const updatedAt =
    new Date()
      .toISOString();

  const previousState =
    await env.DB.prepare(`
      SELECT snapshot_key

      FROM user_state_snapshots

      WHERE user_id = ?
    `).bind(
      userId
    ).first();

  const previousSnapshotKey =
    String(
      previousState?.snapshot_key ||
      ""
    );

  const staged =
    await stageSnapshotChunks(
      env,
      userId,
      serialized.text
    );

  let written =
    null;

  let activated =
    false;

  try {
    if (force) {
      written =
        await env.DB.prepare(`
          INSERT INTO user_state_snapshots (
            user_id,
            snapshot,
            updated_at,
            revision,
            snapshot_key,
            chunk_count,
            byte_size
          )

          VALUES (
            ?, '', ?, 1, ?, ?, ?
          )

          ON CONFLICT(user_id)

          DO UPDATE SET
            snapshot = '',
            updated_at =
              excluded.updated_at,
            revision =
              user_state_snapshots.revision +
              1,
            snapshot_key =
              excluded.snapshot_key,
            chunk_count =
              excluded.chunk_count,
            byte_size =
              excluded.byte_size

          RETURNING revision
        `).bind(
          userId,
          updatedAt,
          staged.snapshotKey,
          staged.chunkCount,
          serialized.byteSize
        ).first();
    } else if (
      baseRevision === 0
    ) {
      written =
        await env.DB.prepare(`
          UPDATE user_state_snapshots

          SET
            snapshot = '',
            updated_at = ?,
            revision = 1,
            snapshot_key = ?,
            chunk_count = ?,
            byte_size = ?

          WHERE user_id = ?
            AND revision = 0

          RETURNING revision
        `).bind(
          updatedAt,
          staged.snapshotKey,
          staged.chunkCount,
          serialized.byteSize,
          userId
        ).first();

      if (!written) {
        written =
          await env.DB.prepare(`
            INSERT INTO user_state_snapshots (
              user_id,
              snapshot,
              updated_at,
              revision,
              snapshot_key,
              chunk_count,
              byte_size
            )

            VALUES (
              ?, '', ?, 1, ?, ?, ?
            )

            ON CONFLICT(user_id)
            DO NOTHING

            RETURNING revision
          `).bind(
            userId,
            updatedAt,
            staged.snapshotKey,
            staged.chunkCount,
            serialized.byteSize
          ).first();
      }
    } else {
      written =
        await env.DB.prepare(`
          UPDATE user_state_snapshots

          SET
            snapshot = '',
            updated_at = ?,
            revision =
              revision + 1,
            snapshot_key = ?,
            chunk_count = ?,
            byte_size = ?

          WHERE user_id = ?
            AND revision = ?

          RETURNING revision
        `).bind(
          updatedAt,
          staged.snapshotKey,
          staged.chunkCount,
          serialized.byteSize,
          userId,
          baseRevision
        ).first();
    }

    if (!written) {
      await deleteSnapshotStage(
        env,
        userId,
        staged.snapshotKey
      );

      const current =
        await env.DB.prepare(`
          SELECT
            revision,
            updated_at

          FROM user_state_snapshots

          WHERE user_id = ?
        `).bind(
          userId
        ).first();

      return reply({
        ok: false,

        error:
          "\u041d\u0430 \u0456\u043d\u0448\u043e\u043c\u0443 \u043f\u0440\u0438\u0441\u0442\u0440\u043e\u0457 \u0432\u0436\u0435 \u0454 \u043d\u043e\u0432\u0456\u0448\u0456 \u0434\u0430\u043d\u0456.",

        conflict:
          true,

        revision:
          Number(
            current?.revision ||
            0
          ),

        updated_at:
          current?.updated_at ||
          null
      }, 409, cors);
    }

    activated =
      true;

    if (
      previousSnapshotKey &&
      previousSnapshotKey !==
        staged.snapshotKey
    ) {
      await deleteSnapshotStage(
        env,
        userId,
        previousSnapshotKey
      ).catch(
        () => {}
      );
    }

    await cleanupStaleSnapshotStages(
      env,
      userId,
      staged.snapshotKey
    ).catch(
      () => {}
    );

    return reply({
      ok: true,

      updated_at:
        updatedAt,

      revision:
        Number(
          written.revision ||
          (
            baseRevision +
            1
          )
        ),

      byte_size:
        serialized.byteSize
    }, 200, cors);
  } catch (error) {
    if (
      !activated
    ) {
      await deleteSnapshotStage(
        env,
        userId,
        staged.snapshotKey
      ).catch(
        () => {}
      );
    }

    throw error;
  }
}

async function stageSnapshotChunks(
  env,
  userId,
  text
) {
  const bytes =
    new TextEncoder()
      .encode(
        text
      );

  const snapshotKey =
    randomToken();

  const createdAt =
    new Date()
      .toISOString();

  const statements =
    [];

  let chunkIndex =
    0;

  for (
    let offset =
      0;
    offset <
      bytes.length;
    offset +=
      SNAPSHOT_CHUNK_BYTES
  ) {
    const chunkBytes =
      bytes.slice(
        offset,
        Math.min(
          bytes.length,
          offset +
          SNAPSHOT_CHUNK_BYTES
        )
      );

    statements.push(
      env.DB.prepare(`
        INSERT INTO user_state_snapshot_chunks (
          user_id,
          snapshot_key,
          chunk_index,
          chunk,
          created_at
        )

        VALUES (?, ?, ?, ?, ?)
      `).bind(
        userId,
        snapshotKey,
        chunkIndex++,
        encode(
          chunkBytes
        ),
        createdAt
      )
    );
  }

  if (
    !statements.length
  ) {
    statements.push(
      env.DB.prepare(`
        INSERT INTO user_state_snapshot_chunks (
          user_id,
          snapshot_key,
          chunk_index,
          chunk,
          created_at
        )

        VALUES (?, ?, 0, '', ?)
      `).bind(
        userId,
        snapshotKey,
        createdAt
      )
    );

    chunkIndex =
      1;
  }

  await env.DB.batch(
    statements
  );

  return {
    snapshotKey,

    chunkCount:
      chunkIndex
  };
}

async function deleteSnapshotStage(
  env,
  userId,
  snapshotKey
) {
  await env.DB.prepare(`
    DELETE FROM user_state_snapshot_chunks

    WHERE user_id = ?
      AND snapshot_key = ?
  `).bind(
    userId,
    snapshotKey
  ).run();
}

async function cleanupStaleSnapshotStages(
  env,
  userId,
  currentSnapshotKey
) {
  const cutoff =
    new Date(
      Date.now() -
      6 * 60 *
      60 * 1000
    ).toISOString();

  await env.DB.prepare(`
    DELETE FROM user_state_snapshot_chunks

    WHERE user_id = ?
      AND snapshot_key <> ?
      AND created_at IS NOT NULL
      AND created_at < ?
  `).bind(
    userId,
    currentSnapshotKey,
    cutoff
  ).run();
}

async function readStoredSnapshot(
  env,
  userId
) {
  const row =
    await env.DB.prepare(`
      SELECT
        snapshot,
        updated_at,
        revision,
        snapshot_key,
        chunk_count,
        byte_size

      FROM user_state_snapshots

      WHERE user_id = ?
    `).bind(
      userId
    ).first();

  if (!row) {
    return {
      snapshot:
        null,

      updatedAt:
        null,

      revision:
        0,

      byteSize:
        0
    };
  }

  let text =
    String(
      row.snapshot ||
      ""
    );

  if (
    row.snapshot_key
  ) {
    const chunks =
      await env.DB.prepare(`
        SELECT
          chunk_index,
          chunk

        FROM user_state_snapshot_chunks

        WHERE user_id = ?
          AND snapshot_key = ?

        ORDER BY chunk_index ASC
      `).bind(
        userId,
        String(
          row.snapshot_key
        )
      ).all();

    const rows =
      chunks.results ||
      [];

    const expected =
      Math.max(
        0,
        Number(
          row.chunk_count ||
          0
        )
      );

    if (
      expected &&
      rows.length !==
      expected
    ) {
      throw new HttpError(
        500,
        "\u0421\u0435\u0440\u0432\u0435\u0440\u043d\u0438\u0439 \u0437\u043d\u0456\u043c\u043e\u043a \u0434\u0430\u043d\u0438\u0445 \u043d\u0435\u043f\u043e\u0432\u043d\u0438\u0439."
      );
    }

    const decoded =
      rows.map(
        item =>
          decode(
            String(
              item.chunk ||
              ""
            )
          )
      );

    const total =
      decoded.reduce(
        (
          sum,
          item
        ) =>
          sum +
          item.byteLength,
        0
      );

    const merged =
      new Uint8Array(
        total
      );

    let offset =
      0;

    for (
      const item of
        decoded
    ) {
      merged.set(
        item,
        offset
      );

      offset +=
        item.byteLength;
    }

    text =
      new TextDecoder()
        .decode(
          merged
        );
  }

  let snapshot =
    null;

  if (text) {
    try {
      snapshot =
        JSON.parse(
          text
        );
    } catch (_) {
      throw new HttpError(
        500,
        "\u0421\u0435\u0440\u0432\u0435\u0440\u043d\u0438\u0439 \u0437\u043d\u0456\u043c\u043e\u043a \u0434\u0430\u043d\u0438\u0445 \u043f\u043e\u0448\u043a\u043e\u0434\u0436\u0435\u043d\u0438\u0439."
      );
    }
  }

  return {
    snapshot,

    updatedAt:
      row.updated_at ||
      null,

    revision:
      Number(
        row.revision ||
        0
      ),

    byteSize:
      Number(
        row.byte_size ||
        (
          text
            ? new TextEncoder()
                .encode(
                  text
                )
                .byteLength
            : 0
        )
      )
  };
}

let lastRateCleanupAt =
  0;

async function maybeCleanupAuthRateLimits(
  env
) {
  const now =
    Date.now();

  if (
    now -
    lastRateCleanupAt <
    10 * 60 * 1000
  ) {
    return;
  }

  lastRateCleanupAt =
    now;

  const cutoff =
    new Date(
      now -
      24 * 60 *
      60 * 1000
    ).toISOString();

  await env.DB.prepare(`
    DELETE FROM auth_rate_limits

    WHERE updated_at < ?
  `).bind(
    cutoff
  ).run();
}

async function loginRateKey(
  request,
  usernameNorm
) {
  const ip =
    String(
      request.headers.get(
        "CF-Connecting-IP"
      ) ||
      "unknown"
    ).slice(
      0,
      128
    );

  return `login:${await sha256(`${ip}|${usernameNorm}`)}`;
}

async function enforceLoginRateLimit(
  env,
  rateKey
) {
  await maybeCleanupAuthRateLimits(
    env
  );

  const row =
    await env.DB.prepare(`
      SELECT
        attempts,
        window_start,
        blocked_until

      FROM auth_rate_limits

      WHERE rate_key = ?
    `).bind(
      rateKey
    ).first();

  if (!row) return;

  const now =
    Date.now();

  const blockedUntil =
    Date.parse(
      String(
        row.blocked_until ||
        ""
      )
    );

  if (
    Number.isFinite(
      blockedUntil
    ) &&
    blockedUntil >
    now
  ) {
    throw new HttpError(
      429,
      "\u0417\u0430\u0431\u0430\u0433\u0430\u0442\u043e \u043d\u0435\u0432\u0434\u0430\u043b\u0438\u0445 \u0441\u043f\u0440\u043e\u0431 \u0432\u0445\u043e\u0434\u0443. \u0421\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u043f\u0456\u0437\u043d\u0456\u0448\u0435."
    );
  }

  const windowStart =
    Date.parse(
      String(
        row.window_start ||
        ""
      )
    );

  if (
    Number.isFinite(
      windowStart
    ) &&
    now -
    windowStart >=
    LOGIN_RATE_LIMIT_WINDOW_MS
  ) {
    await env.DB.prepare(`
      DELETE FROM auth_rate_limits

      WHERE rate_key = ?
    `).bind(
      rateKey
    ).run();
  }
}

async function recordLoginFailure(env, rateKey) {
  const now = Date.now(), nowIso = new Date(now).toISOString();
  const cutoff = new Date(now - LOGIN_RATE_LIMIT_WINDOW_MS).toISOString();
  const blocked = new Date(now + LOGIN_RATE_LIMIT_WINDOW_MS).toISOString();
  // One SQLite upsert ensures concurrent failures do not overwrite increments.
  await env.DB.prepare(`
    INSERT INTO auth_rate_limits (rate_key, attempts, window_start, blocked_until, updated_at)
    VALUES (?, 1, ?, NULL, ?)
    ON CONFLICT(rate_key) DO UPDATE SET
      blocked_until = CASE
        WHEN auth_rate_limits.blocked_until > excluded.updated_at
          THEN auth_rate_limits.blocked_until
        WHEN auth_rate_limits.window_start <= ? THEN NULL
        WHEN auth_rate_limits.attempts + 1 >= ? THEN ?
        ELSE NULL END,
      attempts = CASE WHEN auth_rate_limits.window_start <= ? THEN 1 ELSE auth_rate_limits.attempts + 1 END,
      window_start = CASE WHEN auth_rate_limits.window_start <= ? THEN excluded.window_start ELSE auth_rate_limits.window_start END,
      updated_at = excluded.updated_at
  `).bind(rateKey,nowIso,nowIso,cutoff,LOGIN_RATE_LIMIT_ATTEMPTS,blocked,cutoff,cutoff).run();
}

async function clearLoginRateLimit(
  env,
  rateKey
) {
  await env.DB.prepare(`
    DELETE FROM auth_rate_limits

    WHERE rate_key = ?
  `).bind(
    rateKey
  ).run();
}

async function updateLastSeen(
  env,
  userId,
  occurredAt
) {
  await env.DB.prepare(`
    UPDATE users

    SET last_seen_at = ?

    WHERE id = ?
      AND (
        last_seen_at IS NULL
        OR last_seen_at < ?
      )
  `).bind(
    occurredAt,
    Number(
      userId
    ),
    occurredAt
  ).run();
}

async function filteredAuditEvents(env, viewer, events){
  const ownerId = await resolveOwnerId(env);
  if(ownerId !== null && Number(viewer.id) === Number(ownerId))return events;
  return events.map(event => {
    if(["client_action", "site_action", "visit"].includes(String(event.event_type))) {
      return {...event, metadata:null,
        message: event.event_type === "visit"
          ? "Р’С–РґРІС–РґСѓРІР°РЅРЅСЏ (Р·С– СЃР»С–РІ Р±СЂР°СѓР·РµСЂР°)."
          : "Р”С–СЏ РєРѕСЂРёСЃС‚СѓРІР°С‡Р° (РґРµС‚Р°Р»С– РґРѕСЃС‚СѓРїРЅС– РіРѕР»РѕРІРЅРѕРјСѓ Р°РґРјС–РЅС–СЃС‚СЂР°С‚РѕСЂСѓ)."};
    }
    return {...event, metadata:null};
  });
}

async function adminAudit(
  request,
  url,
  env,
  cors
) {
  const session =
    await requireAdmin(
      request,
      env
    );

  const requestedLimit =
    Number(
      url.searchParams.get(
        "limit"
      ) ||
      300
    );

  const limit =
    Math.max(
      1,

      Math.min(
        1000,

        Number.isFinite(
          requestedLimit
        )
          ? Math.floor(
              requestedLimit
            )
          : 300
      )
    );

  const beforeIdRaw =
    Number(
      url.searchParams.get(
        "before_id"
      ) ||
      0
    );

  const beforeId =
    Number.isInteger(
      beforeIdRaw
    ) &&
    beforeIdRaw > 0
      ? beforeIdRaw
      : null;

  const scope =
    String(
      url.searchParams.get(
        "scope"
      ) ||
      ""
    );

  const params =
    [];

  const where =
    [];

  if (
    scope ===
    "core"
  ) {
    where.push(`
      (
        event_type IN (
          'account_created',
          'login',
          'logout',
          'account_deleted',
          'role_changed'
        )

        OR (
          event_type IN ('site_action', 'client_action')
          AND message IN ('\u041e\u0447\u0438\u0449\u0435\u043d\u043e \u043b\u043e\u043a\u0430\u043b\u044c\u043d\u0456 \u0434\u0430\u043d\u0456 \u0441\u0430\u0439\u0442\u0443 \u0434\u043b\u044f \u043f\u043e\u0442\u043e\u0447\u043d\u043e\u0433\u043e \u0430\u043a\u0430\u0443\u043d\u0442\u0430.', '\u0420\u045b\u0421\u2021\u0420\u0451\u0421\u2030\u0420\u00b5\u0420\u0405\u0420\u0455 \u0420\u00bb\u0420\u0455\u0420\u0454\u0420\u00b0\u0420\u00bb\u0421\u040a\u0420\u0405\u0421\u2013 \u0420\u0491\u0420\u00b0\u0420\u0405\u0421\u2013 \u0421\u0403\u0420\u00b0\u0420\u2116\u0421\u201a\u0421\u0453 \u0420\u0491\u0420\u00bb\u0421\u040f \u0420\u0457\u0420\u0455\u0421\u201a\u0420\u0455\u0421\u2021\u0420\u0405\u0420\u0455\u0420\u0456\u0420\u0455 \u0420\u00b0\u0420\u0454\u0420\u00b0\u0421\u0453\u0420\u0405\u0421\u201a\u0420\u00b0.', '\u0420\u00a0\u0421\u203a\u0420\u040e\u0432\u0402\u040e\u0420\u00a0\u0421\u2018\u0420\u040e\u0432\u0402\u00b0\u0420\u00a0\u0412\u00b5\u0420\u00a0\u0420\u2026\u0420\u00a0\u0421\u2022 \u0420\u00a0\u0412\u00bb\u0420\u00a0\u0421\u2022\u0420\u00a0\u0421\u201d\u0420\u00a0\u0412\u00b0\u0420\u00a0\u0412\u00bb\u0420\u040e\u0420\u0409\u0420\u00a0\u0420\u2026\u0420\u040e\u0432\u0402\u201c \u0420\u00a0\u0422\u2018\u0420\u00a0\u0412\u00b0\u0420\u00a0\u0420\u2026\u0420\u040e\u0432\u0402\u201c \u0420\u040e\u0420\u0453\u0420\u00a0\u0412\u00b0\u0420\u00a0\u0432\u201e\u2013\u0420\u040e\u0432\u0402\u0459\u0420\u040e\u0421\u201c \u0420\u00a0\u0422\u2018\u0420\u00a0\u0412\u00bb\u0420\u040e\u0420\u040f \u0420\u00a0\u0421\u2014\u0420\u00a0\u0421\u2022\u0420\u040e\u0432\u0402\u0459\u0420\u00a0\u0421\u2022\u0420\u040e\u0432\u0402\u040e\u0420\u00a0\u0420\u2026\u0420\u00a0\u0421\u2022\u0420\u00a0\u0421\u2013\u0420\u00a0\u0421\u2022 \u0420\u00a0\u0412\u00b0\u0420\u00a0\u0421\u201d\u0420\u00a0\u0412\u00b0\u0420\u040e\u0421\u201c\u0420\u00a0\u0420\u2026\u0420\u040e\u0432\u0402\u0459\u0420\u00a0\u0412\u00b0.')
        )
      )
    `);
  }

  if (
    beforeId
  ) {
    where.push(
      "id < ?"
    );

    params.push(
      beforeId
    );
  }

  const sql =
    `
      SELECT
        id,
        user_id,
        username,
        event_type,
        message,
        metadata,
        created_at

      FROM user_audit_events

      ${
        where.length
          ? "WHERE " +
            where.join(
              " AND "
            )
          : ""
      }

      ORDER BY id DESC

      LIMIT ?
    `;

  params.push(
    limit
  );

  const result =
    await env.DB.prepare(
      sql
    ).bind(
      ...params
    ).all();

  const events = await filteredAuditEvents(env, session, result.results || []);

  return reply({
    ok: true,

    requested_by:
      await publicUser(
        env,
        session
      ),

    events,

    next_before_id:
      events.length ===
      limit
        ? Number(
            events[
              events.length -
              1
            ].id
          )
        : null
  }, 200, cors);
}

async function adminUsers(
  request,
  env,
  cors
) {
  const session =
    await requireAdmin(
      request,
      env
    );

  const ownerId =
    await resolveOwnerId(
      env
    );

  const result =
    await env.DB.prepare(`
      SELECT
        u.id,
        u.username,
        u.role,
        u.created_at,
        u.last_login_at,
        u.last_seen_at,

        COUNT(le.id)
          AS login_count,

        (
          SELECT MAX(
            a.created_at
          )

          FROM user_audit_events a

          WHERE a.user_id = u.id
            AND a.event_type = 'logout'
        )
          AS last_logout_at,

        (
          SELECT MAX(
            a.created_at
          )

          FROM user_audit_events a

          WHERE a.user_id = u.id
            AND a.event_type IN ('site_action', 'client_action')
            AND a.message IN ('\u041e\u0447\u0438\u0449\u0435\u043d\u043e \u043b\u043e\u043a\u0430\u043b\u044c\u043d\u0456 \u0434\u0430\u043d\u0456 \u0441\u0430\u0439\u0442\u0443 \u0434\u043b\u044f \u043f\u043e\u0442\u043e\u0447\u043d\u043e\u0433\u043e \u0430\u043a\u0430\u0443\u043d\u0442\u0430.', '\u0420\u045b\u0421\u2021\u0420\u0451\u0421\u2030\u0420\u00b5\u0420\u0405\u0420\u0455 \u0420\u00bb\u0420\u0455\u0420\u0454\u0420\u00b0\u0420\u00bb\u0421\u040a\u0420\u0405\u0421\u2013 \u0420\u0491\u0420\u00b0\u0420\u0405\u0421\u2013 \u0421\u0403\u0420\u00b0\u0420\u2116\u0421\u201a\u0421\u0453 \u0420\u0491\u0420\u00bb\u0421\u040f \u0420\u0457\u0420\u0455\u0421\u201a\u0420\u0455\u0421\u2021\u0420\u0405\u0420\u0455\u0420\u0456\u0420\u0455 \u0420\u00b0\u0420\u0454\u0420\u00b0\u0421\u0453\u0420\u0405\u0421\u201a\u0420\u00b0.', '\u0420\u00a0\u0421\u203a\u0420\u040e\u0432\u0402\u040e\u0420\u00a0\u0421\u2018\u0420\u040e\u0432\u0402\u00b0\u0420\u00a0\u0412\u00b5\u0420\u00a0\u0420\u2026\u0420\u00a0\u0421\u2022 \u0420\u00a0\u0412\u00bb\u0420\u00a0\u0421\u2022\u0420\u00a0\u0421\u201d\u0420\u00a0\u0412\u00b0\u0420\u00a0\u0412\u00bb\u0420\u040e\u0420\u0409\u0420\u00a0\u0420\u2026\u0420\u040e\u0432\u0402\u201c \u0420\u00a0\u0422\u2018\u0420\u00a0\u0412\u00b0\u0420\u00a0\u0420\u2026\u0420\u040e\u0432\u0402\u201c \u0420\u040e\u0420\u0453\u0420\u00a0\u0412\u00b0\u0420\u00a0\u0432\u201e\u2013\u0420\u040e\u0432\u0402\u0459\u0420\u040e\u0421\u201c \u0420\u00a0\u0422\u2018\u0420\u00a0\u0412\u00bb\u0420\u040e\u0420\u040f \u0420\u00a0\u0421\u2014\u0420\u00a0\u0421\u2022\u0420\u040e\u0432\u0402\u0459\u0420\u00a0\u0421\u2022\u0420\u040e\u0432\u0402\u040e\u0420\u00a0\u0420\u2026\u0420\u00a0\u0421\u2022\u0420\u00a0\u0421\u2013\u0420\u00a0\u0421\u2022 \u0420\u00a0\u0412\u00b0\u0420\u00a0\u0421\u201d\u0420\u00a0\u0412\u00b0\u0420\u040e\u0421\u201c\u0420\u00a0\u0420\u2026\u0420\u040e\u0432\u0402\u0459\u0420\u00a0\u0412\u00b0.')
        )
          AS last_clear_at

      FROM users u

      LEFT JOIN login_events le
        ON le.user_id = u.id

      GROUP BY u.id

      ORDER BY COALESCE(
        u.last_seen_at,
        u.last_login_at,
        u.created_at
      ) DESC
    `).all();

  const users =
    (
      result.results ||
      []
    ).map(
      user => ({
        ...user,

        is_owner:
          ownerId !==
          null &&
          Number(
            user.id
          ) ===
          Number(
            ownerId
          )
      })
    );

  return reply({
    ok: true,

    requested_by:
      await publicUser(
        env,
        session
      ),

    users
  }, 200, cors);
}

// v94: retrieve the last synchronized profile photo, owner only.
// No image bytes are added to the standard /admin/users response.
async function adminUserAvatar(request, userId, env, cors) {
  await requireOwner(request, env);
  if (!Number.isSafeInteger(userId) || userId < 1) throw new HttpError(400, "Некоректний ID користувача.");
  const user = await env.DB.prepare("SELECT id FROM users WHERE id = ? LIMIT 1").bind(userId).first();
  if (!user) throw new HttpError(404, "Користувача не знайдено.");
  const stored = await readStoredSnapshot(env, userId);
  const value = stored?.snapshot?.profile?.avatar;
  const avatar = typeof value === "string" && value.length < 450000 && /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value) ? value : "";
  return reply({ok:true,avatar,updated_at:stored.updatedAt||null},200,cors);
}

async function adminUserLogins(
  request,
  userId,
  url,
  env,
  cors
) {
  await requireAdmin(
    request,
    env
  );

  const user =
    await getAdminUserDetails(
      env,
      userId
    );

  if (!user) {
    throw new HttpError(
      404,
      "\u041a\u043e\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447\u0430 \u043d\u0435 \u0437\u043d\u0430\u0439\u0434\u0435\u043d\u043e."
    );
  }

  const requestedLimit =
    Number(
      url.searchParams.get(
        "limit"
      ) ||
      500
    );

  const limit =
    Math.max(
      1,

      Math.min(
        1000,

        Number.isFinite(
          requestedLimit
        )
          ? Math.floor(
              requestedLimit
            )
          : 500
      )
    );

  const beforeIdRaw =
    Number(
      url.searchParams.get(
        "before_id"
      ) ||
      0
    );

  const beforeId =
    Number.isInteger(
      beforeIdRaw
    ) &&
    beforeIdRaw > 0
      ? beforeIdRaw
      : null;

  const params = [
    userId
  ];

  let beforeSql =
    "";

  if (
    beforeId
  ) {
    beforeSql =
      " AND id < ?";

    params.push(
      beforeId
    );
  }

  params.push(
    limit
  );

  const result =
    await env.DB.prepare(`
      SELECT
        id,
        login_at

      FROM login_events

      WHERE user_id = ?
        ${beforeSql}

      ORDER BY id DESC

      LIMIT ?
    `).bind(
      ...params
    ).all();

  const logins =
    result.results ||
    [];

  return reply({
    ok: true,
    user,
    logins,

    next_before_id:
      logins.length ===
      limit
        ? Number(
            logins[
              logins.length -
              1
            ].id
          )
        : null
  }, 200, cors);
}

async function adminUserActivity(
  request,
  userId,
  url,
  env,
  cors
) {
  const viewer = await requireAdmin(request, env);
  const ownerId = await resolveOwnerId(env);
  const mayReadState = ownerId !== null && Number(viewer.id) === Number(ownerId);

  const user =
    await getAdminUserDetails(
      env,
      userId
    );

  if (!user) {
    throw new HttpError(
      404,
      "\u041a\u043e\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447\u0430 \u043d\u0435 \u0437\u043d\u0430\u0439\u0434\u0435\u043d\u043e."
    );
  }

  const requestedLimit =
    Number(
      url.searchParams.get(
        "limit"
      ) ||
      500
    );

  const limit =
    Math.max(
      1,

      Math.min(
        1000,

        Number.isFinite(
          requestedLimit
        )
          ? Math.floor(
              requestedLimit
            )
          : 500
      )
    );

  const beforeIdRaw =
    Number(
      url.searchParams.get(
        "before_id"
      ) ||
      0
    );

  const beforeId =
    Number.isInteger(
      beforeIdRaw
    ) &&
    beforeIdRaw > 0
      ? beforeIdRaw
      : null;

  const allowedTypes =
    new Set([
      "account_created",
      "login",
      "visit",
      "logout",
      "account_deleted",
      "role_changed",
      "site_action",
      "client_action"
    ]);

  const requestedTypes =
    String(
      url.searchParams.get(
        "types"
      ) ||
      ""
    )
      .split(
        ","
      )
      .map(
        value =>
          value.trim()
      )
      .filter(
        value =>
          allowedTypes.has(
            value
          )
      );

  const params = [
    userId
  ];

  const where = [
    "user_id = ?"
  ];

  if (
    requestedTypes.length
  ) {
    where.push(
      `event_type IN (${
        requestedTypes
          .map(
            () => "?"
          )
          .join(
            ","
          )
      })`
    );

    params.push(
      ...requestedTypes
    );
  }

  if (
    beforeId
  ) {
    where.push(
      "id < ?"
    );

    params.push(
      beforeId
    );
  }

  params.push(
    limit
  );

  const result =
    await env.DB.prepare(`
      SELECT
        id,
        user_id,
        username,
        event_type,
        message,
        metadata,
        created_at

      FROM user_audit_events

      WHERE ${
        where.join(
          " AND "
        )
      }

      ORDER BY id DESC

      LIMIT ?
    `).bind(
      ...params
    ).all();

  const events = await filteredAuditEvents(env, viewer, result.results || []);

  const storedState =
    beforeId
      ? {
          snapshot:
            null,

          updatedAt:
            null,

          revision:
            0
        }

      : mayReadState ? await readStoredSnapshot(env, userId) : {
          snapshot: null, updatedAt: null, revision: 0
        };

  const stateSnapshot =
    storedState.snapshot;

  return reply({
    ok: true,
    user,
    events,

    next_before_id:
      events.length ===
      limit
        ? Number(
            events[
              events.length -
              1
            ].id
          )
        : null,

    state_snapshot:
      stateSnapshot,

    state_updated_at:
      storedState.updatedAt,

    state_revision:
      storedState.revision
  }, 200, cors);
}

async function getAdminUserDetails(
  env,
  userId
) {
  const ownerId =
    await resolveOwnerId(
      env
    );

  const user =
    await env.DB.prepare(`
      SELECT
        u.id,
        u.username,
        u.role,
        u.created_at,
        u.last_login_at,
        u.last_seen_at,

        COUNT(le.id)
          AS login_count

      FROM users u

      LEFT JOIN login_events le
        ON le.user_id = u.id

      WHERE u.id = ?

      GROUP BY u.id
    `).bind(
      userId
    ).first();

  return user
    ? {
        ...user,

        is_owner:
          ownerId !==
          null &&
          Number(
            user.id
          ) ===
          Number(
            ownerId
          )
      }
    : null;
}

async function adminDeleteUser(
  request,
  userId,
  env,
  cors
) {
  const owner =
    await requireOwner(
      request,
      env
    );

  const body =
    await readJson(
      request,
      32 * 1024
    );

  const confirmationCode = String(body.confirmation_code || "").trim();
  await enforceSimpleRateLimit(env,
    `owner-delete:${await sha256(`${owner.id}|${clientIp(request)}`)}`,
    10, 10 * 60 * 1000,
    "Р—Р°Р±Р°РіР°С‚Рѕ СЃРїСЂРѕР± РїС–РґС‚РІРµСЂРґР¶РµРЅРЅСЏ. РЎРїСЂРѕР±СѓР№С‚Рµ РїС–Р·РЅС–С€Рµ."
  );
  if (!safeEqualText(confirmationCode, ADMIN_DELETE_CONFIRMATION_CODE)) {
    throw new HttpError(
      403,
      "РќРµРїСЂР°РІРёР»СЊРЅРёР№ РєРѕРґ РїС–РґС‚РІРµСЂРґР¶РµРЅРЅСЏ. РђРєР°СѓРЅС‚ РЅРµ РІРёРґР°Р»РµРЅРѕ."
    );
  }

  const ownerId =
    await resolveOwnerId(
      env
    );

  if (
    ownerId !== null &&
    Number(
      userId
    ) ===
    Number(
      ownerId
    )
  ) {
    throw new HttpError(
      409,
      "\u0413\u043e\u043b\u043e\u0432\u043d\u0438\u0439 \u0430\u0434\u043c\u0456\u043d\u0456\u0441\u0442\u0440\u0430\u0442\u043e\u0440 \u043d\u0435 \u043c\u043e\u0436\u0435 \u0432\u0438\u0434\u0430\u043b\u0438\u0442\u0438 \u0432\u043b\u0430\u0441\u043d\u0438\u0439 \u0430\u043a\u0430\u0443\u043d\u0442."
    );
  }

  const target =
    await env.DB.prepare(`
      SELECT
        id,
        username,
        role,
        created_at,
        last_login_at,
        last_seen_at

      FROM users

      WHERE id = ?
    `).bind(
      userId
    ).first();

  if (!target) {
    throw new HttpError(
      404,
      "\u041a\u043e\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447\u0430 \u043d\u0435 \u0437\u043d\u0430\u0439\u0434\u0435\u043d\u043e."
    );
  }


  await ensureRecoveryRequestSchema(
    env
  );

  const now =
    new Date()
      .toISOString();

  await env.DB.batch([
    env.DB.prepare(`INSERT INTO user_audit_events (user_id,username,event_type,message,metadata,created_at)
      VALUES (?,?,'account_deleted',?,NULL,?)`).bind(Number(owner.id),String(owner.username||"").slice(0,64),
      "Р“РѕР»РѕРІРЅРёР№ Р°РґРјС–РЅС–СЃС‚СЂР°С‚РѕСЂ РІРёРґР°Р»РёРІ Р°РєР°СѓРЅС‚ РєРѕСЂРёСЃС‚СѓРІР°С‡Р° (ID: " + String(userId) + ").",new Date().toISOString()),
    env.DB.prepare(`
      DELETE FROM sessions

      WHERE user_id = ?
    `).bind(
      userId
    ),

    env.DB.prepare(`
      DELETE FROM login_events

      WHERE user_id = ?
    `).bind(
      userId
    ),

    env.DB.prepare("DELETE FROM training_upload_chunks WHERE user_id = ?").bind(userId),
    env.DB.prepare("DELETE FROM training_uploads WHERE user_id = ?").bind(userId),
    env.DB.prepare("DELETE FROM training_pdf_chunks WHERE user_id = ?").bind(userId),
    env.DB.prepare("DELETE FROM training_pdfs WHERE user_id = ?").bind(userId),
    env.DB.prepare("DELETE FROM training_plans WHERE user_id = ?").bind(userId),
    env.DB.prepare(`
      DELETE FROM user_state_snapshot_chunks

      WHERE user_id = ?
    `).bind(
      userId
    ),

    env.DB.prepare(`
      DELETE FROM user_state_snapshots

      WHERE user_id = ?
    `).bind(
      userId
    ),




    env.DB.prepare(`
      DELETE FROM password_recovery_requests

      WHERE user_id = ?
    `).bind(
      userId
    ),

    env.DB.prepare(`
      UPDATE user_audit_events
      SET username = 'Р’РёРґР°Р»РµРЅРёР№ РєРѕСЂРёСЃС‚СѓРІР°С‡',
          message = 'Р†СЃС‚РѕСЂРёС‡РЅР° РїРѕРґС–СЏ РІРёРґР°Р»РµРЅРѕРіРѕ Р°РєР°СѓРЅС‚Р°.',
          metadata = NULL
      WHERE user_id = ?
    `).bind(userId),

    env.DB.prepare(`
      DELETE FROM users

      WHERE id = ?
    `).bind(
      userId
    )
  ]);

  return reply({
    ok: true,

    deleted_user: {
      id:
        target.id,

      username:
        target.username
    }
  }, 200, cors);
}

async function adminChangeRole(
  request,
  userId,
  env,
  cors
) {
  const owner =
    await requireOwner(
      request,
      env
    );

  const body =
    await readJson(
      request
    );

  const role =
    String(
      body.role ||
      ""
    );

  if (
    ![
      "admin",
      "member"
    ].includes(
      role
    )
  ) {
    throw new HttpError(
      400,
      "\u041d\u0435\u043a\u043e\u0440\u0435\u043a\u0442\u043d\u0430 \u0440\u043e\u043b\u044c."
    );
  }

  const ownerId =
    await resolveOwnerId(
      env
    );

  if (
    ownerId !== null &&
    Number(
      userId
    ) ===
    Number(
      ownerId
    )
  ) {
    throw new HttpError(
      400,
      "\u0420\u043e\u043b\u044c \u0433\u043e\u043b\u043e\u0432\u043d\u043e\u0433\u043e \u0430\u0434\u043c\u0456\u043d\u0456\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u0430 \u0437\u043c\u0456\u043d\u0438\u0442\u0438 \u043d\u0435 \u043c\u043e\u0436\u043d\u0430."
    );
  }

  const target =
    await env.DB.prepare(`
      SELECT
        id,
        username,
        role,
        created_at,
        last_login_at,
        last_seen_at

      FROM users

      WHERE id = ?
    `).bind(
      userId
    ).first();

  if (!target) {
    throw new HttpError(
      404,
      "\u041a\u043e\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447\u0430 \u043d\u0435 \u0437\u043d\u0430\u0439\u0434\u0435\u043d\u043e."
    );
  }

  if (
    target.role ===
      role
  ) {
    return reply({
      ok: true,

      user: {
        ...target,
        is_owner:
          false
      },

      changed:
        false
    }, 200, cors);
  }

  const updated = { ...target, role };

  const message =
    role ===
      "admin"
      ? `\u0413\u043e\u043b\u043e\u0432\u043d\u0438\u0439 \u0430\u0434\u043c\u0456\u043d\u0456\u0441\u0442\u0440\u0430\u0442\u043e\u0440 \u00ab${owner.username}\u00bb \u043d\u0430\u0434\u0430\u0432 \u043f\u0440\u0430\u0432\u0430 \u0430\u0434\u043c\u0456\u043d\u0456\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u0430.`
      : `\u0413\u043e\u043b\u043e\u0432\u043d\u0438\u0439 \u0430\u0434\u043c\u0456\u043d\u0456\u0441\u0442\u0440\u0430\u0442\u043e\u0440 \u00ab${owner.username}\u00bb \u0437\u043d\u044f\u0432 \u043f\u0440\u0430\u0432\u0430 \u0430\u0434\u043c\u0456\u043d\u0456\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u0430.`;

  const metadata=JSON.stringify({changed_by_user_id:owner.id,changed_by_username:owner.username,role});
  await env.DB.batch([
    env.DB.prepare(`UPDATE users SET role = ? WHERE id = ?`).bind(role,userId),
    env.DB.prepare(`INSERT INTO user_audit_events (user_id,username,event_type,message,metadata,created_at)
      VALUES (?,?,'role_changed',?,?,?)`).bind(userId,String(updated.username||"").slice(0,64),message,metadata,new Date().toISOString())
  ]);

  return reply({
    ok: true,

    user: {
      ...updated,
      is_owner:
        false
    },

    changed:
      true
  }, 200, cors);
}

async function resolveOwnerId(
  env
) {
  const rawOwnerId =
    String(
      env.OWNER_USER_ID ||
      ""
    ).trim();

  const ownerUsername =
    String(
      env.OWNER_USERNAME ||
      ""
    ).trim();

  const hasExplicitOwner =
    !!rawOwnerId ||
    !!ownerUsername;

  const envId =
    Number(
      rawOwnerId
    );

  if (
    Number.isInteger(
      envId
    ) &&
    envId > 0
  ) {
    const exists =
      await env.DB.prepare(`
        SELECT id

        FROM users

        WHERE id = ?
      `).bind(
        envId
      ).first();

    if (exists) {
      return Number(
        exists.id
      );
    }
  }

  if (
    ownerUsername
  ) {
    const norm =
      normalizeUsername(
        ownerUsername
      ).toLocaleLowerCase(
        "uk-UA"
      );

    const byName =
      await env.DB.prepare(`
        SELECT id

        FROM users

        WHERE username_norm = ?
      `).bind(
        norm
      ).first();

    if (byName) {
      return Number(
        byName.id
      );
    }
  }

  if (
    hasExplicitOwner
  ) {
    return null;
  }

  const firstAdmin =
    await env.DB.prepare(`
      SELECT id

      FROM users

      WHERE role = 'admin'

      ORDER BY id ASC

      LIMIT 1
    `).first();

  return firstAdmin
    ? Number(
        firstAdmin.id
      )
    : null;
}

async function requireSession(
  request,
  env
) {
  const token =
    getToken(
      request
    );

  if (!token) {
    throw new HttpError(
      401,
      "\u041f\u043e\u0442\u0440\u0456\u0431\u0435\u043d \u0432\u0445\u0456\u0434."
    );
  }

  const hash =
    await sha256(
      token
    );

  const now =
    new Date()
      .toISOString();

  const session =
    await env.DB.prepare(`
      SELECT
        u.id,
        u.username,
        u.role,
        u.created_at,
        u.last_login_at,
        u.last_seen_at

      FROM sessions s

      JOIN users u
        ON u.id = s.user_id

      WHERE s.token_hash = ?
        AND s.expires_at > ?

      LIMIT 1
    `).bind(
      hash,
      now
    ).first();

  if (!session) {
    throw new HttpError(
      401,
      "\u0421\u0435\u0441\u0456\u044f \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043b\u0430\u0441\u044f."
    );
  }

  return session;
}

async function requireAdmin(
  request,
  env
) {
  const user =
    await requireSession(
      request,
      env
    );

  if (
    user.role !==
      "admin"
  ) {
    throw new HttpError(
      403,
      "\u041d\u0435\u0434\u043e\u0441\u0442\u0430\u0442\u043d\u044c\u043e \u043f\u0440\u0430\u0432."
    );
  }

  return user;
}

async function requireOwner(
  request,
  env
) {
  const user =
    await requireAdmin(
      request,
      env
    );

  const ownerId =
    await resolveOwnerId(
      env
    );

  if (
    ownerId === null ||
    Number(
      user.id
    ) !==
    Number(
      ownerId
    )
  ) {
    throw new HttpError(
      403,
      "\u0426\u044f \u0434\u0456\u044f \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0430 \u043b\u0438\u0448\u0435 \u0433\u043e\u043b\u043e\u0432\u043d\u043e\u043c\u0443 \u0430\u0434\u043c\u0456\u043d\u0456\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u0443."
    );
  }

  return user;
}

async function publicUser(
  env,
  user
) {
  const ownerId =
    await resolveOwnerId(
      env
    );

  return {
    id:
      user.id,

    username:
      user.username,

    role:
      user.role,

    is_owner:
      ownerId !==
      null &&
      Number(
        user.id
      ) ===
      Number(
        ownerId
      ),

    created_at:
      user.created_at,

    last_login_at:
      user.last_login_at,

    last_seen_at:
      user.last_seen_at ||
      null
  };
}

async function writeAuditEvent(
  env,
  user,
  eventType,
  message,
  createdAt =
    new Date()
      .toISOString(),
  metadata =
    null
) {
  // Browser reports of visits are untrusted; limit them to one per user per 30 minutes.
  // The conditional INSERT is atomic in D1; privileged/server events remain unchanged.
  const isClientVisit=String(eventType)==="visit";
  const visitCutoff=new Date(Date.now()-30*60*1000).toISOString();
  await env.DB.prepare(`
    INSERT INTO user_audit_events (user_id, username, event_type, message, metadata, created_at)
    SELECT ?, ?, ?, ?, ?, ?
    WHERE ? = 0 OR NOT EXISTS (
      SELECT 1 FROM user_audit_events
      WHERE user_id = ? AND event_type = 'visit' AND created_at > ?
    )
  `).bind(
    Number(
      user.id
    ),

    String(
      user.username ||
      "\u2014"
    ).slice(
      0,
      64
    ),

    String(
      eventType ||
      "event"
    ).slice(
      0,
      64
    ),

    String(
      message ||
      ""
    ).slice(
      0,
      MAX_AUDIT_MESSAGE
    ),

    normalizeMetadataText(
      metadata
    ),

    String(createdAt || new Date().toISOString()),
    isClientVisit?1:0,
    Number(user.id),
    visitCutoff
  ).run();
}

async function createSession(
  env,
  userId,
  rememberMe
) {
  const token =
    randomToken();

  const tokenHash =
    await sha256(
      token
    );

  const now =
    new Date();

  const expires =
    new Date(
      now.getTime() +
      (
        rememberMe
          ? REMEMBER_DAYS *
            86400000
          : SESSION_HOURS *
            3600000
      )
    );

  await env.DB.prepare(`
    INSERT INTO sessions (
      user_id,
      token_hash,
      created_at,
      expires_at,
      remember_me
    )

    VALUES (?, ?, ?, ?, ?)
  `).bind(
    userId,
    tokenHash,
    now.toISOString(),
    expires.toISOString(),
    rememberMe
      ? 1
      : 0
  ).run();

  return {
    token,

    expiresAt:
      expires.toISOString()
  };
}

function validateUsername(
  username
) {
  if (
    username.length < 3 ||
    username.length > 32
  ) {
    throw new HttpError(
      400,
      "\u041b\u043e\u0433\u0456\u043d \u043f\u043e\u0432\u0438\u043d\u0435\u043d \u043c\u0456\u0441\u0442\u0438\u0442\u0438 \u0432\u0456\u0434 3 \u0434\u043e 32 \u0441\u0438\u043c\u0432\u043e\u043b\u0456\u0432."
    );
  }

  if (
    !/^[\p{L}\p{N}._-]+$/u.test(
      username
    )
  ) {
    throw new HttpError(
      400,
      "\u041d\u0435\u0434\u043e\u043f\u0443\u0441\u0442\u0438\u043c\u0456 \u0441\u0438\u043c\u0432\u043e\u043b\u0438 \u0432 \u043b\u043e\u0433\u0456\u043d\u0456."
    );
  }
}

function validatePassword(
  password
) {
  if (
    password.length < 11
  ) {
    throw new HttpError(
      400,
      "\u041f\u0430\u0440\u043e\u043b\u044c \u043f\u043e\u0432\u0438\u043d\u0435\u043d \u043c\u0456\u0441\u0442\u0438\u0442\u0438 \u043c\u0456\u043d\u0456\u043c\u0443\u043c 11 \u0441\u0438\u043c\u0432\u043e\u043b\u0456\u0432."
    );
  }

  if (
    password.length >
    MAX_PASSWORD_LENGTH
  ) {
    throw new HttpError(
      400,
      `\u041f\u0430\u0440\u043e\u043b\u044c \u043d\u0435 \u043c\u043e\u0436\u0435 \u043c\u0456\u0441\u0442\u0438\u0442\u0438 \u0431\u0456\u043b\u044c\u0448\u0435 ${MAX_PASSWORD_LENGTH} \u0441\u0438\u043c\u0432\u043e\u043b\u0456\u0432.`
    );
  }

  if (
    !/\p{Lu}/u.test(
      password
    )
  ) {
    throw new HttpError(
      400,
      "\u0414\u043e\u0434\u0430\u0439\u0442\u0435 \u0432\u0435\u043b\u0438\u043a\u0443 \u043b\u0456\u0442\u0435\u0440\u0443."
    );
  }

  if (
    !/\p{Ll}/u.test(
      password
    )
  ) {
    throw new HttpError(
      400,
      "\u0414\u043e\u0434\u0430\u0439\u0442\u0435 \u043c\u0430\u043b\u0443 \u043b\u0456\u0442\u0435\u0440\u0443."
    );
  }

  if (
    !/\p{N}/u.test(
      password
    )
  ) {
    throw new HttpError(
      400,
      "\u0414\u043e\u0434\u0430\u0439\u0442\u0435 \u0446\u0438\u0444\u0440\u0443."
    );
  }

  if (
    !/[\p{P}\p{S}]/u.test(
      password
    )
  ) {
    throw new HttpError(
      400,
      "\u0414\u043e\u0434\u0430\u0439\u0442\u0435 \u0441\u043f\u0435\u0446\u0456\u0430\u043b\u044c\u043d\u0438\u0439 \u0441\u0438\u043c\u0432\u043e\u043b."
    );
  }
}

async function hashPassword(
  password
) {
  const saltBytes =
    crypto.getRandomValues(
      new Uint8Array(
        16
      )
    );

  const hashBytes =
    await pbkdf2(
      password,
      saltBytes,
      PASSWORD_ITERATIONS
    );

  return {
    hash:
      encode(
        hashBytes
      ),

    salt:
      encode(
        saltBytes
      )
  };
}

async function verifyPassword(
  password,
  salt,
  expected,
  iterations
) {
  const count =
    Number(
      iterations
    );

  if (
    !Number.isInteger(
      count
    ) ||
    count < 1 ||
    count >
    MAX_PBKDF2_ITERATIONS
  ) {
    return false;
  }

  const result =
    await pbkdf2(
      password,
      decode(
        salt
      ),
      count
    );

  return safeEqualBytes(
    result,
    decode(
      expected
    )
  );
}

async function pbkdf2(
  password,
  salt,
  iterations
) {
  const count =
    Number(
      iterations
    );

  if (
    !Number.isInteger(
      count
    ) ||
    count < 1 ||
    count >
    MAX_PBKDF2_ITERATIONS
  ) {
    throw new HttpError(
      400,
      "\u041d\u0435\u043a\u043e\u0440\u0435\u043a\u0442\u043d\u0430 \u043a\u0456\u043b\u044c\u043a\u0456\u0441\u0442\u044c PBKDF2-\u0456\u0442\u0435\u0440\u0430\u0446\u0456\u0439."
    );
  }

  const key =
    await crypto.subtle.importKey(
      "raw",

      new TextEncoder()
        .encode(
          password
        ),

      "PBKDF2",

      false,

      [
        "deriveBits"
      ]
    );

  const bits =
    await crypto.subtle.deriveBits(
      {
        name:
          "PBKDF2",

        hash:
          "SHA-256",

        salt,

        iterations:
          count
      },

      key,

      256
    );

  return new Uint8Array(
    bits
  );
}

async function sha256(
  value
) {
  const result =
    await crypto.subtle.digest(
      "SHA-256",

      new TextEncoder()
        .encode(
          value
        )
    );

  return encode(
    new Uint8Array(
      result
    )
  );
}





function clientIp(
  request
) {
  return String(
    request.headers.get(
      "CF-Connecting-IP"
    ) ||
    "unknown"
  ).slice(
    0,
    128
  );
}





















async function enforceSimpleRateLimit(env, rateKey, limit, windowMs, message) {
  // Cleanup also when the site has no new logins (audit/recovery requests keep arriving).
  await maybeCleanupAuthRateLimits(env);
  const now = Date.now(), nowIso = new Date(now).toISOString();
  const cutoff = new Date(now - windowMs).toISOString();
  const until = new Date(now + windowMs).toISOString();
  // This upsert is atomic in D1 SQLite, even for simultaneous requests.
  const row = await env.DB.prepare(`
    INSERT INTO auth_rate_limits (rate_key, attempts, window_start, blocked_until, updated_at)
    VALUES (?, 1, ?, NULL, ?)
    ON CONFLICT(rate_key) DO UPDATE SET
      blocked_until = CASE
        WHEN auth_rate_limits.blocked_until > excluded.updated_at THEN auth_rate_limits.blocked_until
        WHEN auth_rate_limits.window_start <= ? THEN NULL
        WHEN auth_rate_limits.attempts + 1 > ? THEN ? ELSE NULL END,
      attempts = CASE WHEN auth_rate_limits.window_start <= ? THEN 1 ELSE auth_rate_limits.attempts + 1 END,
      window_start = CASE WHEN auth_rate_limits.window_start <= ? THEN excluded.window_start ELSE auth_rate_limits.window_start END,
      updated_at = excluded.updated_at
    RETURNING attempts, blocked_until
  `).bind(rateKey,nowIso,nowIso,cutoff,limit,until,cutoff,cutoff).first();
  if (Number(row?.attempts||0) > limit || (row?.blocked_until && Date.parse(row.blocked_until) > now)) {
    throw new HttpError(429, message);
  }
}

function normalizeUsername(
  value
) {
  return String(
    value ||
    ""
  )
    .trim()
    .replace(
      /\s+/g,
      ""
    );
}

function getToken(
  request
) {
  const header =
    request.headers.get(
      "Authorization"
    ) ||
    "";

  const match =
    header.match(
      /^Bearer\s+(.+)$/i
    );

  return match
    ? match[1].trim()
    : "";
}

async function readJson(
  request,
  maxBytes =
    MAX_DEFAULT_JSON_BYTES
) {
  const contentLength =
    Number(
      request.headers.get(
        "Content-Length"
      ) ||
      0
    );

  if (
    Number.isFinite(
      contentLength
    ) &&
    contentLength >
    maxBytes
  ) {
    throw new HttpError(
      413,
      "\u0417\u0430\u043f\u0438\u0442 \u0437\u0430\u0432\u0435\u043b\u0438\u043a\u0438\u0439."
    );
  }

  let text;

  try {
    text =
      await request.text();
  } catch (_) {
    throw new HttpError(
      400,
      "\u041d\u0435\u043a\u043e\u0440\u0435\u043a\u0442\u043d\u0456 \u0434\u0430\u043d\u0456."
    );
  }

  if (
    new TextEncoder()
      .encode(
        text
      )
      .byteLength >
    maxBytes
  ) {
    throw new HttpError(
      413,
      "\u0417\u0430\u043f\u0438\u0442 \u0437\u0430\u0432\u0435\u043b\u0438\u043a\u0438\u0439."
    );
  }

  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new HttpError(400, "РћС‡С–РєСѓС”С‚СЊСЃСЏ JSON-РѕР±вЂ™С”РєС‚ С–Р· РїР°СЂР°РјРµС‚СЂР°РјРё Р·Р°РїРёС‚Сѓ.");
    }
    return parsed;
  } catch (_) {
    throw new HttpError(
      400,
      "\u041d\u0435\u043a\u043e\u0440\u0435\u043a\u0442\u043d\u0456 \u0434\u0430\u043d\u0456."
    );
  }
}

function corsHeaders(
  request,
  env
) {
  const origin =
    request.headers.get(
      "Origin"
    ) ||
    "";

  const allowed =
    String(
      env.ALLOWED_ORIGIN ||
      ""
    );

  return {
    "Access-Control-Allow-Origin":
      origin ===
      allowed
        ? origin
        : allowed,

    "Access-Control-Allow-Headers":
      "Content-Type, Authorization",

    "Access-Control-Allow-Methods":
      "GET, POST, PUT, PATCH, DELETE, OPTIONS",

    "Cache-Control":
      "no-store",

    "Vary":
      "Origin"
  };
}

function repairLegacyMessage(value) {
  if (typeof value !== "string") return value;
  const score = text => (text.match(/[\u0420\u0421][\u0080-\u04ff\u2000-\u2122]/g) || []).length;
  if (score(value) < 3) return value;
  const cp1251 = "\u0402\u0403\u201a\u0453\u201e\u2026\u2020\u2021\u20ac\u2030\u0409\u2039\u040a\u040c\u040b\u040f\u0452\u2018\u2019\u201c\u201d\u2022\u2013\u2014\u0098\u2122\u0459\u203a\u045a\u045c\u045b\u045f\u00a0\u040e\u045e\u0408\u00a4\u0490\u00a6\u00a7\u0401\u00a9\u0404\u00ab\u00ac\u00ad\u00ae\u0407\u00b0\u00b1\u0406\u0456\u0491\u00b5\u00b6\u00b7\u0451\u2116\u0454\u00bb\u0458\u0405\u0455\u0457\u0410\u0411\u0412\u0413\u0414\u0415\u0416\u0417\u0418\u0419\u041a\u041b\u041c\u041d\u041e\u041f\u0420\u0421\u0422\u0423\u0424\u0425\u0426\u0427\u0428\u0429\u042a\u042b\u042c\u042d\u042e\u042f\u0430\u0431\u0432\u0433\u0434\u0435\u0436\u0437\u0438\u0439\u043a\u043b\u043c\u043d\u043e\u043f\u0440\u0441\u0442\u0443\u0444\u0445\u0446\u0447\u0448\u0449\u044a\u044b\u044c\u044d\u044e\u044f";
  const lookup = new Map(Array.from(cp1251, (char, index) => [char, index + 128]));
  const toByte = char => char.charCodeAt(0) < 128 ? char.charCodeAt(0) : lookup.get(char);
  const decoder = new TextDecoder("utf-8", {fatal: true});
  let text = value;
  for (let pass = 0; pass < 2 && score(text) >= 3; pass++) {
    // Prefer a complete reversible conversion; this also repairs one-letter words.
    const wholeBytes = Array.from(text, toByte);
    if (wholeBytes.every(byte => byte !== undefined)) {
      try {
        const candidate = decoder.decode(Uint8Array.from(wholeBytes));
        if (score(candidate) < score(text)) { text = candidate; continue; }
      } catch (_) { /* Mixed healthy names are handled by the conservative run fallback. */ }
    }
    // Only reverse valid UTF-8 byte sequences; healthy text and unknown characters stay untouched.
    const repaired = text.replace(/[^\u0000-\u007f]+/gu, run => {
      let result = "", chunk = "", bytes = [];
      const flush = () => {
        if (!chunk) return;
        try {
          const candidate = decoder.decode(Uint8Array.from(bytes));
          result += (score(chunk) >= 2 || /[\u0420\u0421][^\u0400-\u04ff]/.test(chunk)) && score(candidate) < score(chunk) ? candidate : chunk;
        } catch (_) { result += chunk; }
        chunk = ""; bytes = [];
      };
      for (let i = 0; i < run.length;) {
        const lead = toByte(run[i]);
        const size = lead >= 0xc2 && lead <= 0xdf ? 2 : lead >= 0xe0 && lead <= 0xef ? 3 : lead >= 0xf0 && lead <= 0xf4 ? 4 : 0;
        const part = size ? Array.from(run.slice(i, i + size), toByte) : [];
        if (part.length === size && size && part.slice(1).every(byte => byte >= 0x80 && byte <= 0xbf)) {
          chunk += run.slice(i, i + size); bytes.push(...part); i += size;
        } else { flush(); result += run[i++]; }
      }
      flush(); return result;
    });
    if (repaired === text) break;
    text = repaired;
  }
  return text;
}

function reply(
  data,
  status,
  headers
) {
  return new Response(
    JSON.stringify(
      data,
      (key, value) => key === "message" || key === "error" ? repairLegacyMessage(value) : value
    ),

    {
      status,

      headers: {
        ...headers,

        "Content-Type":
          "application/json; charset=utf-8"
      }
    }
  );
}

function randomToken() {
  return encode(
    crypto.getRandomValues(
      new Uint8Array(
        32
      )
    )
  );
}

function encode(
  bytes
) {
  let binary =
    "";

  bytes.forEach(
    byte => {
      binary +=
        String.fromCharCode(
          byte
        );
    }
  );

  return btoa(
    binary
  )
    .replace(
      /\+/g,
      "-"
    )
    .replace(
      /\//g,
      "_"
    )
    .replace(
      /=+$/g,
      ""
    );
}

function decode(
  value
) {
  let text =
    String(
      value
    )
      .replace(
        /-/g,
        "+"
      )
      .replace(
        /_/g,
        "/"
      );

  while (
    text.length %
    4
  ) {
    text +=
      "=";
  }

  const binary =
    atob(
      text
    );

  return Uint8Array.from(
    binary,

    char =>
      char.charCodeAt(
        0
      )
  );
}

function safeEqualBytes(
  a,
  b
) {
  if (
    a.length !==
    b.length
  ) {
    return false;
  }

  let difference =
    0;

  for (
    let i =
      0;
    i <
      a.length;
    i++
  ) {
    difference |=
      a[i] ^
      b[i];
  }

  return difference ===
    0;
}

function safeEqualText(
  a,
  b
) {
  return safeEqualBytes(
    new TextEncoder()
      .encode(
        a
      ),

    new TextEncoder()
      .encode(
        b
      )
  );
}

// 8321 v95 — training data isolated from KBZhV snapshots, backup exports and auth core.
// This section never reads or interprets PDF content; it stores opaque base64 chunks.
const TRAINING_PDF_CHUNK = 96 * 1024;
const TRAINING_PDF_MAX = 30 * 1024 * 1024;
const TRAINING_PLAN_MAX = 1024 * 1024;
function trainingSlot(input) {
  const slot = Number(input);
  if (slot !== 1 && slot !== 2) throw new HttpError(400,'Дозволені лише PDF 1 та PDF 2.');
  return slot;
}
function trainingRevision(input) {
  const rev = Number(input);
  if (!Number.isSafeInteger(rev) || rev < 0) throw new HttpError(400,'Некоректна ревізія.');
  return rev;
}
function trainingDecodeSize(s) {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(s) || s.length % 4 !== 0) throw new HttpError(400,'Некоректний блок PDF.');
  return Math.floor(s.length / 4) * 3 - (s.endsWith('==') ? 2 : s.endsWith('=') ? 1 : 0);
}
async function trainingRows(env, id) {
  // No change to any existing KBZhV tables.
  await env.DB.batch([
    env.DB.prepare('INSERT OR IGNORE INTO training_plans(user_id,revision) VALUES (?,0)').bind(id),
    env.DB.prepare('INSERT OR IGNORE INTO training_pdfs(user_id,slot,revision) VALUES (?,1,0)').bind(id),
    env.DB.prepare('INSERT OR IGNORE INTO training_pdfs(user_id,slot,revision) VALUES (?,2,0)').bind(id)
  ]);
}
async function trainingMeta(env, id) {
  const [plan, pdf] = await Promise.all([
    env.DB.prepare('SELECT revision,content,updated_at FROM training_plans WHERE user_id=?').bind(id).first(),
    env.DB.prepare('SELECT slot,revision,name,byte_size,chunk_count,updated_at FROM training_pdfs WHERE user_id=? ORDER BY slot').bind(id).all()
  ]);
  return {ok:true,plan:{revision:Number(plan?.revision || 0),value:plan?.content ? JSON.parse(plan.content) : null,updated_at:plan?.updated_at||null},
    pdf:(pdf.results||[]).map(x=>({slot:x.slot,revision:x.revision,name:x.name||null,size:x.byte_size||0,chunks:x.chunk_count||0,updated_at:x.updated_at||null}))};
}
async function trainingRoute(request,url,env,cors) {
  const user = await requireSession(request,env);
  const id = Number(user.id);
  await trainingRows(env,id);
  const path=url.pathname;
  if (path==='/training/state' && request.method==='GET') return reply(await trainingMeta(env,id),200,cors);
  if (path==='/training/plan' && request.method==='POST') {
    const body=await readJson(request, TRAINING_PLAN_MAX + 4096);
    const base=trainingRevision(body.base_revision);
    let content=null;
    if(body.plan!==null && body.plan!==undefined){
      if(!body.plan || Array.isArray(body.plan) || typeof body.plan!=='object' || body.plan.format!=='kbjv-training-plan' || body.plan.version!==1 || !Array.isArray(body.plan.days))
        throw new HttpError(400,'Некоректний формат плану.');
      content=JSON.stringify(body.plan);
      if(new TextEncoder().encode(content).length>TRAINING_PLAN_MAX) throw new HttpError(413,'План перевищує 1 МБ.');
    }
    const result=await env.DB.prepare('UPDATE training_plans SET content=?,revision=revision+1,updated_at=? WHERE user_id=? AND revision=?')
      .bind(content,new Date().toISOString(),id,base).run();
    if(!result.meta?.changes) throw new HttpError(409,'План змінений на іншому пристрої. Локальні зміни не видалено.');
    return reply({ok:true,revision:base+1},200,cors);
  }
  if(path==='/training/pdf/start' && request.method==='POST') {
    const b=await readJson(request,4096),slot=trainingSlot(b.slot),base=trainingRevision(b.base_revision);
    const name=String(b.name||'').slice(0,180);
    const bytes=Number(b.size),chunks=Number(b.chunks);
    if(!name.toLowerCase().endsWith('.pdf') || !Number.isSafeInteger(bytes) || bytes<1 || bytes>TRAINING_PDF_MAX ||
       !Number.isInteger(chunks) || chunks!==Math.ceil(bytes/TRAINING_PDF_CHUNK)) throw new HttpError(400,'Некоректні параметри PDF.');
    const existing=await env.DB.prepare('SELECT revision FROM training_pdfs WHERE user_id=? AND slot=?').bind(id,slot).first();
    if(Number(existing?.revision)!==base) throw new HttpError(409,'PDF змінено на іншому пристрої.');
    // Purge abandoned staging uploads older than 24 hours. Only staging data is removed;
    // currently published PDF documents are never touched by this cleanup.
    const cutoff=new Date(Date.now()-24*3600*1000).toISOString();
    await env.DB.batch([
      env.DB.prepare('DELETE FROM training_upload_chunks WHERE user_id=? AND upload_id IN (SELECT upload_id FROM training_uploads WHERE user_id=? AND created_at<?)').bind(id,id,cutoff),
      env.DB.prepare('DELETE FROM training_uploads WHERE user_id=? AND created_at<?').bind(id,cutoff)
    ]);
    const uploadId=crypto.randomUUID();
    await env.DB.prepare('INSERT INTO training_uploads(user_id,upload_id,slot,name,byte_size,chunk_count,base_revision,created_at) VALUES(?,?,?,?,?,?,?,?)')
      .bind(id,uploadId,slot,name,bytes,chunks,base,new Date().toISOString()).run();
    return reply({ok:true,upload_id:uploadId,chunk_size:TRAINING_PDF_CHUNK},200,cors);
  }
  if(path==='/training/pdf/chunk' && request.method==='POST') {
    const b=await readJson(request,140*1024);
    const uploadId=String(b.upload_id||'');
    const upload=await env.DB.prepare('SELECT * FROM training_uploads WHERE user_id=? AND upload_id=?').bind(id,uploadId).first();
    if(!upload) throw new HttpError(404,'Сесію завантаження PDF не знайдено.');
    const index=Number(b.index),payload=String(b.data||'');
    if(!Number.isInteger(index)||index<0||index>=upload.chunk_count) throw new HttpError(400,'Некоректний номер блоку.');
    const length=trainingDecodeSize(payload);
    const expected=index===upload.chunk_count-1 ? upload.byte_size-index*TRAINING_PDF_CHUNK : TRAINING_PDF_CHUNK;
    if(length!==expected) throw new HttpError(400,'Розмір блоку PDF неправильний.');
    await env.DB.prepare('INSERT OR REPLACE INTO training_upload_chunks(user_id,upload_id,chunk_index,payload) VALUES(?,?,?,?)').bind(id,uploadId,index,payload).run();
    return reply({ok:true},200,cors);
  }
  if(path==='/training/pdf/commit' && request.method==='POST') {
    const b=await readJson(request,2048),uploadId=String(b.upload_id||'');
    const up=await env.DB.prepare('SELECT * FROM training_uploads WHERE user_id=? AND upload_id=?').bind(id,uploadId).first();
    if(!up) throw new HttpError(404,'Сесію завантаження PDF не знайдено.');
    const check=await env.DB.prepare('SELECT COUNT(*) AS cnt FROM training_upload_chunks WHERE user_id=? AND upload_id=?').bind(id,uploadId).first();
    if(check?.cnt!==up.chunk_count) throw new HttpError(400,'PDF передано не повністю. Старий документ не змінено.');
    const old=await env.DB.prepare('SELECT revision,file_key FROM training_pdfs WHERE user_id=? AND slot=?').bind(id,up.slot).first();
    if(Number(old?.revision)!==up.base_revision) throw new HttpError(409,'PDF змінено на іншому пристрої. Старий документ збережено.');
    // Copy chunks before switching visible metadata. Readers can only access current file_key.
    // A failed commit leaves the previous metadata and bytes intact.
    const commands=[env.DB.prepare('INSERT OR REPLACE INTO training_pdf_chunks(user_id,slot,file_key,chunk_index,payload) SELECT user_id,?,upload_id,chunk_index,payload FROM training_upload_chunks WHERE user_id=? AND upload_id=?').bind(up.slot,id,uploadId),
      env.DB.prepare('UPDATE training_pdfs SET revision=revision+1,name=?,byte_size=?,chunk_count=?,file_key=?,updated_at=? WHERE user_id=? AND slot=? AND revision=?')
       .bind(up.name,up.byte_size,up.chunk_count,uploadId,new Date().toISOString(),id,up.slot,up.base_revision)];
    if(old.file_key) commands.push(env.DB.prepare('DELETE FROM training_pdf_chunks WHERE user_id=? AND slot=? AND file_key=?').bind(id,up.slot,old.file_key));
    commands.push(env.DB.prepare('DELETE FROM training_upload_chunks WHERE user_id=? AND upload_id=?').bind(id,uploadId));
    commands.push(env.DB.prepare('DELETE FROM training_uploads WHERE user_id=? AND upload_id=?').bind(id,uploadId));
    const results=await env.DB.batch(commands);
    if(!results[1]?.meta?.changes) throw new HttpError(409,'Конфлікт PDF. Перевірте стан синхронізації.');
    return reply({ok:true,revision:up.base_revision+1},200,cors);
  }
  const pdfMatch=path.match(/^\/training\/pdf\/(1|2)$/);
  if(pdfMatch && request.method==='DELETE') {
    const slot=trainingSlot(pdfMatch[1]);
    const b=await readJson(request,1024),base=trainingRevision(b.base_revision);
    const old=await env.DB.prepare('SELECT revision,file_key FROM training_pdfs WHERE user_id=? AND slot=?').bind(id,slot).first();
    if(Number(old?.revision)!==base) throw new HttpError(409,'PDF змінено на іншому пристрої.');
    const result=await env.DB.prepare('UPDATE training_pdfs SET revision=revision+1,name=NULL,byte_size=NULL,chunk_count=NULL,file_key=NULL,updated_at=? WHERE user_id=? AND slot=? AND revision=?')
      .bind(new Date().toISOString(),id,slot,base).run();
    if(!result.meta?.changes) throw new HttpError(409,'PDF змінено на іншому пристрої.');
    if(old.file_key) await env.DB.prepare('DELETE FROM training_pdf_chunks WHERE user_id=? AND slot=? AND file_key=?').bind(id,slot,old.file_key).run();
    return reply({ok:true,revision:base+1},200,cors);
  }
  const chunkMatch=path.match(/^\/training\/pdf\/(1|2)\/chunk\/(\d+)$/);
  if(chunkMatch && request.method==='GET') {
    const slot=trainingSlot(chunkMatch[1]),index=Number(chunkMatch[2]);
    const row=await env.DB.prepare('SELECT file_key,chunk_count FROM training_pdfs WHERE user_id=? AND slot=?').bind(id,slot).first();
    if(!row?.file_key || !Number.isInteger(index) || index<0 || index>=row.chunk_count) throw new HttpError(404,'PDF не знайдено.');
    const chunk=await env.DB.prepare('SELECT payload FROM training_pdf_chunks WHERE user_id=? AND slot=? AND file_key=? AND chunk_index=?').bind(id,slot,row.file_key,index).first();
    if(!chunk) throw new HttpError(404,'Частина PDF не знайдена.');
    return reply({ok:true,data:chunk.payload},200,cors);
  }
  throw new HttpError(404,'Маршрут тренувань не знайдено.');
}
