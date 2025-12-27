import { JSONSchema } from "../types/llm";

/**
 * Very small runtime JSON Schema validator for our limited schema shape.
 * Supports: object type with properties, required arrays, and simple primitive checks.
 */
export function validateJsonSchema(data: unknown, schema: JSONSchema): boolean {
  if (schema.type !== "object" || typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;

  if (schema.required) {
    for (const r of schema.required) {
      if (!(r in obj)) return false;
    }
  }

  if (schema.properties && typeof schema.properties === "object") {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      const value = obj[key];
      if (value === undefined) continue; // handled by required above

      if (propSchema == null) continue;
      const expectedType = (propSchema as any).type;
      if (!expectedType) continue;

      switch (expectedType) {
        case "string":
          if (typeof value !== "string") return false;
          break;
        case "number":
          if (typeof value !== "number") return false;
          break;
        case "boolean":
          if (typeof value !== "boolean") return false;
          break;
        case "array":
          if (!Array.isArray(value)) return false;
          // optional: check item types when simple type is provided
          const items = (propSchema as any).items;
          if (items && (items as any).type && Array.isArray(value)) {
            const itemType = (items as any).type;
            for (const item of value as unknown[]) {
              if (itemType === "string" && typeof item !== "string") return false;
              if (itemType === "number" && typeof item !== "number") return false;
              if (itemType === "object" && (typeof item !== "object" || item === null)) return false;
            }
          }
          break;
        case "object":
          if (typeof value !== "object" || value === null) return false;
          break;
        default:
          // unknown expected type - be permissive
          break;
      }
    }
  }

  return true;
}
