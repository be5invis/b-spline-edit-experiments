import { addTerm, term, termIndex } from "./array-util";
import { BezierActionSink, BezierKnot } from "./bezier-action";

export interface XY<T> {
	x: T;
	y: T;
}

export interface BKnot extends XY<number> {
	knotInterval: number;
}

function mix(a: number, b: number, r: number) {
	return a + (b - a) * r;
}
function mixz(a: XY<number>, b: XY<number>, r: number) {
	return { x: mix(a.x, b.x, r), y: mix(a.y, b.y, r) };
}
function Z<T, K extends XY<T>>(a: K): XY<T> {
	return { x: a.x, y: a.y };
}
function setPos<T, K extends XY<T>>(z: K, a: XY<T>) {
	z.x = a.x;
	z.y = a.y;
}

export function evaluateBezierGadgetAtKnot<K extends BKnot>(knots: ReadonlyArray<K>, j: number) {
	let preOffKnot: null | BezierKnot<XY<number>> = null;
	let onKnot: BezierKnot<XY<number>>;
	let postOffKnot: null | BezierKnot<XY<number>> = null;

	const dm2 = term(knots, j, -2).knotInterval;
	const dm1 = term(knots, j, -1).knotInterval;
	const dp1 = term(knots, j, 0).knotInterval;
	const dp2 = term(knots, j, 1).knotInterval;

	const z = term(knots, j, 0);
	const zm1 = term(knots, j, -1);
	const zp1 = term(knots, j, +1);

	// Off point BEFORE
	const dd = mixz(z, zm1, dp1 / (dm2 + dm1 + dp1));
	// Off point AFTER
	const cc = mixz(z, zp1, dm1 / (dm1 + dp1 + dp2));

	if (dm1) preOffKnot = { kind: "D", point: dd };

	if (dm1 + dp1) onKnot = { kind: "Z", point: mixz(dd, cc, dm1 / (dm1 + dp1)) };
	else onKnot = { kind: "Z", point: z }; // This is a corner

	if (dp1) postOffKnot = { kind: "C", point: cc };

	return { preOffKnot, onKnot, postOffKnot };
}

export function evaluateBezierArc<K extends BKnot>(knots: ReadonlyArray<K>, j: number) {
	let jNext = (j + 1) % knots.length;
	const gBefore = evaluateBezierGadgetAtKnot(knots, j);
	const gAfter = evaluateBezierGadgetAtKnot(knots, jNext);

	let cKnot = gBefore.postOffKnot && gAfter.preOffKnot ? gBefore.postOffKnot : null;
	let dKnot = gBefore.postOffKnot && gAfter.preOffKnot ? gAfter.preOffKnot : null;

	return {
		a: gBefore.onKnot,
		b: cKnot,
		c: dKnot,
		d: gAfter.onKnot
	};
}

export function evaluateBezier<K extends BKnot>(
	knots: ReadonlyArray<K>,
	sink: BezierActionSink<XY<number>>
) {
	if (!knots.length) return;
	const output: BezierKnot<XY<number>>[] = [];
	for (let j = 0; j < knots.length; j++) {
		const { preOffKnot, onKnot, postOffKnot } = evaluateBezierGadgetAtKnot(knots, j);
		if (preOffKnot) output.push(preOffKnot);
		output.push(onKnot);
		if (postOffKnot) output.push(postOffKnot);
	}
	return getBezier2(output, sink);
}

