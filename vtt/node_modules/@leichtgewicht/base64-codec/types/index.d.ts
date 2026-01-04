type WithBytes<T> = T & {
  bytes: number
};
export interface Codec<Name extends string = string> {
  name: Name;
  encodingLength(input: string | Uint8Array): number;
  encode: WithBytes<<T extends Uint8Array = Uint8Array> (str: string, arr?: T, start?: number) => T>;
  decode: WithBytes<(buf: Uint8Array, start?: number, end?: number) => string>;
}
export const PREFERS_PADDING = 1;
export const PREFERS_NO_PADDING = 2;
export type PaddingMode = typeof PREFERS_PADDING | typeof PREFERS_NO_PADDING;
export function make <Name extends string = string>(name: Name, charset: string, padding: string, paddingMode: PaddingMode): Codec<Name>;
export const base64: Codec<'base64'>;
export const base64URL: Codec<'base64URL'>;
export {};
