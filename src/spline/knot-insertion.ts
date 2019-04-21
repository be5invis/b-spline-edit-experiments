import { BKnot, evaluatePointT } from "./b3";

export class DistanceEstimator {
	constructor(
		public readonly j: number,
		public readonly tMin: number,
		public readonly tMax: number,
		x: number,
		y: number,
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		tolerance: number
	) {
		let A = x - x1;
		let B = y - y1;
		let C = x2 - x1;
		let D = y2 - y1;

		let dot = A * C + B * D;
		let len_sq = C * C + D * D;
		let param = -1;
		if (len_sq > tolerance) {
			//in case of 0 length line
			param = dot / len_sq;
		}

		let xx, yy;

		if (param < 0) {
			xx = x1;
			yy = y1;
		} else if (param > 1) {
			xx = x2;
			yy = y2;
		} else {
			xx = x1 + param * C;
			yy = y1 + param * D;
		}

		let dx = x - xx;
		let dy = y - yy;

		this.param = param;

		this.dist = dx * dx + dy * dy;
	}

	param: number;
	dist: number;
}

export function findClosestJAndT<K extends BKnot>(
	knots: ReadonlyArray<K>,
	dicing: number,
	accept: number,
	x: number,
	y: number
) {
	let des: DistanceEstimator[] = [];
	for (let j = 0; j < knots.length; j++) {
		let zPrev = evaluatePointT(knots, j, 0);
		for (let d = 0; d < dicing; d++) {
			const zNext = evaluatePointT(knots, j, (d + 1) / dicing);
			des.push(
				new DistanceEstimator(
					j,
					d / dicing,
					(d + 1) / dicing,
					x,
					y,
					zPrev.x,
					zPrev.y,
					zNext.x,
					zNext.y,
					1e-4
				)
			);
			zPrev = zNext;
		}
	}
	let found = false,
		bestDist = accept * accept,
		bestJ = 0,
		bestT = 0;
	for (const de of des) {
		if (de.param >= 0 && de.param <= 1 && de.dist < accept * accept) {
			if (!found || de.dist < bestDist) {
				found = true;
				bestDist = de.dist;
				bestJ = de.j;
				bestT = de.tMin + (de.tMax - de.tMin) * de.param;
			}
		}
	}
	if (found) return { bestJ, bestT };
	else return null;
}
