export let a = 5;
export let b = 6;
export { a as x };

export function switchValues() {
  [a, b] = [b, a];
}
