import { computed, observable } from "mobx";

import { term } from "./array-util";
import { evaluateBezier, evaluateCoefficientsT, insertKnotT, XY } from "./b3";
import { BezierActionSink } from "./bezier-action";

export class BSplinePoint {
	@observable.ref
	x: number = 0;
	@observable.ref
	y: number = 0;
	@observable.ref
	knotInterval: number = 1;
	@observable.ref
	showHalfControl: boolean = false;

	kd(n: number) {
		const z = new BSplinePoint();
		z.x = this.x;
		z.y = this.y;
		z.knotInterval = n;
		return z;
	}
	static at(x: number, y: number) {
		const z = new BSplinePoint();
		z.x = x;
		z.y = y;
		return z;
	}
}

export interface BSplineSelection {
	readonly type: "Arc" | "OnKnot" | "ControlKnot" | "Contour";
	readonly contourID: number;
	readonly knotID: number;
}

export enum OnKnotType {
	Corner,
	CornerTangentBefore,
	CornerTangentAfter,
	TangentStart,
	TangentEnd,
	Smooth
}
export class BSplineModel {
	@observable.ref
	degree: number = 3;
	@observable
	points: BSplinePoint[][] = [];
	@observable.ref
	selection: null | BSplineSelection = null;

	eval(contour: number, sink: BezierActionSink<XY<number>>) {
		evaluateBezier(this.points[contour], sink);
	}

	@computed
	get coeffMatrix() {
		let ms: number[][][] = [];
		for (let c = 0; c < this.points.length; c++) {
			let m: number[][] = [];
			for (let j = 0; j < this.points[c].length; j++) {
				const a = evaluateCoefficientsT(this.points[c], j, 0);
				m[j] = a;
			}
			ms[c] = m;
		}
		return ms;
	}

	identifyOnKnotType(c: number, index: number, bias: number = 0) {
		const kiBefore2 = term(this.points[c], index, bias - 2).knotInterval;
		const kiBefore = term(this.points[c], index, bias - 1).knotInterval;
		const kiAfter = term(this.points[c], index, bias).knotInterval;
		const kiAfter2 = term(this.points[c], index, bias + 1).knotInterval;

		// Knot types
		//         *---0---#---0---* Corner
		//         *---1---#---0---*---0---* CornerTangentBefore
		// *---0---*---0---#---1---* CornerTangentAfter
		//         *---1---#---0---* TangentEnd
		//         *---0---#---1---* TangentStart
		//         *---1---#---1---* Smooth

		if (kiBefore <= 0) {
			if (kiAfter <= 0) return OnKnotType.Corner;
			else if (kiBefore2 <= 0) return OnKnotType.CornerTangentAfter;
			else return OnKnotType.TangentEnd;
		} else {
			if (kiAfter <= 0) {
				if (kiAfter2 <= 0) return OnKnotType.CornerTangentBefore;
				else return OnKnotType.TangentStart;
			} else return OnKnotType.Smooth;
		}
	}

	insertKnot(c: number, index: number, t: number) {
		insertKnotT(
			this.points[c],
			{
				create: (x, ki) => {
					const p = new BSplinePoint();
					p.x = x.x;
					p.y = x.y;
					p.knotInterval = ki;
					return p;
				}
			},
			index,
			t,
			1
		);
	}
}
