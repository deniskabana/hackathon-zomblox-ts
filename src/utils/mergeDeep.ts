function isObject(item: unknown): boolean {
  return (!!item && typeof item === 'object' && !Array.isArray(item));
}

type IndexableObject = { [key: string]: IndexableObject | unknown };

/**
 * Deep merge two objects recursively.
 * WARN: Will cause infinite recursion in circular references!
 */
export function mergeDeep<T extends IndexableObject>(target: T, ...sources: IndexableObject[]): T & IndexableObject {
  if (!sources.length) return target;
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
