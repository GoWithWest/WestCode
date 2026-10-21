// ACP form elicitations (elicitation/create): Claude's AskUserQuestion and
// MCP servers asking the user something. Mapped to plain fields for the
// question card, and the card's answers back to the form's content.

/** requestedSchema → [{key, title, description, kind, options, type, required}] */
export function formFields(schema) {
  const props = schema && typeof schema === "object" ? schema.properties || {} : {};
  const required = new Set(Array.isArray(schema?.required) ? schema.required : []);
  return Object.entries(props).map(([key, p]) => {
    const prop = p && typeof p === "object" ? p : {};
    const base = {
      key,
      title: typeof prop.title === "string" ? prop.title : "",
      description: typeof prop.description === "string" ? prop.description : "",
      required: required.has(key),
      type: prop.type || "string",
    };
    const opts = (list) =>
      (Array.isArray(list) ? list : []).map((o) =>
        o && typeof o === "object"
          ? { value: String(o.const ?? o.title ?? ""), label: String(o.title ?? o.const ?? ""), description: o.description ? String(o.description) : "" }
          : { value: String(o), label: String(o), description: "" },
      );
    if (prop.type === "array") {
      const items = prop.items || {};
      return { ...base, kind: "multi", options: opts(items.anyOf || items.oneOf || items.enum) };
    }
    if (Array.isArray(prop.oneOf) || Array.isArray(prop.anyOf) || Array.isArray(prop.enum)) {
      return { ...base, kind: "choice", options: opts(prop.oneOf || prop.anyOf || prop.enum) };
    }
    if (prop.type === "boolean") return { ...base, kind: "choice", options: [{ value: "true", label: "Yes", description: "" }, { value: "false", label: "No", description: "" }] };
    return { ...base, kind: "text" };
  });
}

/** Card answers ({key: string | string[]}) → the form's typed content; empty answers left out. */
export function formContent(fields, answers) {
  const out = {};
  for (const f of fields) {
    const v = answers?.[f.key];
    if (v == null || v === "" || (Array.isArray(v) && !v.length)) continue;
    if (f.kind === "multi") out[f.key] = (Array.isArray(v) ? v : [v]).map(String);
    else if (f.type === "boolean") out[f.key] = String(v) === "true";
    else if (f.type === "number" || f.type === "integer") {
      const n = Number(v);
      if (Number.isFinite(n)) out[f.key] = f.type === "integer" ? Math.trunc(n) : n;
    } else out[f.key] = String(Array.isArray(v) ? v[0] : v);
  }
  return out;
}
