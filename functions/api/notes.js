function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function validDate(value) {
  return typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value));
}

function validTaskName(value) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 100;
}

export async function onRequest({ request, env }) {
  if (!env.DB) return json({ error: "D1 binding DB is not configured" }, 503);

  const url = new URL(request.url);
  const origin = request.headers.get("Origin");
  if (origin && origin !== url.origin) {
    return json({ error: "Cross-origin request rejected" }, 403);
  }

  if (request.method === "GET") {
    try {
      const { results } = await env.DB
        .prepare("SELECT note_date, task_name, content, updated_at FROM kanshi_notes ORDER BY note_date, task_name")
        .all();
      return json(results);
    } catch (error) {
      return json({ error: "Could not load notes. Check that the D1 table exists." }, 500);
    }
  }

  if (request.method === "POST") {
    const contentType = request.headers.get("Content-Type") || "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return json({ error: "Content-Type must be application/json" }, 415);
    }

    let body;
    try {
      const raw = await request.text();
      if (raw.length > 2000) return json({ error: "Request body too large" }, 413);
      body = JSON.parse(raw);
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    const date = body?.date;
    const taskName = body?.taskName;
    const content = body?.content;
    if (!validDate(date) || !validTaskName(taskName) ||
        typeof content !== "string" || content.trim().length === 0 || content.length > 500) {
      return json({ error: "Invalid date, task name, or note content" }, 400);
    }

    try {
      await env.DB.prepare(
        "INSERT INTO kanshi_notes (note_date, task_name, content, updated_at) VALUES (?, ?, ?, datetime('now')) ON CONFLICT(note_date, task_name) DO UPDATE SET content = excluded.content, updated_at = datetime('now')"
      ).bind(date, taskName.trim(), content.trim()).run();
      return json({ ok: true });
    } catch (error) {
      return json({ error: "Could not save note. Check the D1 table." }, 500);
    }
  }

  if (request.method === "DELETE") {
    const date = url.searchParams.get("date");
    const taskName = url.searchParams.get("taskName");
    if (!validDate(date) || !validTaskName(taskName)) {
      return json({ error: "Invalid date or task name" }, 400);
    }
    try {
      await env.DB.prepare("DELETE FROM kanshi_notes WHERE note_date = ? AND task_name = ?")
        .bind(date, taskName.trim()).run();
      return json({ ok: true });
    } catch (error) {
      return json({ error: "Could not delete note. Check the D1 table." }, 500);
    }
  }

  return new Response("Method Not Allowed", {
    status: 405,
    headers: { Allow: "GET, POST, DELETE" }
  });
}
