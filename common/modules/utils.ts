export type Emit<E extends string, D> = (event: E, data: D | undefined) => void;

type EmitEventToOnEvent<T extends Emit<any, any>, U = unknown, V = unknown> =
  T extends (event: infer E, data: infer D) => infer R
    ? U extends T
      ? V
      : EmitEventToOnEvent<
          U & T,
          U & ((event: E, data: D) => R),
          V & ((event: E, callback: (data: { detail: D }) => unknown, options?: {}) => R)
        >
    : never

type EmitEventToOff<T extends Emit<any, any>, U = unknown, V = unknown> =
T extends (event: infer E, data: infer D) => infer R
  ? U extends T
    ? V
    : EmitEventToOff<
        U & T,
        U & ((event: E, data: D) => R),
        V & ((event: E, callback: (data: { detail: D }) => unknown) => R)
      >
  : never

export type CustomEventTarget<T extends Emit<string, any>> = {
  emit: T
  dispatch: T
  on: EmitEventToOnEvent<T>
  once: EmitEventToOnEvent<T>

  off: EmitEventToOff<T>
  removeListener: EmitEventToOff<T>
}
