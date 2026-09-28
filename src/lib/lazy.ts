/**
 * An object created the first time one of its properties is used. Module
 * imports stay side-effect free, so builds don't need runtime secrets.
 */
export function lazy<T extends object>(create: () => T): T {
  let instance: T | undefined;
  return new Proxy({} as T, {
    get(_, prop) {
      instance ??= create();
      const value = Reflect.get(instance, prop, instance);
      return typeof value === "function" ? value.bind(instance) : value;
    },
  });
}
