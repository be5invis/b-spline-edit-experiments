export interface BezierKnot<T> {
	kind: "Z" | "C" | "D" | "Q";
	point: T;
}

export interface BezierActionSink<T> {
	moveTo(x: T): void;
	lineTo(x: T): void;
	quadTo(a: T, b: T): void;
	curveTo(a: T, b: T, c: T): void;
}