function safeDiv3(a: number, b: number, c: number, t: number, ft: number) {
	if (a + b + c <= 0) return ft;
	return (a + t * b) / (a + b + c);
}
function co(x: number) {
	return 1 - x;
}
export function evaluateCoefficientsT<K extends BKnot>(
	knots: ReadonlyArray<K>,
	j: number,
	t: number
) {
	let coeff: number[] = new Array(knots.length).fill(0);

	const d0 = term(knots, j, -2).knotInterval;
	const d1 = term(knots, j, -1).knotInterval;
	const d2 = term(knots, j, +0).knotInterval;
	const d3 = term(knots, j, +1).knotInterval;
	const d4 = term(knots, j, +2).knotInterval;

	const z = termIndex(knots, j, 0);
	const zm1 = termIndex(knots, j, -1);
	const zp1 = termIndex(knots, j, +1);
	const zp2 = termIndex(knots, j, +2);

	//           t
	//       dM     dP
	//    cM1   cZ    cP1
	// zm1    z    zp1    zp2
	const cM1 = safeDiv3(d0 + d1, d2, 0, t, 1);
	const cZ = safeDiv3(d1, d2, d3, t, t);
	const cP1 = safeDiv3(0, d2, d3 + d4, t, 0);
	const dM = safeDiv3(d1, d2, 0, t, 1);
	const dP = safeDiv3(0, d2, d3, t, 0);

	coeff[zm1] = co(t) * co(dM) * co(cM1);
	coeff[z] = co(t) * (co(dM) * cM1 + dM * co(cZ)) + t * co(dP) * co(cZ);
	coeff[zp1] = co(t) * dM * cZ + t * (co(dP) * cZ + dP * co(cP1));
	coeff[zp2] = t * dP * cP1;

	return coeff;
}
export function evaluateDerivativeCoefficientsT<K extends BKnot>(
	knots: ReadonlyArray<K>,
	j: number,
	t: number
) {
	let coeff: number[] = new Array(knots.length).fill(0);

	const d0 = term(knots, j, -2).knotInterval;
	const d1 = term(knots, j, -1).knotInterval;
	const d2 = term(knots, j, +0).knotInterval;
	const d3 = term(knots, j, +1).knotInterval;
	const d4 = term(knots, j, +2).knotInterval;

	const z = termIndex(knots, j, 0);
	const zm1 = termIndex(knots, j, -1);
	const zp1 = termIndex(knots, j, +1);
	const zp2 = termIndex(knots, j, +2);

	//           t
	//       dM     dP
	//    cM1   cZ    cP1
	// zm1    z    zp1    zp2
	const cM1 = safeDiv3(d0 + d1, d2, 0, t, 1);
	const cZ = safeDiv3(d1, d2, d3, t, t);
	const cP1 = safeDiv3(0, d2, d3 + d4, t, 0);
	const dM = safeDiv3(d1, d2, 0, t, 1);
	const dP = safeDiv3(0, d2, d3, t, 0);

	coeff[zm1] = -1 * co(dM) * co(cM1);
	coeff[z] = -1 * (co(dM) * cM1 + dM * co(cZ)) + 1 * co(dP) * co(cZ);
	coeff[zp1] = -1 * dM * cZ + 1 * (co(dP) * cZ + dP * co(cP1));
	coeff[zp2] = 1 * dP * cP1;

	return coeff;
}
export function evaluatePointT<K extends BKnot>(knots: ReadonlyArray<K>, j: number, t: number) {
	const d0 = term(knots, j, -2).knotInterval;
	const d1 = term(knots, j, -1).knotInterval;
	const d2 = term(knots, j, +0).knotInterval;
	const d3 = term(knots, j, +1).knotInterval;
	const d4 = term(knots, j, +2).knotInterval;

	const zz = term(knots, j, 0);
	const zm1 = term(knots, j, -1);
	const zp1 = term(knots, j, +1);
	const zp2 = term(knots, j, +2);

	//           t
	//       dM     dP
	//    cM1   cZ    cP1
	// zm1    z    zp1    zp2
	const zcM1 = mixz(zm1, zz, safeDiv3(d0 + d1, d2, 0, t, 1));
	const zcZ = mixz(zz, zp1, safeDiv3(d1, d2, d3, t, t));
	const zcP1 = mixz(zp1, zp2, safeDiv3(0, d2, d3 + d4, t, 0));
	const zdM = mixz(zcM1, zcZ, safeDiv3(d1, d2, 0, t, 1));
	const zdP = mixz(zcZ, zcP1, safeDiv3(0, d2, d3, t, 0));
	return mixz(zdM, zdP, t);
}
export interface BKnotSource<K extends BKnot> {
	create(z: XY<number>, ki: number): K;
}
export function insertKnotT<K extends BKnot>(
	knots: Array<K>,
	source: BKnotSource<K>,
	j: number,
	t: number,
	mul: number
) {
	const d0 = term(knots, j, -2).knotInterval;
	const d1 = term(knots, j, -1).knotInterval;
	const d2 = term(knots, j, +0).knotInterval;
	const d3 = term(knots, j, +1).knotInterval;
	const d4 = term(knots, j, +2).knotInterval;

	const z: XY<number> = Z(term(knots, j, 0));
	const zm1: XY<number> = Z(term(knots, j, -1));
	const zp1: XY<number> = Z(term(knots, j, +1));
	const zp2: XY<number> = Z(term(knots, j, +2));

	//           t
	//       dM     dP
	//    cM1   cZ    cP1
	// zm1    z    zp1    zp2
	const cM1 = safeDiv3(d0 + d1, d2, 0, t, 1);
	const cZ = safeDiv3(d1, d2, d3, t, t);
	const cP1 = safeDiv3(0, d2, d3 + d4, t, 0);

	term(knots, j, 0).knotInterval = mul * d2 * (1 - t);
	const newD2 = mul * d2 * t;
	setPos(term(knots, j, 0), mixz(z, zp1, cZ));
	setPos(term(knots, j, 1), mixz(zp1, zp2, cP1));
	addTerm(knots, j, 0, source.create(mixz(zm1, z, cM1), newD2));
}

function getBezier2(
	points: ReadonlyArray<BezierKnot<XY<number>>>,
	sink: BezierActionSink<XY<number>>
) {
	let onKnotJ = 0;
	for (let j = 0; j < points.length; j++) {
		if (points[j].kind === "Z") {
			onKnotJ = j;
			break;
		}
	}
	points = [...points.slice(onKnotJ), ...points.slice(0, onKnotJ)];

	sink.moveTo(points[0].point);
	for (let j = 1; j < points.length; ) {
		if (
			term(points, j, 0).kind === "C" &&
			term(points, j, 1).kind === "D" &&
			term(points, j, 2).kind === "Z"
		) {
			sink.curveTo(
				term(points, j, 0).point,
				term(points, j, 1).point,
				term(points, j, 2).point
			);
			j += 3;
		} else if (term(points, j, 0).kind === "Q" && term(points, j, 1).kind === "Z") {
			sink.quadTo(term(points, j, 0).point, term(points, j, 1).point);
			j += 2;
		} else {
			sink.lineTo(term(points, j, 0).point);
			j += 1;
		}
	}
}
