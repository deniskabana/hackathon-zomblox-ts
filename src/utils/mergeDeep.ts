function isObject(item: unknown): boolean {
  return !!item && typeof item === "object" && !Array.isArray(item);
}

type IndexableObject = { [key: string]: IndexableObject | unknown };

/**
 * Deep merge two objects recursively.
 * TODO: Remove typecasts if TS perf isn't hurt too bad. Otherwise delete this comment.
 * WARN: Will cause infinite recursion in circular references!
 */
export function mergeDeep<T extends IndexableObject, S extends undefined | IndexableObject>(target: T, ...sources: S[]): T & S {
  if (!sources.length) return target as T & S;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        mergeDeep(target[key] as IndexableObject, source[key] as IndexableObject);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return mergeDeep(target, ...sources);
}
