export function term<T>(arr: ReadonlyArray<T>, j: number, s: number) {
	let x = j + s;
	while (x < 0) x += arr.length;
	return arr[x % arr.length];
}
export function termIndex<T>(arr: ReadonlyArray<T>, j: number, s: number) {
	let x = j + s;
	while (x < 0) x += arr.length;
	return x % arr.length;
}
export function setTerm<T>(arr: Array<T>, j: number, s: number, v: T) {
	let x = j + s;
	while (x < 0) x += arr.length;
	return (arr[x % arr.length] = v);
}
export function addTerm<T>(arr: Array<T>, j: number, s: number, v: T) {
	let x = j + s;
	while (x < 0) x += arr.length;
	return arr.splice(x % arr.length, 0, v);
}
