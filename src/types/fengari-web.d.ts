
declare module 'fengari-web' {
  export const L: any;
  export const lua: any;
  export const lauxlib: any;
  export const lualib: any;
  export function to_js(L: any, index: number): any;
}
